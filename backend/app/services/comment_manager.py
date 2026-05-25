"""In-memory WebSocket connection manager for comment events."""
from typing import Dict, List, Set, Any
from fastapi import WebSocket
from datetime import datetime, date
import json


class _Encoder(json.JSONEncoder):
    def default(self, o: Any) -> Any:
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if hasattr(o, "model_dump"):
            return o.model_dump()
        if hasattr(o, "dict"):
            return o.dict()
        return super().default(o)


class CommentConnectionManager:
    """Manages WebSocket connections grouped by tournament_id."""

    def __init__(self):
        self._connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, tournament_id: int, websocket: WebSocket):
        await websocket.accept()
        if tournament_id not in self._connections:
            self._connections[tournament_id] = set()
        self._connections[tournament_id].add(websocket)

    def disconnect(self, tournament_id: int, websocket: WebSocket):
        if tournament_id in self._connections:
            self._connections[tournament_id].discard(websocket)
            if not self._connections[tournament_id]:
                del self._connections[tournament_id]

    async def broadcast(self, tournament_id: int, event: str, data: dict):
        """Send an event to all connections for a tournament."""
        if tournament_id not in self._connections:
            return
        message = json.dumps({"event": event, "data": data}, cls=_Encoder)
        dead: List[WebSocket] = []
        for ws in self._connections[tournament_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections[tournament_id].discard(ws)


manager = CommentConnectionManager()
