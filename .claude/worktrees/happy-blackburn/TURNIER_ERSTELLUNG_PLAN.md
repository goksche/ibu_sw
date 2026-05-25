# Planänderung: Turnier-Erstellung im Web Interface

## 📋 Aktueller Status (Desktop App)

Die Desktop-App hat einen **klaren 3-Schritte-Workflow**:

1. **Turnier erfassen** (`turnier_view.py`)
   - Name, Datum, Modus, Meisterschaftsrelevant
   - Nur Basis-Informationen

2. **Turnier starten** (`turnier_start_view.py`)
   - Teilnehmer zuweisen (Links: Verfügbar, Rechts: Im Turnier)
   - Gruppen erstellen (Anzahl, Auto-Verteilen, Manuell anpassen)

3. **Turnier durchführen**
   - Gruppenphase: Matches eintragen
   - KO-Phase: Brackets spielen

---

## 🎯 Vorgeschlagener Workflow für Web Interface

### Option A: Multi-Step Wizard (Empfohlen)

**Schritt 1: Turnier-Basis** (Aktuell implementiert)
- Name, Datum, Modus, Gruppen-Anzahl
- **→ Weiter: "Teilnehmer zuweisen"**

**Schritt 2: Teilnehmer zuweisen** (Neu)
- Liste verfügbarer Teilnehmer (Links)
- Ausgewählte Teilnehmer für Turnier (Rechts)
- Drag & Drop oder Buttons (→ ←)
- **→ Weiter: "Gruppen erstellen"**

**Schritt 3: Gruppen erstellen** (Neu)
- Auto-Verteilen basierend auf Anzahl Gruppen
- Manuelle Anpassung möglich
- Gruppen-Preview
- **→ Fertig: "Turnier starten"**

**Schritt 4: Turnier aktiv** (Dashboard)
- Link zu Gruppenphase/KO-Phase UI

### Option B: Minimal Workflow

**Schritt 1: Turnier erstellen** (Aktuell)
- Name, Datum, Modus
- **→ Rückkehr zum Dashboard**

**Schritt 2: Teilnehmer später zuweisen**
- Separate Seite: "Turnier Management"
- Teilnehmer zuweisen
- Gruppen erstellen

**Schritt 3: Turnier starten**
- Im Dashboard "Turnier starten" Button

---

## 🤔 Entscheidung benötigt

**Welcher Ansatz soll implementiert werden?**

- **A) Multi-Step Wizard** - Führt User durch den kompletten Setup-Prozess
- **B) Minimal Workflow** - User kann später Schritt für Schritt arbeiten

**Empfehlung: Option B** (Minimal)
- Flexibler
- User kann Turnier erstellen, später Details hinzufügen
- Entspricht dem Desktop-Workflow besser

---

## 📝 Nächste Schritte

### Falls Option A gewählt:
1. Create Tournament umbauen zu Wizard-Step 1
2. Participant Assignment Wizard-Step 2
3. Group Creation Wizard-Step 3
4. Progress Indicator oben zeigen

### Falls Option B gewählt:
1. Create Tournament bleibt wie aktuell
2. Tournament Management Page erstellen
3. Flow: Dashboard → Tournament → Teilnehmer/Gruppen verwalten

---

**Bitte Entscheidung: A oder B?**

