# Release v1.8.2 — Sicherheit & Betrieb (Server B)

| Todo | Inhalt | Status |
|------|--------|--------|
| security-operations | Rollen Feedback (Admin+Power Admin), Kommentar-Rechte, Rate-Limits 429, Env-Drift-Skript | Repo + Deploy B |

**Abnahme auf B:**

```bash
cd /opt/ibu_sw
CHECK_ENV_DRIFT=1 ./scripts/run_qa_gate_server_b.sh
```

API-Version: `https://test.finalstage.ch/api/v1/info/version` → **1.8.2**
