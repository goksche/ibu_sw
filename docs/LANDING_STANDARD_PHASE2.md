# Landing Standard Phase 2

Status: aktiv  
Baseline: `gsmartsol.ch` (aktueller Referenzstand)  
Geltungsbereich: neue Landing Pages auf Server B/C, spaeter Corporate Design

## 1) Ziel von Phase 2

Ein verbindlicher Landing-Standard fuer weitere Domains, basierend auf der aktuellen Seite von `gsmartsol.ch`.  
Alle neuen Landing Pages verwenden denselben technischen und visuellen Kern, nur Inhalte werden domain-spezifisch befuellt.

## 2) Baseline (nicht veraendern in Phase 2)

`gsmartsol.ch` ist die Referenz fuer:

- Aufbau/Struktur der Seite
- Look and Feel
- Token-Logik
- Responsive Verhalten
- CTA- und Formular-Pattern

## 3) Design-Tokens (v1)

Die folgenden Tokens sind verbindlich und werden in allen neuen Landing Pages verwendet:

- Farben
  - `--color-bg: #0a1020`
  - `--color-surface: #111a2f`
  - `--color-surface-soft: #16223d`
  - `--color-text: #eef3ff`
  - `--color-muted: #a9b7d6`
  - `--color-primary: #39d4ff`
  - `--color-primary-strong: #12b6e6`
  - `--color-border: rgba(57,212,255,.25)`
- Radius
  - `--radius-sm: 10px`
  - `--radius-md: 16px`
- Schatten
  - `--shadow-lg: 0 20px 45px rgba(0,0,0,.35)`
- Spacing
  - `--space-3: 16px`
  - `--space-4: 24px`
  - `--space-5: 32px`
  - `--space-6: 48px`
  - `--space-7: 72px`
- Layout
  - `--container: 1080px`
- Typografie
  - Primar: `Inter`, Fallback: `Segoe UI`, `system-ui`, `sans-serif`

## 4) Verbindliches Komponenten-Set

Jede neue Landing Page verwendet mindestens diese Komponenten:

1. Hero
   - Badge
   - H1
   - Lead-Text
   - CTA-Row (Primary + Secondary)
2. Value Props Grid
   - 3 Cards (Titel + kurzer Nutzen)
3. Formular-Sektion
   - Kontakt- oder Demo-Form
   - Klarer Submit-CTA
   - Status-/Hinweistext
4. Trust-Hinweise
   - 3 kurze Vertrauensanker
5. Footer
   - Domain/Brand-Hinweis und rechtliche Platzhalter

## 5) Responsive Standard

- Desktop: 3-Spalten Grid in Value Props
- Tablet: 2-Spalten Grid (`max-width: 900px`)
- Mobile: 1-Spalte (`max-width: 700px`)
- Containerbreite: `min(1080px, 92vw)`
- Buttons: auf kleinen Breakpoints umbrechbar (flex-wrap)

## 6) Content-Slots pro Domain

Nur folgende Inhalte duerfen pro Domain variieren:

- Badge-Label
- H1 (Hero-Titel)
- Lead-Text
- Card-Titel/Card-Texte
- CTA-Texte und CTA-Ziele
- Formularlabels/Platzhalter
- Footer-Text (Domain/Brand)

Nicht variieren ohne explizite Freigabe:

- Token-Werte
- Grundlayout
- Komponenten-Reihenfolge
- Responsive-Breakpoints

## 7) Technischer Standard fuer Rollout

Bei jeder neuen Landing-Page-Umsetzung:

1. Baseline-Datei von `gsmartsol.ch` als Startpunkt nehmen
2. Nur Content-Slots austauschen
3. Deployment auf Zielserver
4. Pflichtchecks:
   - `nginx -t`
   - `curl -I https://<domain>`
   - `curl -s https://<domain> | sed -n "1,12p"`
   - optional API-Check mit `curl -i` (bei Formular-Endpoint)

## 8) Richtung Corporate Design (Phase 2 -> spaeter)

Fuer den Uebergang zum Corporate Design werden spaeter erweitert:

- Brand-Typografie (Primary/Secondary Font)
- Offizielle Logo-Varianten
- Farbrollen (Primary, Secondary, Accent, Semantic)
- Komponentenbibliothek mit Varianten (Button/Card/Form)
- Content-Voice (Wording-Standards)

Bis dahin bleibt `gsmartsol.ch` die technische und visuelle Baseline.

## 9) Versionierung

- Standard-Version: `landing-standard-v1`
- Aenderungen nur als neue Version (`v1.1`, `v2.0`) und mit Changelog

