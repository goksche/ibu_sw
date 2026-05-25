#!/usr/bin/env python3
"""
Lokale Monitoring-Datenbank (SQLite) fuer Read-Only Serverchecks.

Features:
- Datenbankschema initialisieren
- Bericht aus JSON-Datei importieren
- Letzte Runs listen
- Details eines Runs anzeigen
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data/monitoring/monitoring.sqlite")


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    run_timestamp TEXT,
    timezone TEXT,
    overall_status TEXT,
    summary TEXT
);

CREATE TABLE IF NOT EXISTS server_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    server_key TEXT NOT NULL,
    server_name TEXT,
    status TEXT,
    cpu_usage_pct REAL,
    cpu_idle_pct REAL,
    load1 REAL,
    load5 REAL,
    load15 REAL,
    cores INTEGER,
    ram_used_mb REAL,
    ram_total_mb REAL,
    ram_used_pct REAL,
    swap_used_mb REAL,
    swap_total_mb REAL,
    network_rx_bps REAL,
    network_tx_bps REAL,
    vnstat_available INTEGER,
    docker_active INTEGER,
    sudo_nopasswd INTEGER,
    fail2ban_status TEXT,
    notes TEXT,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS top_processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_result_id INTEGER NOT NULL,
    rank_no INTEGER NOT NULL,
    pid INTEGER,
    process_name TEXT,
    cpu_pct REAL,
    mem_pct REAL,
    command TEXT,
    FOREIGN KEY (server_result_id) REFERENCES server_results(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_result_id INTEGER NOT NULL,
    category TEXT,
    severity TEXT,
    message TEXT NOT NULL,
    FOREIGN KEY (server_result_id) REFERENCES server_results(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    priority TEXT,
    recommendation TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS raw_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_result_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (server_result_id) REFERENCES server_results(id) ON DELETE CASCADE
);
"""


def _bool_to_int(value: Any) -> int | None:
    if value is None:
        return None
    return 1 if bool(value) else 0


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
    print(f"OK: Datenbank initialisiert: {db_path}")


def import_report(db_path: Path, report_path: Path) -> int:
    if not report_path.exists():
        raise FileNotFoundError(f"Report-Datei nicht gefunden: {report_path}")

    payload = json.loads(report_path.read_text(encoding="utf-8"))
    servers = payload.get("servers", [])
    recommendations = payload.get("recommendations", [])

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO runs (run_timestamp, timezone, overall_status, summary)
            VALUES (?, ?, ?, ?)
            """,
            (
                payload.get("run_timestamp"),
                payload.get("timezone"),
                payload.get("overall_status"),
                payload.get("summary"),
            ),
        )
        run_id = int(cur.lastrowid)

        for srv in servers:
            metrics = srv.get("metrics", {})
            cur.execute(
                """
                INSERT INTO server_results (
                    run_id, server_key, server_name, status,
                    cpu_usage_pct, cpu_idle_pct,
                    load1, load5, load15, cores,
                    ram_used_mb, ram_total_mb, ram_used_pct,
                    swap_used_mb, swap_total_mb,
                    network_rx_bps, network_tx_bps,
                    vnstat_available, docker_active, sudo_nopasswd,
                    fail2ban_status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    srv.get("server_key"),
                    srv.get("server_name"),
                    srv.get("status"),
                    metrics.get("cpu_usage_pct"),
                    metrics.get("cpu_idle_pct"),
                    metrics.get("load1"),
                    metrics.get("load5"),
                    metrics.get("load15"),
                    metrics.get("cores"),
                    metrics.get("ram_used_mb"),
                    metrics.get("ram_total_mb"),
                    metrics.get("ram_used_pct"),
                    metrics.get("swap_used_mb"),
                    metrics.get("swap_total_mb"),
                    metrics.get("network_rx_bps"),
                    metrics.get("network_tx_bps"),
                    _bool_to_int(metrics.get("vnstat_available")),
                    _bool_to_int(metrics.get("docker_active")),
                    _bool_to_int(metrics.get("sudo_nopasswd")),
                    metrics.get("fail2ban_status"),
                    srv.get("notes"),
                ),
            )
            server_result_id = int(cur.lastrowid)

            for proc in srv.get("top_processes", []):
                cur.execute(
                    """
                    INSERT INTO top_processes (
                        server_result_id, rank_no, pid, process_name, cpu_pct, mem_pct, command
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        server_result_id,
                        proc.get("rank"),
                        proc.get("pid"),
                        proc.get("process_name"),
                        proc.get("cpu_pct"),
                        proc.get("mem_pct"),
                        proc.get("command"),
                    ),
                )

            for finding in srv.get("findings", []):
                cur.execute(
                    """
                    INSERT INTO findings (server_result_id, category, severity, message)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        server_result_id,
                        finding.get("category"),
                        finding.get("severity"),
                        finding.get("message"),
                    ),
                )

            for source, content in srv.get("raw_data", {}).items():
                cur.execute(
                    """
                    INSERT INTO raw_data (server_result_id, source, content)
                    VALUES (?, ?, ?)
                    """,
                    (server_result_id, source, str(content)),
                )

        for rec in recommendations:
            cur.execute(
                """
                INSERT INTO recommendations (run_id, priority, recommendation, reason)
                VALUES (?, ?, ?, ?)
                """,
                (
                    run_id,
                    rec.get("priority"),
                    rec.get("recommendation"),
                    rec.get("reason"),
                ),
            )

        conn.commit()

    print(f"OK: Report importiert. run_id={run_id}")
    return run_id


