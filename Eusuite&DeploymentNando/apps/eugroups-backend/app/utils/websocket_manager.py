"""
WebSocket Connection Manager for EUGroups Real-time Chat
"""
from typing import Dict, List, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""
    
    def __init__(self):
        # channel_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # WebSocket -> user info
        self.connection_users: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, channel_id: int, user: dict):
        """Accept a new WebSocket connection for a channel"""
        await websocket.accept()
        
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = set()
        
        self.active_connections[channel_id].add(websocket)
        self.connection_users[websocket] = {
            "user_id": user["user_id"],
            "username": user.get("username"),
            "email": user.get("email"),
            "channel_id": channel_id
        }
        
        logger.info(f"User {user.get('username')} connected to channel {channel_id}")
        
        # Notify others that user joined
        await self.broadcast_to_channel(channel_id, {
            "type": "user_joined",
            "user_id": user["user_id"],
            "username": user.get("username")
        }, exclude=websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        user_info = self.connection_users.get(websocket)
        
        if user_info:
            channel_id = user_info["channel_id"]
            if channel_id in self.active_connections:
                self.active_connections[channel_id].discard(websocket)
                if not self.active_connections[channel_id]:
                    del self.active_connections[channel_id]
            
            logger.info(f"User {user_info.get('username')} disconnected from channel {channel_id}")
        
        self.connection_users.pop(websocket, None)
    
    async def broadcast_to_channel(self, channel_id: int, message: dict, exclude: WebSocket = None):
        """Broadcast a message to all connections in a channel"""
        if channel_id not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[channel_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    def get_channel_users(self, channel_id: int) -> List[dict]:
        """Get list of users currently in a channel"""
        users = []
        if channel_id in self.active_connections:
            for conn in self.active_connections[channel_id]:
                user_info = self.connection_users.get(conn)
                if user_info:
                    users.append({
                        "user_id": user_info["user_id"],
                        "username": user_info.get("username")
                    })
        return users


# Global connection manager instance
manager = ConnectionManager()
