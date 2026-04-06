from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = REPO_ROOT / "docs"
STATUS_PATH = DOCS_DIR / "control_center_status.json"
CHECKLIST_PATH = DOCS_DIR / "control_center_validation_checklist.md"
OUTPUT_PATH = DOCS_DIR / "control_center.html"
DEFAULT_MAIN_PLAN = Path(
    r"C:\Users\goksc\.cursor\plans\mvp-erweiterung-1-verbesserungen_b90f1322.plan.md"
)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _run_git(args: list[str]) -> str:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), *args],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return out.strip()
    except Exception:
        return "n/a"


def _load_status() -> dict[str, Any]:
    data = json.loads(_read_text(STATUS_PATH))
    if not isinstance(data, dict):
        raise ValueError("Statusdatei hat kein JSON-Objekt als Root.")
    return data


def _resolve_main_plan_path() -> Path:
    env_path = os.getenv("CONTROL_MAIN_PLAN_PATH", "").strip()
    if env_path:
        candidate = Path(env_path)
        if candidate.exists():
            return candidate

    if DEFAULT_MAIN_PLAN.exists():
        return DEFAULT_MAIN_PLAN

    workspace_candidate = REPO_ROOT / ".cursor" / "plans" / DEFAULT_MAIN_PLAN.name
    if workspace_candidate.exists():
        return workspace_candidate

    return DEFAULT_MAIN_PLAN


def _extract_frontmatter(md_text: str) -> str:
    lines = md_text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return ""
    end_index = -1
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_index = i
            break
    if end_index == -1:
        return ""
    return "\n".join(lines[1:end_index])


