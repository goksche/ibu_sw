from pathlib import Path

root = Path(__file__).resolve().parents[1]
j = (root / "nginx/landing/strings.json").read_text(encoding="utf-8")
html_path = root / "nginx/landing/index.html"
html = html_path.read_text(encoding="utf-8")
if "landing-i18n-embed" in html:
    print("already embedded")
    raise SystemExit(0)
embed = (
    '  <script type="application/json" id="landing-i18n-embed">\n'
    + j.strip()
    + "\n  </script>\n\n"
)
if "<body>\r\n" in html:
    html = html.replace("<body>\r\n", "<body>\r\n\r\n" + embed, 1)
else:
    html = html.replace("<body>\n", "<body>\n\n" + embed, 1)
html_path.write_text(html, encoding="utf-8")
print("embedded ok")