def list_runs(db_path: Path, limit: int) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, created_at, run_timestamp, timezone, overall_status, summary
            FROM runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    if not rows:
        print("Keine Runs gefunden.")
        return

    print("Letzte Runs:")
    for row in rows:
        print(
            f"- run_id={row['id']} | status={row['overall_status']} | "
            f"run_timestamp={row['run_timestamp']} | created_at={row['created_at']} | "
            f"summary={row['summary'] or '-'}"
        )


def show_run(db_path: Path, run_id: int) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        run = conn.execute(
            "SELECT * FROM runs WHERE id = ?",
            (run_id,),
        ).fetchone()
        if run is None:
            print(f"Run nicht gefunden: {run_id}")
            return

        print(
            f"Run {run['id']} | status={run['overall_status']} | "
            f"run_timestamp={run['run_timestamp']} | timezone={run['timezone']}"
        )
        print(f"Summary: {run['summary'] or '-'}")

        servers = conn.execute(
            """
            SELECT * FROM server_results
            WHERE run_id = ?
            ORDER BY server_key
            """,
            (run_id,),
        ).fetchall()

        for srv in servers:
            print(
                f"\n[{srv['server_key']}] {srv['server_name']} | status={srv['status']} | "
                f"CPU={srv['cpu_usage_pct']}% | Load1={srv['load1']} | RAM%={srv['ram_used_pct']} | "
                f"Rx={srv['network_rx_bps']} B/s | Tx={srv['network_tx_bps']} B/s"
            )
            print(
                f"  Docker={srv['docker_active']} | sudo_nopasswd={srv['sudo_nopasswd']} | "
                f"fail2ban={srv['fail2ban_status']}"
            )
            if srv["notes"]:
                print(f"  Notes: {srv['notes']}")

            procs = conn.execute(
                """
                SELECT rank_no, pid, process_name, cpu_pct
                FROM top_processes
                WHERE server_result_id = ?
                ORDER BY rank_no
                """,
                (srv["id"],),
            ).fetchall()
            if procs:
                print("  Top Prozesse:")
                for p in procs:
                    print(
                        f"    {p['rank_no']}. pid={p['pid']} "
                        f"name={p['process_name']} cpu={p['cpu_pct']}%"
                    )

            findings = conn.execute(
                """
                SELECT category, severity, message
                FROM findings
                WHERE server_result_id = ?
                """,
                (srv["id"],),
            ).fetchall()
            if findings:
                print("  Findings:")
                for f in findings:
                    print(f"    - [{f['severity']}] ({f['category']}) {f['message']}")

        recs = conn.execute(
            """
            SELECT priority, recommendation, reason
            FROM recommendations
            WHERE run_id = ?
            ORDER BY id
            """,
            (run_id,),
        ).fetchall()

        if recs:
            print("\nEmpfehlungen:")
            for rec in recs:
                print(
                    f"- [{rec['priority']}] {rec['recommendation']}"
                    + (f" | Grund: {rec['reason']}" if rec["reason"] else "")
                )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lokale Monitoring SQLite Verwaltung")
    parser.add_argument(
        "--db",
        default=str(DEFAULT_DB),
        help=f"Pfad zur SQLite-Datei (Default: {DEFAULT_DB})",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Datenbank und Tabellen initialisieren")

    p_import = sub.add_parser("import-report", help="JSON-Bericht importieren")
    p_import.add_argument("report_file", help="Pfad zur JSON-Datei")

    p_list = sub.add_parser("list-runs", help="Letzte Runs anzeigen")
    p_list.add_argument("--limit", type=int, default=10, help="Maximale Anzahl Runs")

    p_show = sub.add_parser("show-run", help="Details eines Runs anzeigen")
    p_show.add_argument("run_id", type=int, help="Run-ID")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    db_path = Path(args.db)

    if args.command == "init":
        init_db(db_path)
    elif args.command == "import-report":
        init_db(db_path)
        import_report(db_path, Path(args.report_file))
    elif args.command == "list-runs":
        list_runs(db_path, args.limit)
    elif args.command == "show-run":
        show_run(db_path, args.run_id)
    else:
        parser.error("Unbekannter Befehl")


if __name__ == "__main__":
    main()

