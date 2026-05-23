from typing import Dict, List
from fastapi import WebSocket
from app.utils.logger import log_info, log_error


class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        # Active connections: {user_id: [websocket, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a WebSocket connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        log_info(f"WebSocket connected: {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        log_info(f"WebSocket disconnected: {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to a specific user."""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    log_error(f"Failed to send message to {user_id}", e)
    
    async def broadcast(self, message: dict, exclude_user: str = None):
        """Broadcast message to all connected users."""
        for user_id, connections in self.active_connections.items():
            if user_id != exclude_user:
                for connection in connections:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        log_error(f"Failed to broadcast to {user_id}", e)
    
    def get_connected_users(self) -> List[str]:
        """Get list of connected user IDs."""
        return list(self.active_connections.keys())


# Global connection manager instance
manager = ConnectionManager()
