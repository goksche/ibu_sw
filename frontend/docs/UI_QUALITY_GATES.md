# UI Quality Gates (Lokal)

## Ziel
Ein einheitlicher, schneller Prüfpfad vor Merge/Deployment für UI-Änderungen.

## Lokale Standardbefehle
- Einmalig nach Setup: `npx playwright install chromium`
- App-Build: `npm run build`
- Storybook Smoke: `npm run storybook:smoke`
- Storybook Build: `npm run build-storybook`
- Storybook Tests (Vitest addon): `npm run storybook:test`
- Alles zusammen: `npm run ui:quality`

## Mindest-Gates pro UI-Ticket
- Build erfolgreich (`npm run build`)
- Storybook startet (`storybook:smoke`)
- Storybook statisch baubar (`build-storybook`)
- Story-Testlauf erfolgreich (`storybook:test`)

## Inhaltliche Gates pro Story
- Zustände abgedeckt:
  - `Success`
  - `Loading`
  - `Empty` (wo relevant)
  - `Error`
  - `PermissionDenied` (für Management/Admin-Flows)
- i18n-Check:
  - mindestens `de` und `en` visuell geprüft
- Accessibility-Basis:
  - Fokus sichtbar
  - Kontrast bei Statusfarben lesbar
  - Keine offensichtlichen Tastatur-Fallen

## DoD (Definition of Done) für UI-Änderungen
- Story(s) ergänzt oder aktualisiert
- Betroffene Pattern-Story aktualisiert
- Figma-Referenz angepasst (falls visuelle Änderung)
- `ui:quality` lokal grün

## Troubleshooting
- Wenn `storybook:test` mit fehlendem Browser fehlschlägt:
  - `npx playwright install chromium`
- Wenn Storybook bei generierten Demo-Stories scheitert:
  - nur projektinterne Stories unter `src/stories/**` verwenden
- Wenn nur Storybook fehlschlägt, App-Build aber ok:
  - zuerst `npm run build-storybook` prüfen
  - dann spezifische Story isolieren
