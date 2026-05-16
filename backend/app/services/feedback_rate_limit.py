"""In-Memory Rate-Limits für Feedback-Erstellung (pro Nutzer-ID)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, status

from app.core.config import settings

_lock = threading.Lock()
_timestamps: Dict[int, Deque[float]] = defaultdict(deque)


def assert_feedback_create_allowed(user_id: int) -> None:
    window = max(int(settings.FEEDBACK_RATE_WINDOW_SEC), 60)
    max_per_window = max(int(settings.FEEDBACK_RATE_MAX_PER_WINDOW), 1)
    min_interval = max(int(settings.FEEDBACK_RATE_MIN_INTERVAL_SEC), 0)
    now = time.monotonic()
    cutoff = now - window

    with _lock:
        bucket = _timestamps[user_id]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= max_per_window:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Zu viele Feedback-Einträge. Bitte in {window // 60 or 1} Min. "
                    "später erneut versuchen."
                ),
            )

        if bucket and min_interval > 0 and (now - bucket[-1]) < min_interval:
            wait_sec = int(min_interval - (now - bucket[-1])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Bitte {wait_sec} Sek. warten, bevor Sie erneut Feedback senden.",
            )

        bucket.append(now)
