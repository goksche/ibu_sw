# utils/exporter.py
# v0.9.3 – Exporte (CSV/PDF) ohne externe Abhängigkeiten + Settings-Exportordner
from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Sequence, Tuple

from PyQt6.QtGui import QTextDocument, QPageSize, QPageLayout
from PyQt6.QtPrintSupport import QPrinter
from PyQt6.QtCore import QMarginsF

from utils.settings import get_export_dir  # Settings-Integration

# Datenmodell-Funktionen
from database.models import (
    _connect,
    compute_meisterschaft_rangliste,
    fetch_meisterschaften,
    fetch_turniere,
    fetch_turnier_teilnehmer,
    fetch_groups,
    fetch_group_matches,
    compute_group_table,
    fetch_ko_rounds,
    fetch_ko_matches,
    ensure_bronze_from_semis,
    fetch_ko_champion,
)

# Anzeige/Branding
APP_NAME = "IBU Turniere"
APP_VERSION = "v0.9.2"  # in den Export-Fußzeilen

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def ensure_exports_dir() -> str:
    """Liest das Export-Verzeichnis aus den Settings und stellt es sicher."""
    base = get_export_dir()
    os.makedirs(base, exist_ok=True)
    return base

def timestamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M")

def unique_path(base_dir: str, base_name: str, ext: str) -> str:
    path = os.path.join(base_dir, f"{base_name}.{ext}")
    if not os.path.exists(path):
        return path
    i = 1
    while True:
        p = os.path.join(base_dir, f"{base_name}__{i}.{ext}")
        if not os.path.exists(p):
            return p
        i += 1

def _csv_writer(path: str):
    fh = open(path, "w", encoding="utf-8-sig", newline="")
    writer = csv.writer(fh, delimiter=";", lineterminator="\r\n")
    return fh, writer

def save_csv(rows: Sequence[Sequence[object]], header: Sequence[str], path: str) -> str:
    fh, writer = _csv_writer(path)
    try:
        writer.writerow(list(header))
        for r in rows:
            writer.writerow([("" if v is None else v) for v in r])
    finally:
        fh.close()
    return path

def save_pdf_from_html(html: str, path: str, orientation: str = "portrait") -> str:
    printer = QPrinter(QPrinter.PrinterMode.HighResolution)
    printer.setOutputFormat(QPrinter.OutputFormat.PdfFormat)
    printer.setOutputFileName(path)

    page_size = QPageSize(QPageSize.PageSizeId.A4)
    orient = QPageLayout.Orientation.Landscape if orientation == "landscape" else QPageLayout.Orientation.Portrait
    layout = QPageLayout(page_size, orient, QMarginsF(12, 12, 12, 12), QPageLayout.Unit.Millimeter)
    printer.setPageLayout(layout)

    doc = QTextDocument()
    doc.setHtml(html)
    doc.print(printer)
    return path

def _css_base() -> str:
    return """
    <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; }
    h1 { font-size: 18pt; margin: 0 0 6pt 0; }
    h2 { font-size: 14pt; margin: 12pt 0 6pt 0; }
    .meta { color: #666; font-size: 9pt; margin-bottom: 8pt; }
    table { border-collapse: collapse; width: 100%; }
    thead th { background: #f0f0f0; }
    th, td { border: 1px solid #ccc; padding: 4pt 6pt; text-align: left; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .foot { color:#666; font-size:8pt; margin-top:8pt; }
    .warn { color:#b00; font-size: 10pt; margin-bottom: 6pt; }
    </style>
    """

def _html_wrap(title: str, intro_lines: Sequence[str], table_html_blocks: Sequence[str]) -> str:
    intro = "".join(f"<div class='meta'>{line}</div>" for line in intro_lines)
    tables = "".join(table_html_blocks)
    return f"""
    <html>
    <head>
    <meta charset="utf-8" />
    {_css_base()}
    </head>
    <body>
      <h1>{title}</h1>
      {intro}
      {tables}
      <div class="foot">Exportiert am {datetime.now().strftime("%d.%m.%Y %H:%M")} – {APP_NAME} {APP_VERSION}</div>
    </body>
    </html>
    """

