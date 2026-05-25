# GSmartSol – Corporate Design & UI Styleguide
Version: 1.0  
Stand: 2026  
Gueltig für: Webseite, Web Apps, Dashboards, Print, Rechnungen

---

## 1. Zweck des Dokuments
Dieses Dokument definiert den **verbindlichen visuellen Standard** für alle Produkte von **GSmartSol (goeksche smart solutions)**.

Ziel:
- Einheitliches Erscheinungsbild
- Hohe Lesbarkeit
- Professioneller SaaS-Auftritt
- Skalierbarkeit über mehrere Tools hinweg

Dieses Dokument ist **erweiterbar**, bestehende Regeln duerfen **nicht geaendert**, sondern nur **ergaenzt** werden.

---

## 2. Markenwerte (Design-DNA)
Die folgenden Attribute sind bindend für alle Designentscheidungen:

- modern
- sachlich
- sportlich

Leitprinzip:
> Funktion vor Optik. Klarheit vor Effekten.

---

## 3. Farbkonzept

### 3.1 Markenfarben

| Zweck | Name | HEX |
|---|---|---|
| Primaerfarbe | GSmart Blue | `#0F2A44` |
| Sekundaerfarbe | Slate Grey | `#6B7280` |
| Akzentfarbe | Energy Green | `#22C55E` |

**Regeln:**
- Blau = Struktur
- Gruen = Aktion
- Grau = Information
- Akzentfarbe maximal 10–15 Prozent einer Seite

---

### 3.2 Neutralfarben

| Zweck | HEX |
|---|---|
| Weiss | `#FFFFFF` |
| Hellgrau (Background) | `#F3F4F6` |
| Border Grau | `#E5E7EB` |
| Text dunkel | `#1F2933` |

---

### 3.3 Statusfarben (funktional)

| Status | HEX | Verwendung |
|---|---|---|
| Erfolg | `#16A34A` | gespeichert, ok |
| Warnung | `#F59E0B` | Hinweis |
| Fehler | `#DC2626` | Fehler |
| Info | `#2563EB` | neutral |

Statusfarben sind **keine Markenfarben**.

---

### 3.4 Dark Mode

| Zweck | HEX |
|---|---|
| Background | `#0B1623` |
| Card Background | `#111F2E` |
| Text Primary | `#E5E7EB` |
| Text Secondary | `#9CA3AF` |

**Regel:**  
Keine neuen Farben im Dark Mode, nur Tonwert-Anpassungen.

---

## 4. Typografie

### 4.1 Schrift
**Primäre Schrift:** Inter  
Gueltig für Web, Web App und Print.

---

### 4.2 Schriftschnitte (verbindlich)
- Regular (400)
- Medium (500)
- SemiBold (600)
- Bold (700) – sehr sparsam

Keine Light-, Italic- oder Decorative-Schnitte.

---

### 4.3 Typo-Hierarchie (Web)

| Typ | Groesse | Gewicht |
|---|---|---|
| H1 | 40 px | 600 |
| H2 | 32 px | 600 |
| H3 | 24 px | 600 |
| H4 | 18 px | 500 |
| Body | 16 px | 400 |
| Small | 14 px | 400 |
| Micro | 12 px | 400 |

Zeilenhoehe:
- Body: 1.6
- Headlines: 1.2–1.3

---

### 4.4 Typografie Print & Rechnungen
- Body: 10.5–11 pt
- Titel: 14–18 pt
- Textfarbe: Schwarz
- Akzentfarbe nur für Linien oder Marker

---

## 5. Layout-System

### 5.1 Grundstruktur (Web App)
- Fester Header
- Linke Sidebar
- Content-Bereich mit Cards

Keine freien Layout-Experimente.

---

### 5.2 Header
- Hoehe: 56–64 px
- Hintergrund: GSmart Blue
- Inhalt:
  - Logo / Name links
  - User-Menu rechts

---

### 5.3 Sidebar
- Breite: 240 px
- Icons + Text
- Aktiver Punkt: gruene Linie links
- Keine Animationen

---

### 5.4 Content
- Hintergrund: Hellgrau
- Weissraum bewusst einsetzen
- Sections klar trennen

---

## 6. UI-Komponenten

### 6.1 Buttons

#### Primary Button
- Hintergrund: Energy Green
- Text: Weiss
- Radius: 6 px
- Gewicht: Medium
- Maximal 1 pro View

#### Secondary Button
- Border: Slate Grey
- Text: Slate Grey
- Hintergrund: transparent

#### Danger Button
- Rot
- Nur mit Bestaetigungsdialog

---

### 6.2 Inputs
- Hoehe: 40 px
- Radius: 6 px
- Border: Hellgrau
- Focus: Primary Blue
- Error: Rot + Text unter Feld

---

### 6.3 Cards
- Hintergrund: Weiss
- Radius: 8 px
- Padding: 20–24 px
- Abstand: 16–24 px

Cards sind das **zentrale UI-Element**.

---

### 6.4 Tabellen
- Header: Hellgrau
- Keine Zebra-Streifen
- Zahlen rechtsbuendig
- Aktionen immer rechts

---

### 6.5 Modals
- Overlay: Schwarz 40 Prozent
- Radius: 10 px
- Breite: 480–640 px
- Pflicht bei kritischen Aktionen

---

## 7. Icons
- Stil: Outline oder Duotone
- Einheitliche Linienstaerke
- Icons nie ohne Label (ausser Actions)

---

## 8. Do & Donts

### Do
- kurze, klare Texte
- klare visuelle Hierarchie
- konsistente Abstaende

### Dont
- zu viele Farben
- mehrere Primary Buttons
- Animationen ohne Zweck
- verspielte Icons oder Fonts

---

## 9. Einsatzbereiche
Dieser Styleguide gilt verbindlich für:
- SaaS-Webseiten
- Web Apps
- Dashboards
- Admin-Tools
- Rechnungen & PDFs

---

## 10. Erweiterung & Versionierung
- Neue Komponenten muessen dokumentiert werden
- Bestehende Regeln duerfen nicht gebrochen werden
- Versionierung semantisch (v1.1, v1.2 usw.)

---

**Ende des Dokuments**
