# Storybook Governance (Lokal)

## Ziel
Storybook ist die technische UI-Quelle. Figma ist die visuelle Design-Quelle.
Neue UI-Arbeit wird nur als "fertig" betrachtet, wenn beide Seiten konsistent sind.

## Strukturregeln
- `Foundations/*`: Farben, Typografie, Spacing, Zustandsprinzipien
- `Components/UI/*`: atomare, wiederverwendbare Basisbausteine (`ui/*`)
- `Components/Layout/*`: Shell/Navigation/Seitenrahmen
- `Components/Patterns/*`: page-level Composition Patterns (`patterns/*`)
- `Components/Domain/*`: fachspezifische Composite-Komponenten (`domain/*`)
- `Patterns/Management|Tournament|Presentation/*`: zusammengesetzte Zustände und Flows in Storybook

## Naming-Regeln
- Story-Titel folgen exakt der Ordnerhierarchie.
- State-Suffixe sind einheitlich: `Success`, `Loading`, `Empty`, `Error`, `PermissionDenied`.
- Variant-Namen sind semantisch, nicht technisch (z. B. `KOPending` statt `CaseB`).

## Figma-Mapping
- Figma-Seiten spiegeln Storybook-Hierarchie:
  - `Foundations`
  - `Components`
  - `Patterns`
- Token-Namen sind semantisch und stabil:
  - `color.bg.background`
  - `color.text.muted`
  - `space.4`, `space.6`
  - `radius.md`
- Pro Story-Pattern gibt es mindestens einen Figma-Referenzframe.

## Ownership
- UI-Basis (`components/ui`) wird zentral gepflegt.
- Domain-Komponenten (`components/tournament`, `pages/Admin`) werden im jeweiligen Fachkontext gepflegt.
- Änderungen an Basis-UI benötigen Review auf Auswirkungen in allen drei Ebenen.

## Pull-Request-Regeln (UI)
- Bei neuen Komponenten:
  - Story unter `Components/*`
  - mind. `Default` + ein Fehler- oder Disabled-State
- Bei neuen Flows:
  - Story unter `Patterns/*`
  - mind. `Success` + `Loading` + `Error`
- Bei visuellen Breaking Changes:
  - Storybook neu bauen und visuell prüfen
  - Figma-Referenzframe aktualisieren