def _html_table(headers: Sequence[str], rows: Sequence[Sequence[object]], caption: Optional[str] = None) -> str:
    thead = "".join(f"<th>{h}</th>" for h in headers)
    body_rows = []
    for r in rows:
        tds = "".join(f"<td>{'' if v is None else v}</td>" for v in r)
        body_rows.append(f"<tr>{tds}</tr>")
    caption_html = f"<h2>{caption}</h2>" if caption else ""
    return f"""
      {caption_html}
      <table>
        <thead><tr>{thead}</tr></thead>
        <tbody>
          {''.join(body_rows)}
        </tbody>
      </table>
    """

# --------------------- Meisterschaft – Rangliste -----------------------

def _ms_name(ms_id: int) -> Tuple[str, str]:
    for mid, name, saison, _schema in fetch_meisterschaften():
        if int(mid) == int(ms_id):
            return str(name or ""), str(saison or "")
    with _connect() as con:
        r = con.execute("SELECT name, COALESCE(saison,'') FROM meisterschaften WHERE id=?", (ms_id,)).fetchone()
        if r:
            return str(r[0] or ""), str(r[1] or "")
    return (f"MS-{ms_id}", "")

def export_meisterschaft_rangliste_csv(ms_id: int, path: Optional[str] = None) -> str:
    rows = compute_meisterschaft_rangliste(ms_id)
    header = ["Rang", "Spieler", "Punkte gesamt", "Turniere", "Beste Platzierung", "Letztes Turnierdatum"]
    csv_rows: List[List[object]] = []
    for r in rows:
        csv_rows.append([
            r.get("rank", ""),
            r.get("name", ""),
            r.get("punkte", 0),
            r.get("turniere", 0),
            ("" if r.get("beste_platzierung") in (None, 0) else r.get("beste_platzierung")),
            r.get("letztes_datum", ""),
        ])
    base_dir = ensure_exports_dir()
    ms_name, saison = _ms_name(ms_id)
    base_name = f"rangliste__{(ms_name or ('MS-' + str(ms_id))).replace(' ', '-')}"
    if saison:
        base_name += f"-{saison}"
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "csv")
    return save_csv(csv_rows, header, final_path)

def export_meisterschaft_rangliste_pdf(ms_id: int, path: Optional[str] = None) -> str:
    rows = compute_meisterschaft_rangliste(ms_id)
    headers = ["Rang", "Spieler", "Punkte gesamt", "Turniere", "Beste Platzierung", "Letztes Turnierdatum"]
    table_rows: List[List[object]] = []
    for r in rows:
        table_rows.append([
            r.get("rank", ""),
            r.get("name", ""),
            r.get("punkte", 0),
            r.get("turniere", 0),
            ("" if r.get("beste_platzierung") in (None, 0) else r.get("beste_platzierung")),
            r.get("letztes_datum", ""),
        ])
    ms_name, saison = _ms_name(ms_id)
    intro = [
        f"Meisterschaft: <b>{ms_name}</b>" + (f" (Saison {saison})" if saison else ""),
        "Punkteschema: 1=30, 2=24, 3=18, 4=15, ab 5=5 (Default, sofern nicht überschrieben).",
    ]
    html = _html_wrap("Meisterschaft – Rangliste", intro, [
        _html_table(headers, table_rows),
    ])
    base_dir = ensure_exports_dir()
    base_name = f"rangliste__{(ms_name or ('MS-' + str(ms_id))).replace(' ', '-')}"
    if saison:
        base_name += f"-{saison}"
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "pdf")
    return save_pdf_from_html(html, final_path, orientation="portrait")

# --------------------------- Turnier-Stammdaten ------------------------

@dataclass
class _TurnierInfo:
    id: int
    name: str
    datum: str

def _turnier_info(turnier_id: int) -> _TurnierInfo:
    for tid, name, datum, _modus, _ms in fetch_turniere():
        if int(tid) == int(turnier_id):
            return _TurnierInfo(int(tid), str(name or ""), str(datum or ""))
    with _connect() as con:
        r = con.execute("SELECT name, COALESCE(datum,'') FROM turniere WHERE id=?", (turnier_id,)).fetchone()
        if r:
            return _TurnierInfo(int(turnier_id), str(r[0] or ""), str(r[1] or ""))
    return _TurnierInfo(int(turnier_id), f"Turnier-{turnier_id}", "")

# ----------------------- Turnier – Teilnehmerliste ---------------------

