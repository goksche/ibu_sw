#!/usr/bin/env python3
import os
import sys

BASE = "/root/ibu_sw"
path = os.path.join(BASE, "backend", "app", "api", "v1", "tournaments.py")
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

if "matches_to_assign" in s and "spielfeld_counts" in s:
    print("round robin already fairness-patched")
    sys.exit(0)

# insert matches_to_assign initialization
s = s.replace(
    "    # Generate matches for each group\n    total_matches = 0\n    for group in groups:\n",
    "    # Generate matches for each group\n    total_matches = 0\n    matches_to_assign: List[Tuple[int, int, int, GroupMatch]] = []\n    for group in groups:\n",
    1
)

# replace per-match assignment block
old = """                spielfeld_id = None
                if spielfeld_ids:
                    if assignment_mode == "random":
                        spielfeld_id = random.choice(spielfeld_ids)
                    elif assignment_mode in ("group_fixed", "group_random"):
                        spielfeld_id = getattr(group, "spielfeld_id", None) or None
                match = GroupMatch(
                    tournament_id=tournament_id,
                    group_id=group.id,
                    round=round_idx,
                    match_no=match_no,
                    player1_id=player1_id,
                    player2_id=player2_id,
                    spielfeld_id=spielfeld_id
                )
                db.add(match)
                total_matches += 1
                match_no += 1
"""
new = """                match = GroupMatch(
                    tournament_id=tournament_id,
                    group_id=group.id,
                    round=round_idx,
                    match_no=match_no,
                    player1_id=player1_id,
                    player2_id=player2_id
                )
                if spielfeld_ids and assignment_mode in ("group_fixed", "group_random"):
                    match.spielfeld_id = getattr(group, "spielfeld_id", None) or None
                matches_to_assign.append((round_idx, group.id, match_no, match))
                db.add(match)
                total_matches += 1
                match_no += 1
"""
if old in s:
    s = s.replace(old, new, 1)
else:
    print("match assignment block not found")
    sys.exit(1)

# insert fairness assignment before db.commit()
insert_before = "    db.commit()\n"
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
if fairness not in s:
    s = s.replace(insert_before, fairness + insert_before, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(s)
print("round robin fairness patched")
