# Theme Rollout Workflow

## Ziel
Weitere Designs sollen ohne Funktionsänderungen und mit reproduzierbarer Qualität in FinalStage integriert werden.

## Storybook-First Ablauf
1. **Token-Paket anlegen**
   - Neues Theme als CSS-Variablenblock unter `:root[data-layout="<theme-id>"]` in `src/index.css`.
   - Falls nötig zusätzliche Theme-spezifische Variablen in separater Datei unter `src/styles/`.

2. **Registry erweitern**
   - Theme in `src/theme/themeRegistry.ts` ergänzen:
     - `id`, `label`, `description`
     - `stage` (`preview` oder `stable`)
     - `selectableInSettings`

3. **Storybook-Abnahme**
   - Mindestens folgende Stories prüfen:
     - `Patterns/Management/*`
     - `Patterns/Tournament/*`
     - `Patterns/Presentation/*`
   - Optional dedizierte Preview-Story unter `src/stories/**/<Theme>Preview.stories.tsx`.

4. **Quality Gates**
   - `npm run storybook:test`
   - `npm run build`
   - beide müssen grün sein.

5. **Settings-Freigabe**
   - Erst nach visueller Abnahme `selectableInSettings: true` setzen.
   - Backend-Literals in `backend/app/schemas/settings.py` synchron halten.

## Definition of Ready pro neuem Theme
- Token-Name konsistent und semantisch.
- Mindestabdeckung in allen 3 UI-Ebenen vorhanden.
- Keine Business- oder Auth-Logik geändert.

## Definition of Done pro neuem Theme
- Theme erscheint im Settings-Dropdown.
- Theme kann gespeichert und beim Reload korrekt angewendet werden.
- Storybook + Build grün.
