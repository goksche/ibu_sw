# Arena Layout - Local Go-Live Report

## Scope
- Theme: `arena` (`Arena Minimal Premium`)
- Goal: local go-live validation with no functional changes

## Baseline (Storybook reference)
- `Arena/Preview`
- `Patterns/Management/Arena/Preview`
- `Patterns/Tournament/Arena/Preview`
- `Patterns/Presentation/Arena/Preview`

## Visual target checklist
- Sidebar: glass surface, soft border, clear active state
- Topbar: translucent surface, soft border, consistent control styling
- Cards/Surfaces: premium dark layers with reduced visual noise
- Tables: dense but readable typography and alignment
- Buttons/Badges: Arena gradient primary, ghost secondary, consistent pill radius
- Contrast: text hierarchy and muted text readability

## Execution log
- Status: completed
- Notes:
  - Baseline references are fixed for comparison before quality gates and app checks.
  - PowerShell note: commands were executed sequentially (no `&&` support).

## Quality gates
- `npm run storybook:test`: passed (`25` test files, `60` tests)
- `npm run build`: passed (production build successful)
- `npm run ui:quality`: passed (`build` + `storybook:smoke` + `build-storybook` + `storybook:test`)
- Non-blocking note: bundle/chunk size warnings remain (already known), no failed gate

## Settings and persistence validation
- Save flow in settings confirmed:
  - User save via `settingsService.updateUserSettings(...)`
  - Immediate layout apply via `applyLayoutPreset(...)` in settings page
- Reload/login persistence path confirmed:
  - On app bootstrap, authenticated users load `/settings/user` and apply stored `layout`
  - Fallback to `standard` only if loading fails or user is unauthenticated
- Backend storage path confirmed:
  - `GET /settings/user` merges user row over global defaults
  - `PUT /settings/user` persists user-specific layout/font fields

## Three-layer acceptance (local)
- Management: validated through `Patterns/Management/*` suite and Arena preview story
- Tournament: validated through `Patterns/Tournament/*` suite and Arena preview story
- Presentation: validated through `Patterns/Presentation/*` suite and Arena preview story
- Result: no blocker found for local go-live

## Release decision
- Decision: promote `arena` from `preview` to `stable`
- Reason: all local gates green + no blocker in three-layer acceptance

## Rollback guard
- Immediate user fallback: switch to `standard` in settings
- Operational fallback:
  - set `arena.stage` back to `preview` if required
  - optionally set `arena.selectableInSettings` to `false` for temporary hide
  - keep token bridge in place for low-risk reactivation after hotfix