def _parse_todos_from_frontmatter(frontmatter: str) -> list[dict[str, str]]:
    todos: list[dict[str, str]] = []
    current: dict[str, str] | None = None

    for raw_line in frontmatter.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if stripped.startswith("- id:"):
            if current:
                todos.append(current)
            current = {"id": stripped.split(":", 1)[1].strip().strip('"')}
            continue

        if not current:
            continue

        if stripped.startswith("content:"):
            current["content"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("status:"):
            current["status"] = stripped.split(":", 1)[1].strip().strip('"').lower()

    if current:
        todos.append(current)

    for todo in todos:
        todo.setdefault("content", "")
        todo.setdefault("status", "unknown")

    return todos


def _load_plan_todos() -> tuple[Path, list[dict[str, str]]]:
    plan_path = _resolve_main_plan_path()
    if not plan_path.exists():
        return plan_path, []
    text = _read_text(plan_path)
    frontmatter = _extract_frontmatter(text)
    return plan_path, _parse_todos_from_frontmatter(frontmatter)


def _status_key(value: str) -> str:
    v = (value or "").strip().lower()
    if v in {"ok", "pass", "passed", "green", "completed"}:
        return "ok"
    if v in {"warn", "warning", "yellow", "in_progress", "partial"}:
        return "warn"
    if v in {"fail", "failed", "error", "red", "blocked"}:
        return "fail"
    return "unknown"


def _badge(text: str, status: str) -> str:
    key = _status_key(status)
    label = escape((text or "").strip() or "unknown")
    return f'<span class="badge badge-{key}">{label}</span>'


def _format_list(items: list[str]) -> str:
    if not items:
        return "<li><em>Keine Einträge</em></li>"
    return "".join(f"<li>{escape(str(x))}</li>" for x in items)


def _render_fallback_events(events: list[dict[str, Any]]) -> str:
    if not events:
        return "<p class='muted'>Keine Fallback-Ereignisse gemeldet.</p>"

    rows: list[str] = []
    violation = False
    for event in events:
        visibility = str(event.get("visibility", "unknown"))
        visible_key = _status_key(visibility)
        if visible_key != "ok":
            violation = True
        rows.append(
            "<tr>"
            f"<td>{escape(str(event.get('time', '-')))}</td>"
            f"<td>{escape(str(event.get('component', '-')))}</td>"
            f"<td>{escape(str(event.get('reason', '-')))}</td>"
            f"<td>{escape(str(event.get('fallback_used', '-')))}</td>"
            f"<td>{_badge(visibility, visibility)}</td>"
            f"<td>{escape(str(event.get('ticket', '-')))}</td>"
            "</tr>"
        )

    info = (
        "<p class='hint-bad'>No-silent-fallback-Verletzung: Mindestens ein Ereignis ist nicht transparent markiert.</p>"
        if violation
        else "<p class='hint-good'>No-silent-fallback erfüllt: Alle Fallbacks sind transparent dokumentiert.</p>"
    )

    return (
        info
        + "<table><thead><tr><th>Zeit</th><th>Komponente</th><th>Grund</th><th>Fallback</th><th>Transparenz</th><th>Ticket</th></tr></thead>"
        + f"<tbody>{''.join(rows)}</tbody></table>"
    )


def _render_governance(g: dict[str, Any]) -> str:
    promotion = g.get("promotion_gate", {})
    rollback = g.get("rollback", {})
    migration = g.get("migration", {})
    drift = g.get("drift_check", {})
    post = g.get("post_deploy_minimum", {})
    timezone_rules = g.get("timezone_rule", {})
    fallback_events = g.get("fallback_events", [])

    smoke = post.get("smoke", {})

    return f"""
    <div class="gov-grid">
      <div class="gov-item">
        <h4>Promotions-Gate</h4>
        <p>{_badge(str(promotion.get('status', 'unknown')), str(promotion.get('status', 'unknown')))}</p>
        <p class="muted">Stufe: {escape(str(promotion.get('stage', '-')))}</p>
        <p class="muted">Letzter Smoke: {escape(str(promotion.get('last_smoke_at', '-')))}</p>
      </div>
      <div class="gov-item">
        <h4>Rollback</h4>
        <p>{_badge(str(rollback.get('status', 'unknown')), str(rollback.get('status', 'unknown')))}</p>
        <p class="muted">Backup geprüft: {escape(str(rollback.get('backup_checked', '-')))}</p>
        <p class="muted">Rückrollweg: {escape(str(rollback.get('rollback_path_minutes', '-')))} min</p>
        <p class="muted">DB-Hinweis: {escape(str(rollback.get('db_migration_note', '-')))}</p>
      </div>
      <div class="gov-item">
        <h4>Migrationen</h4>
        <p>{_badge(str(migration.get('status', 'unknown')), str(migration.get('status', 'unknown')))}</p>
        <p class="muted">Stand: {escape(str(migration.get('current_state', '-')))}</p>
        <p class="muted">Letzte Migration: {escape(str(migration.get('last_migration', '-')))}</p>
      </div>
      <div class="gov-item">
        <h4>Config-Drift</h4>
        <p>{_badge(str(drift.get('status', 'unknown')), str(drift.get('status', 'unknown')))}</p>
        <p class="muted">.env: {escape(str(drift.get('env_file', '-')))} | compose: {escape(str(drift.get('compose', '-')))} | nginx: {escape(str(drift.get('nginx', '-')))}</p>
      </div>
      <div class="gov-item">
        <h4>Post-Deploy-Minimum</h4>
        <p>{_badge(str(post.get('status', 'unknown')), str(post.get('status', 'unknown')))}</p>
        <p class="muted">Health: {_badge(str(smoke.get('health', 'unknown')), str(smoke.get('health', 'unknown')))}</p>
        <p class="muted">API-Flow: {_badge(str(smoke.get('api_flow', 'unknown')), str(smoke.get('api_flow', 'unknown')))}</p>
        <p class="muted">UI-Flow: {_badge(str(smoke.get('ui_flow', 'unknown')), str(smoke.get('ui_flow', 'unknown')))}</p>
      </div>
      <div class="gov-item">
        <h4>Zeitstandard</h4>
        <p>{_badge(str(timezone_rules.get('status', 'unknown')), str(timezone_rules.get('status', 'unknown')))}</p>
        <p class="muted">Speicherung: {escape(str(timezone_rules.get('storage', '-')))}</p>
        <p class="muted">Anzeige: {escape(str(timezone_rules.get('display', '-')))}</p>
      </div>
    </div>
    <div class="fallback-block">
      <h4>Fallback-Transparenz</h4>
      {_render_fallback_events(fallback_events)}
    </div>
    """


def _render_server_card(name: str, data: dict[str, Any]) -> str:
    version = str(data.get("version", "n/a"))
    online_since = str(data.get("online_since", "n/a"))
    last_change = str(data.get("last_change", "n/a"))
    risk_flag = str(data.get("risk_flag", "unknown"))
    deployment_ref = data.get("deployment_ref", {})
    features = data.get("confirmed_features", [])
    open_items = data.get("open_pendencies", [])
    governance = data.get("governance", {})

    return f"""
    <section class="card">
      <div class="card-top">
        <h2>{escape(name)}</h2>
        {_badge(risk_flag, risk_flag)}
      </div>
      <p><strong>Version:</strong> {escape(version)}</p>
      <p><strong>Online seit:</strong> {escape(online_since)}</p>
      <p><strong>Letzte Änderung:</strong> {escape(last_change)}</p>
      <p><strong>Deployment-Referenz:</strong> Git-Tag {escape(str(deployment_ref.get('git_tag', '-')))}, APP_VERSION {escape(str(deployment_ref.get('app_version', '-')))}, Image-Tag {escape(str(deployment_ref.get('image_tag', '-')))}</p>
      <h3>Bestätigte Funktionen</h3>
      <ul>{_format_list(features)}</ul>
      <h3>Offene Pendenzen</h3>
      <ul>{_format_list(open_items)}</ul>
      <h3>Governance</h3>
      {_render_governance(governance)}
    </section>
    """


def _parse_checklist_markdown(md_text: str) -> str:
    lines = [ln.strip() for ln in md_text.splitlines()]
    rows = []
    for line in lines:
        if not line.startswith("- ["):
            continue
        checked = line.startswith("- [x]") or line.startswith("- [X]")
        text = line[5:].strip()
        cls = "done" if checked else "todo"
        mark = "Erledigt" if checked else "Offen"
        rows.append(f"<li class='{cls}'>{escape(text)} <span class='muted'>({mark})</span></li>")
    if not rows:
        return "<li><em>Keine Checklist-Einträge gefunden.</em></li>"
    return "".join(rows)


def build() -> None:
    status_data = _load_status()
    plan_path, todos = _load_plan_todos()

    pending = [t for t in todos if t.get("status") == "pending"]
    completed = [t for t in todos if t.get("status") == "completed"]

    git_branch = _run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    git_sha = _run_git(["rev-parse", "--short", "HEAD"])
    git_last_commit_time = _run_git(["log", "-1", "--format=%cI"])
    git_dirty = "yes" if _run_git(["status", "--porcelain"]) not in {"", "n/a"} else "no"

    backend_config = _read_text(REPO_ROOT / "backend" / "app" / "core" / "config.py")
    backend_version_match = re.search(r'APP_VERSION:\s*str\s*=\s*"([^"]+)"', backend_config)
    backend_version = backend_version_match.group(1) if backend_version_match else "n/a"

    frontend_package = json.loads(_read_text(REPO_ROOT / "frontend" / "package.json"))
    frontend_version = str(frontend_package.get("version", "n/a"))

    checklist_html = _parse_checklist_markdown(_read_text(CHECKLIST_PATH))
    generated_at = datetime.now(timezone.utc).isoformat()

    servers = status_data.get("servers", {})
    cards = []
    for key in ("Server A", "Server B", "Lokal"):
        if key in servers:
            cards.append(_render_server_card(key, servers[key]))

    pending_rows = "".join(
        f"<tr><td>{escape(t.get('id', '-'))}</td><td>{escape(t.get('content', '-'))}</td><td>{_badge(t.get('status', 'unknown'), t.get('status', 'unknown'))}</td></tr>"
        for t in pending[:30]
    )
    if not pending_rows:
        pending_rows = "<tr><td colspan='3'><em>Keine offenen Pendenzen im Hauptplan.</em></td></tr>"

    html = f"""<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FinalStage - Lokale Kontrollwebseite</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #0b1220;
      --panel: #121a2b;
      --panel-soft: #17233a;
      --text: #edf2ff;
      --muted: #9fb0d4;
      --ok: #1ecb7b;
      --warn: #ffd166;
      --fail: #ef476f;
      --unknown: #8a94ad;
      --border: #273556;
      --accent: #64b5ff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", "Source Sans 3", sans-serif;
      background: radial-gradient(1000px 700px at 100% -10%, #1d2f51 0%, var(--bg) 60%);
      color: var(--text);
      line-height: 1.45;
    }}
    .wrap {{ max-width: 1400px; margin: 0 auto; padding: 24px; }}
    h1, h2, h3, h4 {{ margin: 0 0 10px; }}
    h1 {{ font-size: 28px; }}
    .muted {{ color: var(--muted); font-size: 13px; }}
    .top {{
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }}
    .panel {{
      background: linear-gradient(180deg, var(--panel), var(--panel-soft));
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
    }}
    .cards {{
      display: grid;
      grid-template-columns: repeat(3, minmax(280px, 1fr));
      gap: 16px;
      margin: 18px 0;
    }}
    .card {{
      background: linear-gradient(180deg, var(--panel), var(--panel-soft));
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
    }}
    .card-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }}
    .badge {{
      display: inline-block;
      font-size: 12px;
      border-radius: 999px;
      padding: 4px 10px;
      border: 1px solid transparent;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .03em;
    }}
    .badge-ok {{ color: #0c1a12; background: var(--ok); }}
    .badge-warn {{ color: #2b1f00; background: var(--warn); }}
    .badge-fail {{ color: #2e0911; background: var(--fail); }}
    .badge-unknown {{ color: #d2d9ea; background: #56627e; }}
    ul {{ margin: 8px 0 12px 18px; padding: 0; }}
    li {{ margin-bottom: 4px; }}
    .gov-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }}
    .gov-item {{
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
      background: #0f1728;
    }}
    .fallback-block {{
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
      background: #0f1728;
      margin-top: 10px;
    }}
    .hint-good {{
      color: #97ffd0;
      font-size: 13px;
      margin: 6px 0 10px;
    }}
    .hint-bad {{
      color: #ff95ab;
      font-size: 13px;
      margin: 6px 0 10px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }}
    th, td {{
      border: 1px solid var(--border);
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }}
    th {{ background: #0d1524; }}
    .checklist li.todo {{ color: #ffe4a2; }}
    .checklist li.done {{ color: #a6f0c8; }}
    .query-grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(320px, 1fr));
      gap: 14px;
      margin-top: 10px;
    }}
    .server-link-state {{
      margin-top: 8px;
      margin-bottom: 8px;
    }}
    .query-card {{
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      background: #0f1728;
    }}
    .query-row {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }}
    .query-card select,
    .query-card textarea,
    .query-card input {{
      width: 100%;
      color: var(--text);
      background: #0b1220;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      font: inherit;
    }}
    .query-card textarea {{
      min-height: 100px;
      resize: vertical;
    }}
    .btn {{
      color: var(--text);
      background: #16233c;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 10px;
      cursor: pointer;
    }}
    .btn:hover {{ border-color: var(--accent); }}
    .btn-run {{ background: #1c355a; }}
    .cmd {{
      display: block;
      padding: 8px;
      border-radius: 8px;
      background: #0b1220;
      border: 1px solid var(--border);
      font-family: Consolas, "Courier New", monospace;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 6px 0 8px;
    }}
    .result {{
      margin-top: 8px;
      border: 1px solid var(--border);
      background: #0b1220;
      border-radius: 8px;
      padding: 8px;
      font-size: 13px;
    }}
    @media (max-width: 1180px) {{
      .cards {{ grid-template-columns: 1fr; }}
      .top {{ grid-template-columns: 1fr; }}
      .gov-grid {{ grid-template-columns: 1fr; }}
      .query-grid {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Lokale Kontrollwebseite - FinalStage</h1>
    <p class="muted">Nur lokale Datenaggregation. Keine direkte Serverkopplung. Generiert am: {escape(generated_at)}</p>

    <section class="top">
      <div class="panel">
        <h3>Lokale Build-Metadaten</h3>
        <p><strong>Git:</strong> Branch {escape(git_branch)} | Commit {escape(git_sha)} | Dirty: {escape(git_dirty)}</p>
        <p><strong>Letzter Commit-Zeitpunkt:</strong> {escape(git_last_commit_time)}</p>
        <p><strong>Backend APP_VERSION:</strong> {escape(backend_version)} | <strong>Frontend Version:</strong> {escape(frontend_version)}</p>
      </div>
      <div class="panel">
        <h3>Plan-Sync</h3>
        <p><strong>Quelle:</strong> {escape(str(plan_path))}</p>
        <p><strong>Offen:</strong> {len(pending)} | <strong>Erledigt:</strong> {len(completed)} | <strong>Total:</strong> {len(todos)}</p>
      </div>
    </section>

    <section class="cards">
      {''.join(cards)}
    </section>

    <section class="panel">
      <h3>Manuelle Serverabfragen</h3>
      <p class="muted">Per Knopfdruck ausfuehren: Starter verwenden (<code>start_control_center.bat</code>). Alternativ manuell ueber Copy + Ausgabe.</p>
      <div class="query-row">
        <button class="btn" id="check-query-server-btn" type="button">Verbindung pruefen</button>
      </div>
      <p class="server-link-state" id="query-server-state"><span class="badge badge-warn">idle</span> Query-Server noch nicht geprueft.</p>
      <div class="query-grid">
        <div class="query-card" data-server="server-a">
          <h4>Server A (finalstage.ch)</h4>
          <div class="query-row">
            <select class="query-type">
              <option value="compose_ps">Container-Status (docker compose ps)</option>
              <option value="health">Health-Header (Startseite)</option>
              <option value="api">API-Header (/api/v1/settings/global)</option>
            </select>
          </div>
          <label class="muted">Kommando</label>
          <code class="cmd"></code>
          <div class="query-row">
            <button class="btn btn-run run-btn" type="button">Direkt ausfuehren</button>
            <button class="btn copy-btn" type="button">Kommando kopieren</button>
            <button class="btn eval-btn" type="button">Ausgabe auswerten</button>
          </div>
          <label class="muted">Ausgabe hier einfuegen</label>
          <textarea class="query-output" placeholder="Terminal-Ausgabe einfuegen..."></textarea>
          <div class="result muted">Noch keine Auswertung.</div>
        </div>

        <div class="query-card" data-server="server-b">
          <h4>Server B (test.finalstage.ch)</h4>
          <div class="query-row">
            <select class="query-type">
              <option value="compose_ps">Container-Status (docker compose ps)</option>
              <option value="health">Health-Header (Startseite)</option>
              <option value="api">API-Header (/api/v1/settings/global)</option>
            </select>
          </div>
          <label class="muted">Kommando</label>
          <code class="cmd"></code>
          <div class="query-row">
            <button class="btn btn-run run-btn" type="button">Direkt ausfuehren</button>
            <button class="btn copy-btn" type="button">Kommando kopieren</button>
            <button class="btn eval-btn" type="button">Ausgabe auswerten</button>
          </div>
          <label class="muted">Ausgabe hier einfuegen</label>
          <textarea class="query-output" placeholder="Terminal-Ausgabe einfuegen..."></textarea>
          <div class="result muted">Noch keine Auswertung.</div>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3>Offene Pendenzen aus Hauptplan</h3>
      <table>
        <thead><tr><th>ID</th><th>Inhalt</th><th>Status</th></tr></thead>
        <tbody>{pending_rows}</tbody>
      </table>
    </section>

    <section class="panel">
      <h3>Abnahme-Checkliste (Lokal - Server B - Server A)</h3>
      <ul class="checklist">
        {checklist_html}
      </ul>
    </section>
  </div>
  <script>
    (function () {{
      const commandMap = {{
        "server-a": {{
          compose_ps: "ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new root@144.91.103.103 \\"cd /root/ibu_sw && docker compose -f docker-compose.prod.yml --env-file .env.prod ps\\"",
          health: "ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new root@144.91.103.103 \\"if command -v curl >/dev/null 2>&1; then curl -skI https://127.0.0.1/ -H 'Host: finalstage.ch'; elif command -v wget >/dev/null 2>&1; then wget -S --spider --no-check-certificate --header='Host: finalstage.ch' https://127.0.0.1/ 2>&1; else echo 'curl/wget fehlt auf Server'; exit 127; fi\\"",
          api: "ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new root@144.91.103.103 \\"if command -v curl >/dev/null 2>&1; then curl -skI https://127.0.0.1/api/v1/settings/global -H 'Host: finalstage.ch'; elif command -v wget >/dev/null 2>&1; then wget -S --spider --no-check-certificate --header='Host: finalstage.ch' https://127.0.0.1/api/v1/settings/global 2>&1; else echo 'curl/wget fehlt auf Server'; exit 127; fi\\""
        }},
        "server-b": {{
          compose_ps: "ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new root@95.111.238.180 \\"cd /root/ibu_sw && docker compose -f docker-compose.prod.yml --env-file .env.prod ps\\"",
          health: "ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new root@95.111.238.180 \\"if command -v curl >/dev/null 2>&1; then curl -skI https://127.0.0.1/ -H 'Host: test.finalstage.ch'; elif command -v wget >/dev/null 2>&1; then wget -S --spider --no-check-certificate --header='Host: test.finalstage.ch' https://127.0.0.1/ 2>&1; else echo 'curl/wget fehlt auf Server'; exit 127; fi\\"",
          api: "ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new root@95.111.238.180 \\"if command -v curl >/dev/null 2>&1; then curl -skI https://127.0.0.1/api/v1/settings/global -H 'Host: test.finalstage.ch'; elif command -v wget >/dev/null 2>&1; then wget -S --spider --no-check-certificate --header='Host: test.finalstage.ch' https://127.0.0.1/api/v1/settings/global 2>&1; else echo 'curl/wget fehlt auf Server'; exit 127; fi\\""
        }}
      }};

      function evaluate(type, text) {{
        const normalized = (text || "").toLowerCase();
        if (!normalized.trim()) {{
          return {{ status: "warn", message: "Keine Ausgabe eingefuegt." }};
        }}
        if (type === "compose_ps") {{
          if (normalized.includes("exit ") || normalized.includes("restarting")) {{
            return {{ status: "fail", message: "Containerproblem erkannt (Exit/Restarting)." }};
          }}
          if (normalized.includes(" up ") || normalized.includes("running")) {{
            return {{ status: "ok", message: "Containerstatus sieht gesund aus." }};
          }}
          return {{ status: "warn", message: "Containerstatus nicht eindeutig. Bitte manuell pruefen." }};
        }}

        if (normalized.includes("502")) {{
          return {{ status: "fail", message: "502 Bad Gateway erkannt." }};
        }}
        if (normalized.match(/http\\/[0-9.]+\\s+(200|301|302)/)) {{
          return {{ status: "ok", message: "HTTP-Status ok (200/301/302)." }};
        }}
        if (normalized.match(/http\\/[0-9.]+\\s+([45][0-9][0-9])/)) {{
          return {{ status: "fail", message: "HTTP-Fehler erkannt (4xx/5xx)." }};
        }}
        return {{ status: "warn", message: "Kein klarer HTTP-Status erkannt." }};
      }}

      function resultClass(status) {{
        if (status === "ok") return "badge badge-ok";
        if (status === "fail") return "badge badge-fail";
        return "badge badge-warn";
      }}

      document.querySelectorAll(".query-card").forEach((card) => {{
        const server = card.getAttribute("data-server");
        const select = card.querySelector(".query-type");
        const cmdEl = card.querySelector(".cmd");
        const runBtn = card.querySelector(".run-btn");
        const copyBtn = card.querySelector(".copy-btn");
        const evalBtn = card.querySelector(".eval-btn");
        const output = card.querySelector(".query-output");
        const result = card.querySelector(".result");

        function refreshCommand() {{
          const key = select.value;
          cmdEl.textContent = commandMap[server][key];
        }}

        refreshCommand();
        select.addEventListener("change", refreshCommand);

        copyBtn.addEventListener("click", async () => {{
          const cmd = cmdEl.textContent || "";
          try {{
            await navigator.clipboard.writeText(cmd);
            result.innerHTML = "<span class='badge badge-ok'>kopiert</span> Kommando in Zwischenablage.";
          }} catch (err) {{
            result.innerHTML = "<span class='badge badge-warn'>hinweis</span> Kopieren nicht erlaubt. Bitte manuell markieren.";
          }}
        }});

        evalBtn.addEventListener("click", () => {{
          const verdict = evaluate(select.value, output.value);
          result.innerHTML = `<span class="${{resultClass(verdict.status)}}">${{verdict.status}}</span> ${{verdict.message}}`;
        }});

        runBtn.addEventListener("click", async () => {{
          result.innerHTML = "<span class='badge badge-warn'>running</span> Abfrage wird ausgefuehrt...";
          try {{
            const response = await fetch("http://127.0.0.1:8765/api/run", {{
              method: "POST",
              headers: {{ "Content-Type": "application/json" }},
              body: JSON.stringify({{ server, type: select.value }})
            }});

            if (!response.ok) {{
              result.innerHTML = "<span class='badge badge-fail'>fail</span> Query-Server antwortet mit Fehler.";
              return;
            }}

            const data = await response.json();
            const merged = `${{data.stdout || ""}}${{(data.stdout && data.stderr) ? "\\n" : ""}}${{data.stderr || ""}}`.trim();
            output.value = merged;

            const statusClass = resultClass(data.status || "warn");
            const codeInfo = typeof data.returncode === "number" ? ` (exit=${{data.returncode}})` : "";
            result.innerHTML = `<span class="${{statusClass}}">${{data.status || "warn"}}</span> ${{data.message || "Keine Auswertung"}}${{codeInfo}}`;
          }} catch (err) {{
            result.innerHTML = "<span class='badge badge-fail'>fail</span> Query-Server nicht erreichbar. Starte: start_control_center.bat (oder python scripts/control_query_server.py)";
          }}
        }});
      }});

      const stateEl = document.getElementById("query-server-state");
      const checkServerBtn = document.getElementById("check-query-server-btn");
      async function refreshServerState() {{
        if (!stateEl) return;
        stateEl.innerHTML = "<span class='badge badge-warn'>checking</span> Query-Server Verbindungsstatus wird geprueft...";
        try {{
          const res = await fetch("http://127.0.0.1:8765/health", {{ method: "GET" }});
          if (res.ok) {{
            stateEl.innerHTML = "<span class='badge badge-ok'>online</span> Query-Server erreichbar (127.0.0.1:8765).";
            return;
          }}
        }} catch (err) {{
        }}
        stateEl.innerHTML = "<span class='badge badge-fail'>offline</span> Query-Server nicht erreichbar. Starte: <code>start_control_center.bat</code>";
      }}

      if (checkServerBtn) {{
        checkServerBtn.addEventListener("click", refreshServerState);
      }}
    }})();
  </script>
</body>
</html>
"""

    OUTPUT_PATH.write_text(html, encoding="utf-8")
    print(f"Kontrollseite erzeugt: {OUTPUT_PATH}")


if __name__ == "__main__":
    build()
