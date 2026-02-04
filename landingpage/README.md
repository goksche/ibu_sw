# Landing Page finalstage.ch

Statischer Onepager für Zugangs-Anfragen. Lokal testen, danach auf Server B unter `/` ausliefern; App unter `/app` (Login unter `/app/login`).

## Lokal testen

1. **App (Frontend + Backend)** starten:
   ```bash
   docker compose up
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

2. **Landing Page** in einem zweiten Terminal starten:
   ```bash
   npx serve landingpage -p 8080
   ```
   oder:
   ```bash
   python -m http.server 8080 --directory landingpage
   ```
   - Landing: http://localhost:8080

3. Prüfen:
   - http://localhost:8080 → Landing Page
   - „Zum Login“ klicken → http://localhost:3000/login
   - Formular „Zugang anfragen“ ausfüllen und absenden → Backend speichert die Anfrage (in-memory)

## API

- `POST /api/v1/access-requests` – Zugangs-Anfrage (Name, E-Mail, Sportart Pflicht; optional Organisation, Source). Honeypot-Feld `website`: wenn ausgefüllt, wird nicht gespeichert (Spam-Schutz).
