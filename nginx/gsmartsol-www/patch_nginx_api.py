#!/usr/bin/env python3
"""
Fügt in gsmartsol.ch (HTTPS) einen proxy_pass für /api/ -> 127.0.0.1:8001 ein
(gmartsol-api Docker auf Server C). Idempotent.
"""
import pathlib
import sys

CFG = pathlib.Path("/etc/nginx/sites-available/gsmartsol.ch")
text = CFG.read_text(encoding="utf-8")

API_BLOCK = """    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""

if "location /api/" in text:
    print("nginx: /api/ proxy already present")
    sys.exit(0)

marker = "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot"
if marker in text:
    text = text.replace(marker, marker + "\n\n" + API_BLOCK, 1)
    CFG.write_text(text, encoding="utf-8")
    print("nginx: inserted /api/ proxy after Certbot marker")
    sys.exit(0)

# Fallback: vor erstem "location = /3d-druck-kalkulator"
needle = "    location = /3d-druck-kalkulator.html {"
if needle in text:
    text = text.replace(needle, API_BLOCK + "\n\n" + needle, 1)
    CFG.write_text(text, encoding="utf-8")
    print("nginx: inserted /api/ proxy before calculator location")
    sys.exit(0)

print("nginx: ERROR — cannot find insertion point for /api/ proxy", file=sys.stderr)
sys.exit(1)
