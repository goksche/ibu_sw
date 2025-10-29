# Projektstruktur Check v1.2.0-alpha.1

## Aktuelle Struktur

```
ibu_sw/
├── app/                          # ✅ v1.1.0 Desktop Core (BEHALTEN)
│   ├── core/                     # Exception, Logging, Resource Manager
│   └── validators/               # Validation Framework
├── database/                     # ✅ v1.1.0 Desktop Database (BEHALTEN)
│   └── models.py
├── views/                        # ✅ v1.1.0 Desktop Views (BEHALTEN)
├── utils/                        # ✅ v1.1.0 Desktop Utils (BEHALTEN)
├── backend/                      # ✅ NEU: FastAPI Web Backend
│   └── app/
│       ├── api/v1/
│       ├── core/
│       ├── models/
│       ├── schemas/
│       └── services/
└── frontend/                     # ✅ NEU: React Web Frontend
    └── src/
        ├── components/
        ├── pages/
        ├── services/
        ├── store/
        └── types/
```

## Status

✅ **STRUKTUR IST KORREKT**

- Desktop v1.1.0 bleibt unverändert (`app/`, `database/`, `views/`, `utils/`)
- Web v1.2.0 in separaten Verzeichnissen (`backend/`, `frontend/`)
- Keine Konflikte zwischen Desktop `app/` und Web `backend/app/`

## Nächste Schritte

1. Docker Setup (docker-compose.yml, Dockerfiles)
2. Environment Configuration (.env.example)
3. Backend Dependencies (requirements.txt)
4. Frontend Setup (package.json)

