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
                content = payload.get("content")
                if content:
                    # 4. Persistence
                    # Convert channel_id to UUID for DB
                    channel_uuid = uuid.UUID(channel_id)
                    
                    message_data = MessageCreate(content=content, channel_id=channel_uuid)
                    new_message = await create_message(db, message=message_data, user_id=user.id)

                    # 5. Broadcast
                    # We send back the full message object so clients can render it
                    response = {
                        "id": new_message.id,
                        "content": new_message.content,
                        "created_at": new_message.created_at,
                        "channel_id": new_message.channel_id,
                        "user_id": new_message.user_id,
                        "user": {
                            "username": user.username,
                            "email": user.email
                        }
                    }
                    await manager.broadcast(response, channel_id)
            except json.JSONDecodeError:
                pass 
            except Exception as e:
                print(f"Error processing message: {e}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel_id)
