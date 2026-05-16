# API / Frontend Contract — v1.8.3

## Single Source of Truth

| Schicht | Datei |
|---------|--------|
| Backend-Enums | `backend/app/models/tournament.py` |
| Backend-Validierung | `backend/app/schemas/tournament.py`, `app/core/mode_matrix.py` |
| Frontend-Spiegel | `frontend/src/domain/tournamentApiContract.ts` |
| Schreib-Payloads | `frontend/src/utils/tournamentPayload.ts` |

## Automatische Prüfung

```bash
python3 scripts/verify_api_contract.py
# auf Server B im Gate:
./scripts/run_modes_matrix_gate_server_b.sh
```

## Legacy KO-Felder

| Feld | Status |
|------|--------|
| `ko_draw_method` | **führend** für Auslosungsart |
| `ko_pairing_mode` | P1–P7; Backend mappt auf `ko_draw_method` |
| `ko_distribution` | Deprecated; Spiegel nur für `random_each_round`, `manual`, Kreuz — sonst weglassen |
| `ko_participants`, `ko_first_round_size` | Legacy; combined/Quali |

## Liga-Wertung

- API `league_scoring_system`: nur **`points`** | **`difference`**
- UI-Option „Siege“: wird in `sanitizeTournamentWritePayload` zu `points` + `tie_breaking_rules: ['wins', …]` gemappt

## Manuelle Modi-Matrix

Nach Deploy: [`MODES_TEST_MATRIX_SERVER_B.md`](MODES_TEST_MATRIX_SERVER_B.md) Stufe A (L/K/C).
