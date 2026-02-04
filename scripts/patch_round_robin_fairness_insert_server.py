#!/usr/bin/env python3
from pathlib import Path

path = Path("/root/ibu_sw/backend/app/api/v1/tournaments.py")
text = path.read_text(encoding="utf-8")

needle = """    db.commit()
    
    return {
        "message": "Round Robin matches generated successfully",
        "groups_processed": len(groups),
        "matches_created": total_matches
    }
"""

fairness = """    if spielfeld_ids and assignment_mode == "random":
        spielfeld_counts = {sid: 0 for sid in spielfeld_ids}
        for _, group_id, match_no, match in sorted(
            matches_to_assign,
            key=lambda item: (item[0], item[1], item[2])
        ):
            if match.player1_id is None or match.player2_id is None:
                continue
            min_count = min(spielfeld_counts.values())
            candidates = [sid for sid, count in spielfeld_counts.items() if count == min_count]
            chosen = random.choice(candidates)
            match.spielfeld_id = chosen
            spielfeld_counts[chosen] += 1

"""

if fairness in text:
    print("fairness block already present")
else:
    if needle not in text:
        raise SystemExit("needle not found for insert")
    text = text.replace(needle, fairness + needle, 1)
    path.write_text(text, encoding="utf-8")
    print("fairness block inserted")
