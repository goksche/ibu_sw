# Deploy statische gsmartsol.ch-Dateien und Nginx-Locations nach Server C (157.173.114.105).
# Voraussetzung: SSH-Key fuer root@157.173.114.105
$ErrorActionPreference = "Stop"
$Server = "root@157.173.114.105"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Www = Join-Path $RepoRoot "nginx\gsmartsol-www"

ssh $Server "mkdir -p /opt/gsmartsol-www && chmod 755 /opt/gsmartsol-www"
scp "$Www\index.html" "$Www\3d-druck-kalkulator.html" "$Www\patch_nginx.py" "${Server}:/opt/gsmartsol-www/"

ssh $Server 'cp -a /etc/nginx/sites-available/gsmartsol.ch /etc/nginx/sites-available/gsmartsol.ch.bak_deploy_$(date +%Y%m%d%H%M%S) && python3 /opt/gsmartsol-www/patch_nginx.py && nginx -t && nginx -s reload && echo OK'

Write-Host "--- curl auf Server (127.0.0.1, Host-Header gsmartsol.ch) ---"
ssh $Server 'curl -sI https://127.0.0.1/ -H "Host: gsmartsol.ch" -k | head -8'
ssh $Server 'curl -sI https://127.0.0.1/3d-druck-kalkulator.html -H "Host: gsmartsol.ch" -k | head -8'
