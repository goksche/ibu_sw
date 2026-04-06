"""Logo aus gsmartsol-3d-prints-logo.* als Data-URI in index + Kalkulator einbetten (ohne Nginx-Static)."""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1] / "nginx" / "gsmartsol-www"
IMG = ROOT / "gsmartsol-3d-prints-logo.png"
if not IMG.is_file():
    raise SystemExit(f"Fehlt: {IMG}")

raw = IMG.read_bytes()
if raw[:2] == b"\xff\xd8":
    mime = "image/jpeg"
elif raw[:8] == b"\x89PNG\r\n\x1a\n":
    mime = "image/png"
else:
    mime = "application/octet-stream"

DATA = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
NEW_SRC = f'src="{DATA}"'

for name in ("3d-druck-kalkulator.html", "index.html"):
    p = ROOT / name
    html = p.read_text(encoding="utf-8")
    # Ersetze vorhandenes data:-Logo oder Datei-Pfad
    m = re.search(r'<img\s+([^>]*\s)?src="[^"]+"', html)
    if not m:
        raise SystemExit(f"{name}: kein <img mit src gefunden")
    html = re.sub(
        r'(<img\s[^>]*\s)src="[^"]+"',
        r"\1" + NEW_SRC,
        html,
        count=1,
    )
    p.write_text(html, encoding="utf-8")
    print("OK", name, "bytes", len(html))
