# Login-System: Analyse und Abgleich Referenz- vs. Main-Server

**Stand:** Nach tiefer Analyse und Anpassungen auf dem Main-Server (144.91.103.103 / finalstage.ch).

---

## 1. Referenz-Server (95.111.238.180 / test.finalstage.ch)

- **Frontend:** OTP-only Login; zeigt `dev_otp_code` bei DEV, sonst „OTP wurde per E-Mail versendet“.
- **Backend send_otp:**  
  E-Mail-Versand → bei Erfolg: `{"message":"OTP-Code wurde per E-Mail versendet."}`.  
  Bei Fehlschlag: **503** mit „OTP konnte nicht versendet werden. SMTP ist nicht konfiguriert.“ (kein Code in der Response).
- **OTP/SMTP:** SMTP konfiguriert (smtp.swizzonic.email), `OTP_DEV_MODE=false`. Login funktioniert, weil E-Mails versendet werden.
- **API-URL:** `VITE_API_URL=https://test.finalstage.ch` in .env → Frontend ruft gleiche Domain auf.
- **Nginx:** `location /api` → `proxy_pass http://backend`.

---

## 2. Main-Server (144.91.103.103 / finalstage.ch) – vorher/nachher

### Vorher (Probleme)

- **.env:** `VITE_API_URL=https://gsmartsol.ch` → bei Nutzung durch Frontend würden API-Calls auf eine andere Domain gehen.
- **docker-compose:** Frontend hat **fest** `VITE_API_URL: /` → .env wurde für den laufenden Container nicht genutzt; API-Calls gingen korrekt an gleiche Origin.
- **Backend config.py:** Kein `OTP_DISPLAY_INSTEAD_OF_EMAIL` → bei Sync mit Repo-Auth würde die Variable fehlen.
- **Backend auth.py:** Vereinfachte send_otp-Logik: E-Mail → OTP_DEV_MODE → Fallback `display_otp_code`. Kein 503 bei SMTP-Fehler (gut).

### Durchgeführte Anpassungen (direkt auf dem Server)

1. **config.py:** `OTP_DISPLAY_INSTEAD_OF_EMAIL: bool = True` ergänzt (nach `OTP_DEV_MODE`).
2. **.env:** `VITE_API_URL=/` gesetzt (für zukünftige Builds/konsistente Umgebung).
3. **Backend:** Neu gestartet, damit die neue Config geladen wird.

### Verifiziert

- **send_otp:** Mit gültiger E-Mail (z. B. goksche23@gmail.com) → `{"message":"OTP-Code wurde per E-Mail versendet."}` (SMTP funktioniert).
- **Users:** Mehrere aktive User mit E-Mail in der DB (goksche, marco.zemp, …).
- **Health:** Backend `/health` → `{"status":"healthy","service":"backend","version":"1.4.1"}`.
- **Frontend Login.tsx:** Nutzt `response.display_otp_code ?? response.dev_otp_code` und zeigt den Code an, wenn das Backend ihn liefert.

---

## 3. Ablauf OTP-Login (Main-Server)

1. User öffnet **https://finalstage.ch** (oder www.finalstage.ch).
2. Nginx leitet `/` an Frontend (Vite), `/api` an Backend.
3. Frontend sendet mit `baseURL = '/api/v1'` (weil `VITE_API_URL=/`).
4. „Code anfordern“ → `POST /api/v1/auth/send-otp` mit `{ "email": "..." }`.
5. Backend: User muss existieren und aktiv sein; OTP wird erzeugt und in DB gespeichert.
6. Wenn SMTP funktioniert: E-Mail mit Code; Response: „OTP-Code wurde per E-Mail versendet.“  
   Wenn SMTP fehlschlägt oder `OTP_DISPLAY_INSTEAD_OF_EMAIL=true`: Response enthält `display_otp_code`, Frontend zeigt „Ihr Login-Code: XXXXXX“.
7. User gibt Code ein → `POST /api/v1/auth/verify-otp` → Token → Redirect auf Dashboard.

---

## 4. Test im Browser

- **URL:** https://finalstage.ch (oder https://www.finalstage.ch)
- **E-Mail:** z. B. `goksche23@gmail.com` (muss in der User-Tabelle existieren und aktiv sein).
- **Schritte:** E-Mail eintragen → „Code anfordern“ → Code aus E-Mail (oder von der Seite, falls angezeigt) eintragen → „Anmelden“.

---

## 5. Referenz vs. Main (Kurz)

| Aspekt              | Referenz (test.finalstage.ch)     | Main (finalstage.ch)                    |
|---------------------|-----------------------------------|------------------------------------------|
| Login-Flow          | OTP only                          | OTP only (gleich)                        |
| SMTP bei Fehler     | 503, kein Code in Response        | Code in Response (`display_otp_code`)    |
| VITE_API_URL        | https://test.finalstage.ch        | / (gleiche Origin)                       |
| OTP_DISPLAY_...     | nicht vorhanden                  | in config.py ergänzt                     |

Das Login-System auf dem Main-Server ist damit zum Laufen gebracht und an das gewünschte Verhalten (inkl. Fallback-Anzeige des Codes bei SMTP-Problemen) angepasst.
