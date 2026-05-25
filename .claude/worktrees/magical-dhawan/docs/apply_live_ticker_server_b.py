#!/usr/bin/env python3
"""Live-Ticker auf Server B aktivieren. Auf Server ausfuehren: python3 apply_live_ticker_server_b.py"""
import os

BASE = "/root/ibu_sw/frontend/src"

# 1. App.tsx - LiveTicker import und Route
app_path = os.path.join(BASE, "App.tsx")
with open(app_path, "r", encoding="utf-8") as f:
    app = f.read()

if "LiveTicker" not in app:
    app = app.replace("import Locations from './pages/Locations';", "import Locations from './pages/Locations';\nimport LiveTicker from './pages/LiveTicker';")
    # Route vor /tournaments/:id
    old_route = '''        <Route 
          path="/tournaments/:id" 
          element={
            isAuthenticated ? (
              <TournamentDetail />'''
    new_route = '''        <Route
          path="/tournaments/:id/ticker"
          element={
            isAuthenticated ? (
              <LiveTicker />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/tournaments/:id" 
          element={
            isAuthenticated ? (
              <TournamentDetail />'''
    if new_route not in app:
        app = app.replace(old_route, new_route)
    with open(app_path, "w", encoding="utf-8") as f:
        f.write(app)
    print("App.tsx: LiveTicker-Route hinzugefuegt")
else:
    print("App.tsx: bereits vorhanden")

# 2. TournamentDetail.tsx - Button und Import
td_path = os.path.join(BASE, "pages", "TournamentDetail.tsx")
with open(td_path, "r", encoding="utf-8") as f:
    td = f.read()

if "Live Ticker" not in td or "Television" not in td:
    td = td.replace("import { PencilSimple, Copy, Star, Trash, ArrowLeft } from 'phosphor-react'",
                    "import { PencilSimple, Copy, Star, Trash, ArrowLeft, Television } from 'phosphor-react'")
    old = "          <Button \n            variant=\"secondary\"\n            onClick={() => navigate('/dashboard')}\n          >\n            <ArrowLeft size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />\n            Zurück\n          </Button>"
    new_btn = "          <Button\n            variant=\"secondary\"\n            onClick={() => window.open(`/tournaments/${tournamentId}/ticker`, '_blank', 'noopener,noreferrer')}\n          >\n            <Television size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />\n            Live Ticker\n          </Button>\n          <Button \n            variant=\"secondary\"\n            onClick={() => navigate('/dashboard')}\n          >\n            <ArrowLeft size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />\n            Zurück\n          </Button>"
    if "Live Ticker" not in td and old in td:
        td = td.replace(old, new_btn)
    with open(td_path, "w", encoding="utf-8") as f:
        f.write(td)
    print("TournamentDetail.tsx: Live-Ticker-Button hinzugefuegt")
else:
    print("TournamentDetail.tsx: bereits vorhanden")

# 3. LiveTicker.tsx - Fixes
lt_path = os.path.join(BASE, "pages", "LiveTicker.tsx")
with open(lt_path, "r", encoding="utf-8") as f:
    lt = f.read()

changes = []
if "getAll()" in lt and "getTournamentParticipants" not in lt:
    lt = lt.replace("participantService.getAll()", "participantService.getTournamentParticipants(tournamentId)")
    changes.append("getTournamentParticipants")
if "???" in lt:
    lt = lt.replace("Spielplan ???", "Spielplan –").replace("??? ??????", "(Entscheidungsspiel)").replace("Gruppen-Ranking ???", "Gruppen-Ranking –")
    lt = lt.replace("Zus??tzliche", "Zusaetzliche").replace("L??dt", "Laedt").replace("verf??gbar", "verfuegbar")
    lt = lt.replace("???</span>", "✓</span>")
    changes.append("encoding")
if changes:
    with open(lt_path, "w", encoding="utf-8") as f:
        f.write(lt)
    print("LiveTicker.tsx: " + ", ".join(changes))
else:
    print("LiveTicker.tsx: keine Aenderungen noetig")

print("Fertig. Frontend neu bauen: cd /root/ibu_sw && docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d frontend")