def export_turnier_teilnehmer_csv(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    teilnehmer = fetch_turnier_teilnehmer(turnier_id)
    teilnehmer_sorted = sorted(teilnehmer, key=lambda x: (x[1] or "").lower())

    header = ["#", "Teilnehmer-ID", "Spieler"]
    rows: List[List[object]] = []
    for i, (pid, name) in enumerate(teilnehmer_sorted, start=1):
        rows.append([i, pid, name])

    base_dir = ensure_exports_dir()
    base_name = f"turnier-teilnehmer__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "csv")
    return save_csv(rows, header, final_path)

def export_turnier_teilnehmer_pdf(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    teilnehmer = fetch_turnier_teilnehmer(turnier_id)
    teilnehmer_sorted = sorted(teilnehmer, key=lambda x: (x[1] or "").lower())

    headers = ["#", "Teilnehmer-ID", "Spieler"]
    rows: List[List[object]] = []
    for i, (pid, name) in enumerate(teilnehmer_sorted, start=1):
        rows.append([i, pid, name])

    intro = [f"Turnier: <b>{info.name}</b>" + (f" ({info.datum})" if info.datum else "")]
    html = _html_wrap("Teilnehmerliste", intro, [
        _html_table(headers, rows)
    ])
    base_dir = ensure_exports_dir()
    base_name = f"turnier-teilnehmer__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "pdf")
    return save_pdf_from_html(html, final_path, orientation="portrait")

# ----------------------- Turnier – Gruppen: Spielplan ------------------

def export_gruppen_spielplan_csv(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    groups = fetch_groups(turnier_id)
    header = ["Gruppe", "Runde", "Match", "Spieler 1", "Spieler 2", "S1", "S2"]
    rows: List[List[object]] = []

    if not groups:
        rows.append(["-", "-", "-", "-", "-", "", ""])

    for gid, gname in groups:
        matches = fetch_group_matches(turnier_id, gid)
        for _mid, runde, match_no, n1, n2, s1, s2 in matches:
            rows.append([gname, runde, match_no, n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])

    base_dir = ensure_exports_dir()
    base_name = f"gruppen-spielplan__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "csv")
    return save_csv(rows, header, final_path)

def export_gruppen_spielplan_pdf(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    groups = fetch_groups(turnier_id)

    blocks: List[str] = []
    if not groups:
        blocks.append("<div class='warn'>Keine Gruppen vorhanden.</div>")

    for gid, gname in groups:
        matches = fetch_group_matches(turnier_id, gid)
        headers = ["Runde", "Match", "Spieler 1", "Spieler 2", "S1", "S2"]
        rows: List[List[object]] = []
        for _mid, runde, match_no, n1, n2, s1, s2 in matches:
            rows.append([runde, match_no, n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])
        blocks.append(_html_table(headers, rows, caption=f"Gruppe {gname}"))

    intro = [f"Turnier: <b>{info.name}</b>" + (f" ({info.datum})" if info.datum else "")]
    html = _html_wrap("Gruppen – Spielplan", intro, blocks)
    base_dir = ensure_exports_dir()
    base_name = f"gruppen-spielplan__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "pdf")
    return save_pdf_from_html(html, final_path, orientation="portrait")

# ----------------------- Turnier – Gruppen: Tabellen -------------------

def export_gruppen_tabellen_csv(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    groups = fetch_groups(turnier_id)
    header = ["Gruppe", "Rang", "Spieler", "Spiele", "Siege", "Niederlagen", "Legs für", "Legs gegen", "Differenz", "Punkte"]
    rows: List[List[object]] = []

    if not groups:
        rows.append(["-", "-", "-", "-", "-", "-", "-", "-", "-", ""])

    for gid, gname in groups:
        table = compute_group_table(turnier_id, gid)
        if not table:
            rows.append([gname, "-", "-", "-", "-", "-", "-", "-", "-", "-"])
            continue
        rank = 0
        last_key = None
        for t in table:
            key = (int(t["pkt"]), int(t["diff"]), int(t["lf"]))
            if key != last_key:
                rank += 1
                last_key = key
            rows.append([gname, rank, t["spieler"], t["spiele"], t["siege"], t["niederlagen"], t["lf"], t["la"], t["diff"], t["pkt"]])

    base_dir = ensure_exports_dir()
    base_name = f"gruppen-tabellen__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "csv")
    return save_csv(rows, header, final_path)

def export_gruppen_tabellen_pdf(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    groups = fetch_groups(turnier_id)

    blocks: List[str] = []
    if not groups:
        blocks.append("<div class='warn'>Keine Gruppen vorhanden.</div>")

    for gid, gname in groups:
        table = compute_group_table(turnier_id, gid)
        headers = ["Rang", "Spieler", "Spiele", "Siege", "Niederlagen", "Legs für", "Legs gegen", "Differenz", "Punkte"]
        rows: List[List[object]] = []
        if not table:
            rows.append(["-", "-", "-", "-", "-", "-", "-", "-", "-"])
        else:
            rank = 0
            last_key = None
            for t in table:
                key = (int(t["pkt"]), int(t["diff"]), int(t["lf"]))
                if key != last_key:
                    rank += 1
                    last_key = key
                rows.append([rank, t["spieler"], t["spiele"], t["siege"], t["niederlagen"], t["lf"], t["la"], t["diff"], t["pkt"]])
        blocks.append(_html_table(headers, rows, caption=f"Gruppe {gname}"))

    intro = [f"Turnier: <b>{info.name}</b>" + (f" ({info.datum})" if info.datum else "")]
    html = _html_wrap("Gruppen – Tabellen", intro, blocks)
    base_dir = ensure_exports_dir()
    base_name = f"gruppen-tabellen__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "pdf")
    return save_pdf_from_html(html, final_path, orientation="portrait")

# ----------------------- Turnier – KO-Übersicht -----------------------

def _ko_round_label_from_match_count(count: int) -> str:
    if count == 1: return "Finale"
    if count == 2: return "Halbfinale"
    if count == 4: return "Viertelfinale"
    if count == 8: return "Achtelfinale"
    if count == 16: return "Sechzehntelfinale"
    return "Runde"

def _ko_rounds_with_counts(turnier_id: int) -> List[Tuple[int, int]]:
    rounds = fetch_ko_rounds(turnier_id)
    out: List[Tuple[int, int]] = []
    for r in rounds:
        matches = fetch_ko_matches(turnier_id, r)
        out.append((r, len(matches)))
    ensure_bronze_from_semis(turnier_id)
    if 99 not in [r for r, _ in out]:
        bron = fetch_ko_matches(turnier_id, 99)
        if bron:
            out.append((99, len(bron)))
    non_bronze = [(r, c) for r, c in out if r != 99]
    non_bronze.sort(key=lambda x: x[0])
    bronze = [(r, c) for r, c in out if r == 99]
    return non_bronze + bronze

def export_ko_csv(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    header = ["Runde", "Match", "Spieler 1", "Spieler 2", "S1", "S2"]
    rows: List[List[object]] = []

    rounds = _ko_rounds_with_counts(turnier_id)
    if not rounds:
        rows.append(["-", "-", "-", "-", "", ""])

    for r, cnt in rounds:
        matches = fetch_ko_matches(turnier_id, r)
        rname = "Bronze" if r == 99 else _ko_round_label_from_match_count(cnt)
        for _id, match_no, n1, n2, s1, s2 in matches:
            rows.append([rname, match_no, n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])

    champ = fetch_ko_champion(turnier_id)
    if champ:
        rows.append(["Champion", "-", champ[1], "", "", ""])
    bron = fetch_ko_matches(turnier_id, 99)
    if bron and bron[0][4] is not None and bron[0][5] is not None and bron[0][4] != bron[0][5]:
        p1 = bron[0][2]; p2 = bron[0][3]; s1 = bron[0][4]; s2 = bron[0][5]
        third = p1 if int(s1) > int(s2) else p2
        rows.append(["Platz 3", "-", third, "", "", ""])

    base_dir = ensure_exports_dir()
    base_name = f"ko-uebersicht__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "csv")
    return save_csv(rows, header, final_path)

def export_ko_pdf(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    rounds = _ko_rounds_with_counts(turnier_id)

    blocks: List[str] = []
    if not rounds:
        blocks.append("<div class='warn'>Keine KO-Spiele vorhanden.</div>")

    for r, cnt in rounds:
        matches = fetch_ko_matches(turnier_id, r)
        headers = ["Match", "Spieler 1", "Spieler 2", "S1", "S2"]
        rows: List[List[object]] = []
        for _id, match_no, n1, n2, s1, s2 in matches:
            rows.append([match_no, n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])
        caption = "Bronze" if r == 99 else _ko_round_label_from_match_count(cnt)
        blocks.append(_html_table(headers, rows, caption=caption))

    champ = fetch_ko_champion(turnier_id)
    if champ:
        blocks.append(f"<div class='meta'><b>Champion:</b> {champ[1]}</div>")
    bron = fetch_ko_matches(turnier_id, 99)
    if bron and bron[0][4] is not None and bron[0][5] is not None and bron[0][4] != bron[0][5]:
        p1 = bron[0][2]; p2 = bron[0][3]; s1 = bron[0][4]; s2 = bron[0][5]
        third = p1 if int(s1) > int(s2) else p2
        blocks.append(f"<div class='meta'><b>Platz 3:</b> {third}</div>")

    intro = [f"Turnier: <b>{info.name}</b>" + (f" ({info.datum})" if info.datum else "")]
    html = _html_wrap("KO – Übersicht", intro, blocks)
    base_dir = ensure_exports_dir()
    base_name = f"ko-uebersicht__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "pdf")
    return save_pdf_from_html(html, final_path, orientation="portrait")

# ------------------ Turnier – Ergebnis-Übersicht (flach) ---------------

def export_turnier_uebersicht_csv(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    header = ["Phase", "Gruppe/Runde", "Runde/Match", "Spieler 1", "Spieler 2", "S1", "S2"]
    rows: List[List[object]] = []

    groups = fetch_groups(turnier_id)
    for gid, gname in groups:
        matches = fetch_group_matches(turnier_id, gid)
        for _mid, runde, match_no, n1, n2, s1, s2 in matches:
            rows.append(["Gruppenphase", gname, f"{runde}/{match_no}", n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])

    rounds = _ko_rounds_with_counts(turnier_id)
    for r, cnt in rounds:
        rname = "Bronze" if r == 99 else _ko_round_label_from_match_count(cnt)
        matches = fetch_ko_matches(turnier_id, r)
        for _id, match_no, n1, n2, s1, s2 in matches:
            rows.append(["KO-Phase", rname, match_no, n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])

    if not rows:
        rows.append(["-", "-", "-", "-", "-", "", ""])

    base_dir = ensure_exports_dir()
    base_name = f"turnier-uebersicht__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "csv")
    return save_csv(rows, header, final_path)

def export_turnier_uebersicht_pdf(turnier_id: int, path: Optional[str] = None) -> str:
    info = _turnier_info(turnier_id)
    blocks: List[str] = []

    groups = fetch_groups(turnier_id)
    if groups:
        g_rows: List[List[object]] = []
        for gid, gname in groups:
            matches = fetch_group_matches(turnier_id, gid)
            for _mid, runde, match_no, n1, n2, s1, s2 in matches:
                g_rows.append([gname, f"{runde}/{match_no}", n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])
        blocks.append(_html_table(["Gruppe", "Runde/Match", "Spieler 1", "Spieler 2", "S1", "S2"], g_rows, caption="Gruppenphase"))
    else:
        blocks.append("<div class='warn'>Keine Gruppenspiele vorhanden.</div>")

    rounds = _ko_rounds_with_counts(turnier_id)
    if rounds:
        k_rows: List[List[object]] = []
        for r, cnt in rounds:
            rname = "Bronze" if r == 99 else _ko_round_label_from_match_count(cnt)
            matches = fetch_ko_matches(turnier_id, r)
            for _id, match_no, n1, n2, s1, s2 in matches:
                k_rows.append([rname, match_no, n1, n2, "" if s1 is None else s1, "" if s2 is None else s2])
        blocks.append(_html_table(["Runde", "Match", "Spieler 1", "Spieler 2", "S1", "S2"], k_rows, caption="KO-Phase"))
    else:
        blocks.append("<div class='warn'>Keine KO-Spiele vorhanden.</div>")

    intro = [f"Turnier: <b>{info.name}</b>" + (f" ({info.datum})" if info.datum else "")]
    html = _html_wrap("Ergebnis-Übersicht", intro, blocks)
    base_dir = ensure_exports_dir()
    base_name = f"turnier-uebersicht__{info.name.replace(' ', '-')}" + (f"-{info.datum}" if info.datum else "")
    base_name += f"__{timestamp()}"
    final_path = path or unique_path(base_dir, base_name, "pdf")
    return save_pdf_from_html(html, final_path, orientation="portrait")
