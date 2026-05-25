# Fix: Gleichstandsregeln in konfigurierter Reihenfolge anwenden (diff, goals_for)
# Auf Server: cd /root/ibu_sw && python3 (dann Skript pipen)
path = "/root/ibu_sw/backend/app/services/decision_matches.py"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

old = """                if rule == 'wins':
                    wins_map = {pid: (stats[pid].get('wins', 0),) for pid in g}
                    next_groups.extend(_split_group_by_key(g, wins_map))
                elif rule == 'direct_encounter':
                    next_groups.extend(_direct_encounter_groups(g, matches, scoring_system))
                else:
                    next_groups.append(g)"""

new = """                if rule == 'wins':
                    wins_map = {pid: (stats[pid].get('wins', 0),) for pid in g}
                    next_groups.extend(_split_group_by_key(g, wins_map))
                elif rule == 'diff':
                    diff_map = {pid: (stats[pid].get('diff', 0),) for pid in g}
                    next_groups.extend(_split_group_by_key(g, diff_map))
                elif rule == 'goals_for':
                    gf_map = {pid: (stats[pid].get('goals_for', 0),) for pid in g}
                    next_groups.extend(_split_group_by_key(g, gf_map))
                elif rule == 'direct_encounter':
                    next_groups.extend(_direct_encounter_groups(g, matches, scoring_system))
                else:
                    next_groups.append(g)"""

if new in s:
    print("Patch already applied")
elif old in s:
    s = s.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("Patch applied:", path)
else:
    print("Target block not found")
