from typing import List, Dict
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # Map channel_id to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel_id: str):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)

    def disconnect(self, websocket: WebSocket, channel_id: str):
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]

    async def broadcast(self, message: dict, channel_id: str):
        if channel_id in self.active_connections:
            # Iterate over a copy to avoid modification during iteration issues, 
            # though disconnect handles removal safely.
            # Using simple text send for now (JSON stringified)
            message_str = json.dumps(message, default=str)
            for connection in self.active_connections[channel_id]:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    # Handle broken pipe or closed connection gracefully if needed
                    # ideally disconnect() is called on close
                    pass
    
    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            message_str = json.dumps(message, default=str)
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    pass

manager = ConnectionManager()
