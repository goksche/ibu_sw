# UI Definition of Done

## Pflichtkriterien pro UI-Änderung
- Nutzt ausschließlich Design-Tokens und semantische Varianten (`primary`, `muted`, `success`, etc.).
- Keine Inline-Styles und keine hardcodierten Farben (Hex/RGB/Tailwind-Farbwerte).
- Komponenten sind korrekt einsortiert:
  - `ui/*` = Primitives
  - `patterns/*` = Page-Komposition
  - `domain/*` = fachliche Composite-Komponenten
- Storybook enthält für jede neue/angepasste Komponente eine State-Matrix:
  - mindestens `Default`, `Loading`, `Empty`, `Error` (wo fachlich sinnvoll)
- Texte sind i18n-kompatibel (keine neuen hartcodierten UI-Texte in Seitenlogik).

## Qualitätsgates
- `npm run storybook:test` ist grün.
- `npm run build` ist grün.
- Bei visuellen Änderungen: Storybook-Stories geprüft und mit Figma-Tokens abgeglichen.

## Abnahmekriterien
- Keine Änderung an Business-Logik, Auth oder Login-Bereichen ohne expliziten Auftrag.
- Refactor-Diffs bleiben minimal und fokussiert auf Struktur, Spacing und Konsistenz.
