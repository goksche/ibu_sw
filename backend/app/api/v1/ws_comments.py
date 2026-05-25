"""WebSocket endpoint for real-time comment updates."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import decode_access_token
from app.core.database import SessionLocal
from app.models.user import User
from app.services.visibility import get_accessible_tournament
from app.services.comment_manager import manager

router = APIRouter()


@router.websocket("/ws/tournaments/{tournament_id}/comments")
async def comment_websocket(
    websocket: WebSocket,
    tournament_id: int,
    token: str = Query(...),
):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("user_id")
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=4003, reason="User not found")
            return

        try:
            get_accessible_tournament(db, tournament_id, user)
        except Exception:
            await websocket.close(code=4004, reason="No access")
            return
    finally:
        db.close()

    await manager.connect(tournament_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(tournament_id, websocket)
