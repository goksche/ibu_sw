# Fix: spielfeld_assignment_mode aus duplicate_tournament entfernen (Backward-Kompat)
# Auf Server: Get-Content docs/fix_duplicate_tournament_server.py -Raw | ssh root@95.111.238.180 "cd /root/ibu_sw && python3"
path = "/root/ibu_sw/backend/app/api/v1/tournaments.py"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

old = """        'location_id': original.location_id,
        'spielfeld_assignment_mode': getattr(original, 'spielfeld_assignment_mode', 'random'),
    }
    
    new_tournament = Tournament(**new_tournament_data)"""

new = """        'location_id': original.location_id,
    }
    if hasattr(Tournament, 'spielfeld_assignment_mode'):
        new_tournament_data['spielfeld_assignment_mode'] = getattr(original, 'spielfeld_assignment_mode', 'random')
    
    new_tournament = Tournament(**new_tournament_data)"""

if new in s:
    print("Bereits gefixt")
elif old in s:
    s = s.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("Fix angewendet:", path)
else:
    print("Block nicht gefunden - manuell pruefen")
    import re
    m = re.search(r"'location_id':.*?\n.*?new_tournament = Tournament", s, re.DOTALL)
    if m:
        print("Gefunden bei:", repr(m.group(0)[:200]))
