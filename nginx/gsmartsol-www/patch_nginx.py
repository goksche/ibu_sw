#!/usr/bin/env python3
"""
Insert location blocks for gsmartsol.ch static files (HTTPS server):
  - /3d-druck-kalkulator.html
  - /gsmartsol-3d-prints-logo.png
  - /
"""
import pathlib

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

ROOT_ONLY = """    location = / {
        root /opt/gsmartsol-www;
        try_files /index.html =404;
    }"""

ROOT_WITH_LOGO = LOGO_LOC + """

""" + ROOT_ONLY

changed = False

if "location = /gsmartsol-3d-prints-logo.png" in text:
    print("nginx: logo location already present")
elif marker in text:
    text = text.replace(marker, insert, 1)
    changed = True
    print("nginx: patched OK (index + calculator + logo)")
elif ROOT_ONLY in text and "location = /3d-druck-kalkulator.html" in text:
    text = text.replace(ROOT_ONLY, ROOT_WITH_LOGO, 1)
    changed = True
    print("nginx: inserted logo location (before location = /)")
elif CALC in text:
    text = text.replace(CALC, CALC + "\n\n" + LOGO_LOC, 1)
    changed = True
    print("nginx: inserted logo location (after calculator)")
else:
    raise SystemExit("Cannot patch gsmartsol.ch: no Certbot marker and no known calculator block")

if changed:
    CFG.write_text(text, encoding="utf-8")
