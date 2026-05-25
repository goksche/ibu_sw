# Coming Soon Standard (v1)

Status: aktiv  
Design-Referenz (Source of Truth): `c:\Claude\GSmartSol\index.html`

## Ziel

Dieser Standard definiert das verbindliche Design fuer alle weiteren "Coming Soon" Pages.  
Regel: **Design bleibt identisch**, nur **Inhalte** werden pro Domain angepasst.

## 1) Nicht aendern (Design-Lock)

Diese Elemente sind fix und duerfen nicht veraendert werden:

- CSS-Token und Werte in `:root`
- Layout-Struktur (`canvas`, `.vignette`, `.page`, `.form`, `.footer`)
- Canvas/Animation Script (Grid, Particles, Scanline)
- Typografische Hierarchie und Spacing-System
- Grundfarben und Glow-Effekte

Kurz: HTML/CSS/JS-Design aus `c:\Claude\GSmartSol\index.html` bleibt 1:1.

## 2) Erlaubte Inhalts-Slots (pro Domain)

Nur diese Inhalte duerfen angepasst werden:

- `<title>...</title>`
- Status-Text in `.status` (z. B. "In Entwicklung")
- Hero-Headline (`<h1>...</h1>`)
- Subtext (`<p class="sub">...</p>`)
- CTA-Button-Text (`<button>...</button>`)
- Input-Placeholder (`placeholder="..."`)
- Footer-Brand (`<footer>...</footer>`)

Alles andere bleibt unveraendert.

## 3) Content-Matrix Vorlage

Nutze pro Domain diese Datenstruktur:

```json
{
  "domain": "example.ch",
  "title": "Example - Coming Soon",
  "status": "In Entwicklung",
  "headline_html": "Hier entsteht<br><strong>etwas Grosses.</strong>",
  "subtext": "Kurzer Nutzen-/Positionierungstext in 1-2 Saetzen.",
  "cta_text": "Notify me",
  "email_placeholder": "deine@email.com",
  "footer_brand": "Example"
}
```

## 4) Rollout-Prozess (verbindlich)

1. Basisdatei kopieren (`c:\Claude\GSmartSol\index.html`)
2. Nur Inhalts-Slots ersetzen
3. Deployment auf Zielserver
4. Pflichtchecks:
   - `nginx -t`
   - `curl -I https://<domain>`
   - `curl -s https://<domain> | sed -n "1,20p"`

## 5) Abnahme-Kriterien

Eine Coming-Soon-Page gilt als standardkonform, wenn:

- Design visuell identisch zur Basis ist
- Nur Inhalts-Slots angepasst wurden
- HTTPS erreichbar ist und korrekten Inhalt ausliefert
- Nginx-Konfiguration valide ist

## 6) Versionierung

- Standardname: `coming-soon-standard-v1`
- Designaenderungen nur ueber neue Version (`v1.1`, `v2.0`)
- Reine Textaenderungen pro Domain aendern die Standardversion nicht

