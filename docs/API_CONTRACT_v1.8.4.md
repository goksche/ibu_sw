# API-Contract v1.8.4 — KO-Auslosungsarten

Erweiterung von [v1.8.3](API_CONTRACT_v1.8.3.md): **Matrix-Gültigkeit** und **Automatische Gates** für alle `ko_draw_method`-Werte.

## Automatische Prüfung

```bash
python3 scripts/verify_api_contract.py
python3 scripts/verify_draw_methods_matrix.py
./scripts/run_draw_methods_matrix_gate_server_b.sh
```

## Matrix (L / K / C)

| `ko_draw_method` | Nur Kombi **C** | **K** und **C** |
|------------------|-----------------|-----------------|
| `fixed_cross`, `same_position_cross`, `bonus_draw_for_winners` | ✅ | ❌ |
| `overall_seeding`, `pot_system`, `full_random`, `random_each_round`, `predefined_bracket`, `manual` | ❌ | ✅ |

Reiner **K**-Modus ohne Gruppenphase: Kreuzpaarungen → HTTP 400 (Backend) bzw. nicht in `pure_ko_supported_methods`.

## Frontend

- Wizard `CreateTournament`: Paarungsart P1–P7 **und** Dropdown „Auslosungsmethode“ (alle matrix-konformen Werte).
- `frontend/src/domain/tournamentModeMatrix.ts`: `getAllowedKoDrawMethodValues`, `DRAW_METHOD_TO_PAIRING`.

## Manuelle Abnahme

Checkliste: [DRAW_METHODS_TEST_MATRIX_SERVER_B.md](DRAW_METHODS_TEST_MATRIX_SERVER_B.md) Stufe A + B.
