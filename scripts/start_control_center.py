from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUILD_SCRIPT = ROOT / "scripts" / "build_control_page.py"
SERVER_SCRIPT = ROOT / "scripts" / "control_query_server.py"
HEALTH_URL = "http://127.0.0.1:8765/health"
HOME_URL = "http://127.0.0.1:8765/"


def is_server_up(timeout: float = 1.0) -> bool:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def stop_server_if_running() -> None:
    if not is_server_up():
        return
    try:
        req = urllib.request.Request("http://127.0.0.1:8765/api/shutdown", method="POST", data=b"{}")
        urllib.request.urlopen(req, timeout=1.5).read()
    except Exception:
        pass
    deadline = time.time() + 3.0
    while time.time() < deadline:
        if not is_server_up(timeout=0.8):
            break
        time.sleep(0.15)


def build_page() -> None:
    subprocess.run([sys.executable, str(BUILD_SCRIPT)], check=True, cwd=str(ROOT))


def start_server_if_needed() -> None:
    if is_server_up():
        return
    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
    subprocess.Popen(  # noqa: S603
        [sys.executable, str(SERVER_SCRIPT)],
        cwd=str(ROOT),
        creationflags=creationflags,
    )


def wait_for_server(max_wait_s: float = 8.0) -> bool:
    deadline = time.time() + max_wait_s
    while time.time() < deadline:
        if is_server_up(timeout=1.0):
            return True
        time.sleep(0.25)
    return False


def main() -> int:
    try:
        build_page()
    except subprocess.CalledProcessError as exc:
        print(f"[FEHLER] build_control_page.py fehlgeschlagen (exit={exc.returncode}).")
        return 1

    stop_server_if_running()
    start_server_if_needed()
    if not wait_for_server():
        print("[FEHLER] Query-Server konnte nicht gestartet werden.")
        print(f"[HINWEIS] Starte manuell: {sys.executable} {SERVER_SCRIPT}")
        return 1

    print("[OK] Query-Server laeuft. Oeffne Control Center...")
    webbrowser.open(HOME_URL)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
