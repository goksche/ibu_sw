from __future__ import annotations

from datetime import datetime
from pathlib import Path


TARGET = Path("/root/ibu_sw/backend/app/api/v1/tournaments.py")


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    backup = TARGET.with_suffix(TARGET.suffix + f".bak_sigcompat_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    backup.write_text(text, encoding="utf-8")

    patterns = [
        "points_for_win=getattr(tournament, 'league_points_win', 3) or 3,",
        "points_for_draw=getattr(tournament, 'league_points_draw', 1) or 1,",
        "points_for_loss=getattr(tournament, 'league_points_loss', 0) or 0,",
    ]

    lines = text.splitlines()
    filtered: list[str] = []
    removed = 0
    for line in lines:
        if any(p in line for p in patterns):
            removed += 1
            continue
        filtered.append(line)

    TARGET.write_text("\n".join(filtered) + "\n", encoding="utf-8")
    print(f"Patched: {TARGET}")
    print(f"Backup:  {backup}")
    print(f"Removed incompatible args lines: {removed}")


if __name__ == "__main__":
    main()
