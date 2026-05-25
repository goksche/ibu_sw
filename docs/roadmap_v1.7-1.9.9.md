---
name: finalstage-v1.7-1.9.9
overview: "Roadmap v1.7–v1.9.9 (reserviert): SaaS-Fähigkeit (Multi-Tenancy), Rechtliches (DSGVO/AGB) und öffentliche Seiten (v1.7); Monetarisierung & Wachstum (Stripe, Self-Registration, Spielerprofil/Ranking) (v1.8); Premium/Realtime (White-Label, WebSocket Live) (v1.9). Local-first, danach Test auf Server B."
isProject: true
pmt_id: 9d3b5f5c-3f4e-4e7f-8e10-7b2c3e6b4c2f
type: web_app
status: active
phase: validation
phase_progress: 10
current_version: v1.6.0
next_milestone: "Kickoff v1.7: Tenant-Grundmodell + Isolation-Design"
milestone_due: ~
on_hold_reason: ~
last_activity: "2026-05-06"
todos:
  - id: v17-multitenancy-scope
    content: "v1.7: Multi-Tenancy Scope definieren (Organization/Club Modell, organization_id auf Kern-Entities, User↔Org Beziehung, Datenisolation) #high"
    status: pending
    priority: high
  - id: v17-legal-dsgvo-agb
    content: "v1.7: DSGVO/AGB/Datenschutz Konzept + Minimal-Implementationsplan (Löschung, Export, Aufbewahrung) #high"
    status: pending
    priority: high
  - id: v17-public-pages
    content: "v1.7: Öffentliche Seiten ohne Login (Turnier-Ansicht, Live-Ticker shareable Link, Embed/Widget) #high"
    status: pending
    priority: high
  - id: v18-stripe
    content: "v1.8: Stripe-Integration (Subscription-Tiers, Limits, Upgrade/Downgrade, Webhooks) #high"
    status: pending
    priority: high
  - id: v18-self-registration
    content: "v1.8: Self-Registration (Turnieranmeldung, optional Zahlung, QR-Einladung) #medium"
    status: pending
    priority: medium
  - id: v18-player-profile-ranking
    content: "v1.8: Spielerprofil + Ranking/History (Statistiken, Elo/Ranking-History) #medium"
    status: pending
    priority: medium
  - id: v19-white-label
    content: "v1.9: White-Label/Branding (Logo/Farben pro Org, Custom Domain, Sponsorenflächen) #medium"
    status: pending
    priority: medium
  - id: v19-websocket-live
    content: "v1.9: WebSocket Live-Updates (Ergebnisse ohne Reload, Realtime Views) #medium"
    status: pending
    priority: medium
schema_version: "1.0"
---

# finalstage.ch — Roadmap v1.7 bis v1.9.9 (reserviert)

Quelle/Erklärungen: `@.claude/worktrees/mystifying-taussig-37f2a5/docs/saas-verbesserungen.md` (SaaS-Verbesserungen & Monetarisierung).

## Leitplanken

- **Versionen 1.7–1.9.9** sind **reserviert** und werden entlang dieser Roadmap geplant.
- **Local-first**: Alles wird zuerst lokal konzipiert/umgesetzt/tested, erst danach auf **Server B** verifiziert.
- **Server A** (Produktion) nur nach expliziter Freigabe.

## v1.7 — Multi-Tenancy, DSGVO/AGB, Öffentliche Seiten

- **Multi-Tenancy (Muss)**: `Organization/Club` als Dach über allen Daten; `organization_id` auf Kern-Entities; User↔Org; Tenant-Isolation in Queries/Services.
- **Rechtliches (Muss)**: Datenschutzerklärung + AGB; Recht auf Löschung; Datenexport pro Org; Aufbewahrung/Retention.
- **Öffentliche Seiten (Wichtig)**: Turnier-Seite ohne Login (Gruppen/KO/Ergebnisse); Live-Ticker als shareable Link; Embed/Widget (Marketing/viral).

## v1.8 — Stripe, Self-Registration, Spielerprofil/Ranking

- **Stripe (Muss für Umsatz)**: Tiers (Free/Club/Pro/Federation), Limits, Subscription-Management, Webhooks, Upgrade/Downgrade.
- **Self-Registration (Wichtig)**: Spieler melden sich selbst an (optional Startgeld via Stripe), QR-Einladungen.
- **Spielerprofil/Ranking (Nice→Wichtig)**: Statistik/History über Turniere; Ranking/Elo Verlauf.

## v1.9 — White-Label, WebSocket Live

- **White-Label (Premium)**: Branding pro Org; Custom Domain; Sponsorenflächen.
- **Realtime (UX)**: WebSocket Live-Updates für Zuschauer/Organizer.

## Abhängigkeiten (High-level)

- Multi-Tenancy ist Grundvoraussetzung für Stripe-Tiers, White-Label und org-basierten Datenexport.
- Öffentliche Seiten und Realtime bauen auf klaren Sichtbarkeits-/Sharing-Regeln auf.

