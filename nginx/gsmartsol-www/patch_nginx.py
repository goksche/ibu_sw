#!/usr/bin/env python3
"""Insert exact location blocks for / and /3d-druck-kalkulator.html into gsmartsol.ch HTTPS server."""
import pathlib

CFG = pathlib.Path("/etc/nginx/sites-available/gsmartsol.ch")
text = CFG.read_text(encoding="utf-8")
marker = "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot"
insert = """    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location = /3d-druck-kalkulator.html {
        root /opt/gsmartsol-www;
        try_files /3d-druck-kalkulator.html =404;
    }

    location = / {
        root /opt/gsmartsol-www;
        try_files /index.html =404;
    }"""
if "location = /3d-druck-kalkulator.html" in text:
    print("nginx: locations already present")
elif marker not in text:
    raise SystemExit("marker ssl_dhparam not found")
else:
    CFG.write_text(text.replace(marker, insert, 1), encoding="utf-8")
    print("nginx: patched OK")
