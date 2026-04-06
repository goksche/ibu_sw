from __future__ import annotations

import json
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


HOST = "127.0.0.1"
PORT = 8765
REPO_ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = REPO_ROOT / "docs" / "control_center.html"


SSH_OPTS = "-o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new"


def _backend_http_probe_cmd(path: str) -> str:
    return (
        "cd /root/ibu_sw && "
        "docker compose -f docker-compose.prod.yml --env-file .env.prod "
        "exec -T backend python -c "
        f"\\\"import urllib.request;print('HTTP',urllib.request.urlopen('http://127.0.0.1:8000{path}',timeout=8).status)\\\""
    )


COMMANDS: dict[str, dict[str, str]] = {
    "server-a": {
        "compose_ps": f"ssh {SSH_OPTS} root@144.91.103.103 \"cd /root/ibu_sw && docker compose -f docker-compose.prod.yml --env-file .env.prod ps\"",
        "health": f"ssh {SSH_OPTS} root@144.91.103.103 \"{_backend_http_probe_cmd('/health')}\"",
        "api": f"ssh {SSH_OPTS} root@144.91.103.103 \"{_backend_http_probe_cmd('/openapi.json')}\"",
    },
    "server-b": {
        "compose_ps": f"ssh {SSH_OPTS} root@95.111.238.180 \"cd /root/ibu_sw && docker compose -f docker-compose.prod.yml --env-file .env.prod ps\"",
        "health": f"ssh {SSH_OPTS} root@95.111.238.180 \"{_backend_http_probe_cmd('/health')}\"",
        "api": f"ssh {SSH_OPTS} root@95.111.238.180 \"{_backend_http_probe_cmd('/openapi.json')}\"",
    },
}


def evaluate_output(query_type: str, output: str) -> tuple[str, str]:
    normalized = (output or "").lower()
    if not normalized.strip():
        return "warn", "Keine Ausgabe empfangen."

    if "permission denied" in normalized or "batchmode" in normalized or "publickey" in normalized:
        return "fail", "SSH-Authentifizierung fehlgeschlagen (Key/Passwort noetig)."
    if "connection timed out" in normalized or "could not resolve hostname" in normalized:
        return "fail", "SSH-Verbindung fehlgeschlagen (Timeout/Host)."
    if "command not found" in normalized or "curl/wget fehlt" in normalized:
        return "fail", "Remote-Kommando fehlt auf Server."
    if "docker compose" in normalized and ("not found" in normalized or "unknown command" in normalized):
        return "fail", "Docker Compose auf Server nicht verfuegbar."

    if query_type == "compose_ps":
        if "exit " in normalized or "restarting" in normalized:
            return "fail", "Containerproblem erkannt (Exit/Restarting)."
        if " up " in normalized or "running" in normalized:
            return "ok", "Containerstatus sieht gesund aus."
        return "warn", "Containerstatus nicht eindeutig."

    if "502" in normalized:
        return "fail", "502 Bad Gateway erkannt."
    if (
        ("http/" in normalized and any(code in normalized for code in (" 200", " 301", " 302")))
        or ("http 200" in normalized)
    ):
        return "ok", "HTTP-Status ok (200/301/302)."
    if (
        ("http/" in normalized and any(code in normalized for code in (" 400", " 401", " 403", " 404", " 500", " 503")))
        or any(code in normalized for code in ("http 400", "http 401", "http 403", "http 404", "http 500", "http 503"))
    ):
        return "fail", "HTTP-Fehler erkannt (4xx/5xx)."
    return "warn", "Kein klarer HTTP-Status erkannt."


class Handler(BaseHTTPRequestHandler):
    server_version = "ControlQueryServer/1.0"

    def _set_headers(self, status: int, content_type: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._set_headers(204)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/":
            if not HTML_PATH.exists():
                self._set_headers(404, "text/plain; charset=utf-8")
                self.wfile.write(b"control_center.html nicht gefunden.")
                return
            self._set_headers(200, "text/html; charset=utf-8")
            self.wfile.write(HTML_PATH.read_bytes())
            return

        if path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "not_found"}).encode("utf-8"))

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/shutdown":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "stopping"}).encode("utf-8"))
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return

        if path != "/api/run":
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "not_found"}).encode("utf-8"))
            return

        try:
            raw_len = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(raw_len).decode("utf-8") if raw_len else "{}"
            payload = json.loads(raw)
        except Exception:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "invalid_json"}).encode("utf-8"))
            return

        server = str(payload.get("server", "")).strip()
        query_type = str(payload.get("type", "")).strip()
        command = COMMANDS.get(server, {}).get(query_type)
        if not command:
            self._set_headers(400)
            self.wfile.write(
                json.dumps({"error": "invalid_query", "details": "Unbekannte Server-/Abfrage-Kombination"}).encode("utf-8")
            )
            return

        try:
            # Run command through native system shell (cmd on Windows).
            # This avoids dependency on powershell/pwsh binary names in PATH.
            proc = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
            combined = (proc.stdout or "") + ("\n" if proc.stdout and proc.stderr else "") + (proc.stderr or "")
            status, message = evaluate_output(query_type, combined)
            response = {
                "command": command,
                "returncode": proc.returncode,
                "stdout": proc.stdout or "",
                "stderr": proc.stderr or "",
                "status": status,
                "message": message,
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return
        except OSError as exc:
            self._set_headers(200)
            self.wfile.write(
                json.dumps(
                    {
                        "command": command,
                        "returncode": -1,
                        "stdout": "",
                        "stderr": str(exc),
                        "status": "fail",
                        "message": "Lokale Shell konnte Befehl nicht starten.",
                    }
                ).encode("utf-8")
            )
            return
        except subprocess.TimeoutExpired:
            self._set_headers(200)
            self.wfile.write(
                json.dumps(
                    {
                        "command": command,
                        "returncode": -1,
                        "stdout": "",
                        "stderr": "Timeout nach 35s. Moeglich: SSH fragt Passwort/Host-Key.",
                        "status": "warn",
                        "message": "Abfrage-Timeout. Pruefe SSH-Zugang (Key/Hostkey/Passwort).",
                    }
                ).encode("utf-8")
            )
            return


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Control Query Server laeuft auf http://{HOST}:{PORT}")
    print("Stoppen mit Ctrl+C")
    server.serve_forever()


if __name__ == "__main__":
    main()
