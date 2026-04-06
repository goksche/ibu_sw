#!/usr/bin/env python3
"""
Insert location blocks for gsmartsol.ch static files (HTTPS server):
  - /3d-druck-kalkulator.html
  - /gsmartsol-3d-prints-logo.png
  - /

Reihenfolge: zuerst Duplikate von location = / entfernen, dann Logo ergänzen
oder (nur wenn noch kein Calculator-Block) den Certbot-Marker ersetzen.
"""
import pathlib
import sys

CFG = pathlib.Path("/etc/nginx/sites-available/gsmartsol.ch")
text = CFG.read_text(encoding="utf-8")

LOGO_LOC = """    location = /gsmartsol-3d-prints-logo.png {
        root /opt/gsmartsol-www;
        try_files /gsmartsol-3d-prints-logo.png =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }"""

CALC = """    location = /3d-druck-kalkulator.html {
        root /opt/gsmartsol-www;
        try_files /3d-druck-kalkulator.html =404;
    }"""

ROOT_ONLY = """    location = / {
        root /opt/gsmartsol-www;
        try_files /index.html =404;
    }"""

marker = "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot"
insert = """    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location = /3d-druck-kalkulator.html {
        root /opt/gsmartsol-www;
        try_files /3d-druck-kalkulator.html =404;
    }

""" + LOGO_LOC + """

    location = / {
        root /opt/gsmartsol-www;
        try_files /index.html =404;
    }"""

ROOT_WITH_LOGO = LOGO_LOC + """

""" + ROOT_ONLY

changed = False

# --- Self-heal: doppelte location-Blöcke (fehlerhafte frühere Patch-Läufe) ---
while text.count(CALC) > 1:
    last = text.rfind(CALC)
    text = text[:last].rstrip() + "\n" + text[last + len(CALC) :].lstrip("\n")
    changed = True
    print("nginx: removed duplicate location /3d-druck-kalkulator.html")

while text.count(ROOT_ONLY) > 1:
    last = text.rfind(ROOT_ONLY)
    text = text[:last].rstrip() + "\n" + text[last + len(ROOT_ONLY) :].lstrip("\n")
    changed = True
    print("nginx: removed duplicate location = /")

while text.count(LOGO_LOC) > 1:
    last = text.rfind(LOGO_LOC)
    text = text[:last].rstrip() + "\n" + text[last + len(LOGO_LOC) :].lstrip("\n")
    changed = True
    print("nginx: removed duplicate logo location")

# --- Logo fehlt, aber Rechner + Index schon da ---
if "location = /gsmartsol-3d-prints-logo.png" not in text and "location = /3d-druck-kalkulator.html" in text:
    if ROOT_ONLY in text:
        text = text.replace(ROOT_ONLY, ROOT_WITH_LOGO, 1)
        changed = True
        print("nginx: inserted logo location (before location = /)")
    elif CALC in text:
        text = text.replace(CALC, CALC + "\n\n" + LOGO_LOC, 1)
        changed = True
        print("nginx: inserted logo location (after calculator)")
    else:
        print("nginx: ERROR — calculator present but expected blocks not found", file=sys.stderr)
        sys.exit(1)

# --- Erstinstallation: nur wenn noch kein Calculator-Block ---
elif "location = /gsmartsol-3d-prints-logo.png" not in text and marker in text and "location = /3d-druck-kalkulator.html" not in text:
    text = text.replace(marker, insert, 1)
    changed = True
    print("nginx: patched OK (index + calculator + logo)")

elif "location = /gsmartsol-3d-prints-logo.png" in text:
    print("nginx: logo location already present")

else:
    print("nginx: ERROR — cannot patch (no marker, no calculator block)", file=sys.stderr)
    sys.exit(1)

if changed:
    CFG.write_text(text, encoding="utf-8")
