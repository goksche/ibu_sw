#!/usr/bin/env python3
"""Fuegt Live-Ticker-Button in TournamentDetail ein falls noch nicht vorhanden."""
path = "/root/ibu_sw/frontend/src/pages/TournamentDetail.tsx"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

if "Live Ticker" in s and "Television" in s:
    print("Button bereits vorhanden")
    exit(0)

# Suche Stelle vor dem Zurueck-Button (navigate('/dashboard'))
marker = "onClick={() => navigate('/dashboard')}"
if marker in s:
    insert = """          <Button
            variant="secondary"
            onClick={() => window.open(`/tournaments/${tournamentId}/ticker`, '_blank', 'noopener,noreferrer')}
          >
            <Television size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Live Ticker
          </Button>
          """
    # Fuege vor dem Button mit navigate('/dashboard') ein
    idx = s.find(marker)
    # Gehe zurueck zum Beginn dieses Button-Elements
    btn_start = s.rfind("<Button", 0, idx)
    s = s[:btn_start] + insert + s[btn_start:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("Live-Ticker-Button eingefuegt")
else:
    print("Marker nicht gefunden - manuell pruefen")
