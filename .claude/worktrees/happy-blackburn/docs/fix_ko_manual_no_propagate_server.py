# Fix: Bei manueller KO-Auslosung Sieger NICHT in naechste Runde schreiben
# Auf Server ausfuehren: cd /root/ibu_sw && python3 (dann Skript pipen)
path = "/root/ibu_sw/backend/app/services/ko_propagation.py"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

old = """    draw_mode = tournament.ko_distribution if tournament else None

    # Get winner - handle byes FIRST before checking scores"""

new = """    draw_mode = tournament.ko_distribution if tournament else None

    # Don't propagate in manual draw mode – user enters next round pairings manually
    if tournament and tournament.ko_draw_method is not None:
        draw_method_val = getattr(tournament.ko_draw_method, 'value', None) or tournament.ko_draw_method
        if draw_method_val == 'manual':
            return

    # Get winner - handle byes FIRST before checking scores"""

if new in s:
    print("Block already present")
elif old in s:
    s = s.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("Patch applied:", path)
else:
    print("Target block not found - check file manually")
