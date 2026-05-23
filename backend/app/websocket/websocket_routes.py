from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.websocket.manager import manager
from app.core.security import decode_token
from app.utils.logger import log_info, log_error

router = APIRouter()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = Query(None)):
    """WebSocket endpoint for real-time communication."""
    try:
        # Validate token
        if token:
            payload = decode_token(token)
            if payload.get("sub") != user_id:
                await websocket.close(code=4001)
                return
        
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                data = await websocket.receive_json()
                
                # Handle different message types
                message_type = data.get("type")
                
                if message_type == "ping":
                    await manager.send_personal_message({"type": "pong"}, user_id)
                
                elif message_type == "broadcast":
                    await manager.broadcast(
                        {"type": "message", "from": user_id, "content": data.get("content")},
                        exclude_user=user_id
                    )
                
                elif message_type == "direct":
                    target_user = data.get("to")
                    if target_user:
                        await manager.send_personal_message(
                            {"type": "message", "from": user_id, "content": data.get("content")},
                            target_user
                        )
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, user_id)
            
    except Exception as e:
        log_error(f"WebSocket error for user {user_id}", e)
        manager.disconnect(websocket, user_id)


@router.get("/ws/users")
async def get_connected_users():
    """Get list of connected users."""
    return {"users": manager.get_connected_users()}
