from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import json

from database import get_db
from ws_manager import manager
from security import verify_access_token
from crud import get_user_by_username, create_message
from schemas import MessageCreate

# Note: WebSocket endpoints cannot easily use standard Depends(get_current_user) 
# because headers are not available in the same way during the initial handshake 
# or subsequent frames in standard HTTP dependency style for some auth schemes.
# Common pattern: Pass token as query param or validate in connect.

router = APIRouter(tags=["websockets"])

@router.websocket("/ws/{channel_id}/{token}")
async def websocket_endpoint(
    websocket: WebSocket, 
    channel_id: str, 
    token: str,
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate Token
    username = verify_access_token(token)
    if not username:
        await websocket.close(code=4003) # Forbidden
        return

    # 2. Get User
    # We need a new DB session for this scope or use the Depends one? 
    # Depends works for WebSocket in FastAPI.
    user = await get_user_by_username(db, username=username)
    if not user:
        await websocket.close(code=4003)
        return

    # 3. Connect
    # Convert string channel_id to UUID if needed, but our Manager uses Dict[str, ...]
    # so keeping it as string is fine for the key.
    await manager.connect(websocket, channel_id)

    try:
        while True:
            data = await websocket.receive_text()
            # Expecting JSON data from client: { "content": "hello" }
            try:
            
                payload = json.loads(data)
                
                # Check for typing indicator
                if payload.get("type") == "typing":
                    print(f"DEBUG: Received typing event from {user.username} in {channel_id}")
                    await manager.broadcast({
                        "type": "typing",
                        "user_id": str(user.id),
                        "username": user.username,
                        "parent_id": payload.get("parent_id")
                    }, channel_id)
                # WebRTC Signaling & Voice Presence
                if payload.get("type") in ["call_offer", "call_answer", "ice_candidate", "call_end", "voice_join", "voice_presence", "voice_leave"]:
                    print(f"DEBUG: Signaling event {payload.get('type')} from {user.username}")
                    # Broadcast the signal to the channel (DM)
                    # The frontend must filter out its own messages or we can filter here if we had target_user_id
                    await manager.broadcast({
                        "type": payload.get("type"),
                        "payload": payload.get("payload"),
                        "target_user_id": payload.get("target_user_id"),
                        "sender_id": str(user.id),
                        "sender_username": user.username
                    }, channel_id)
                    continue

                content = payload.get("content")
                parent_id = payload.get("parent_id")
                if content:
                    # 4. Persistence
                    # Convert channel_id to UUID for DB
                    channel_uuid = uuid.UUID(channel_id)
                    
                    message_data = MessageCreate(content=content, channel_id=channel_uuid, parent_id=parent_id)
                    new_message, new_notifications = await create_message(db, message=message_data, user_id=user.id)

                    # 5. Broadcast Message
                    response = {
                        "id": new_message.id,
                        "content": new_message.content,
                        "created_at": new_message.created_at,
                        "channel_id": new_message.channel_id,
                        "user_id": new_message.user_id,
                        "parent_id": new_message.parent_id,
                        "user": {
                            "username": user.username,
                            "email": user.email
                        }
                    }
                    await manager.broadcast(response, channel_id)

                    # 6. Push Notifications
                    for notif in new_notifications:
                        # Construct notification payload
                        # We match the Frontend Notification interface
                        notif_payload = {
                            "type": "notification",
                            "data": {
                                "id": notif.id,
                                "user_id": notif.user_id,
                                "content": notif.content,
                                "type": notif.type,
                                "is_read": notif.is_read,
                                "created_at": notif.created_at,
                                "related_id": notif.related_id
                            }
                        }
                        await manager.send_personal_message(notif_payload, str(notif.user_id))

            except json.JSONDecodeError:
                pass 
            except Exception as e:
                print(f"Error processing message: {e}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)


@router.websocket("/ws/notifications/{token}")
async def notification_endpoint(
    websocket: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    # Validate User
    username = verify_access_token(token)
    if not username:
        await websocket.close(code=4003)
        return

    user = await get_user_by_username(db, username=username)
    if not user:
        await websocket.close(code=4003)
        return

    # Connect User
    user_id_str = str(user.id)
    await manager.connect_user(websocket, user_id_str)

    try:
        while True:
            # Just keep connection open. 
            # Could implement ping/pong or receive explicit "mark read" commands here too.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id_str)
