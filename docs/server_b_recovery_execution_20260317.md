# Server B Recovery Execution Report (2026-03-17)

## Scope

- Plan executed: `server-b-recovery-ausfuehrung-ohne-datenverlust_c1a233c3.plan.md`
- Target: Server B (`95.111.238.180`, `test.finalstage.ch`)
- Constraint respected: no changes on Server A.

## Phase 1 - Backup First

- Created snapshot directory on Server B:
  - `/root/recovery_snapshot_20260317_162058`
- Generated artifacts:
  - `ibu_sw.tar.gz`
  - `postgres_dump.sql`
  - `ssh_journal_7d.log`
  - `process_snapshot.txt`
  - `quarantine_incident_20260317.tar.gz`
  - `SHA256SUMS.txt`
- Local mirror started at:
  - `c:/Cursor/ibu_sw/backups/server_b_recovery_20260317_162058`
- Local mirror verification:
  - SHA256 comparison against `SHA256SUMS.txt` completed (`ALL_OK=True`).

## Phase 2 - Integrity + Restore Probe

- Isolated restore probe executed in temporary PostgreSQL container (`restore_probe_pg`).
- Import check:
  - `RESTORE_IMPORT_RC=0`
  - `RESTORE_CHECK_RC=0`
- Result: backup dump can be restored.

## Phase 3 - Hardening Baseline

- SSH hardening applied and validated:
  - `PermitRootLogin prohibit-password`
  - `MaxAuthTries 3`
  - `LoginGraceTime 20`
- `authorized_keys` duplicate entries removed.
- Fail2ban remained active.

## Phase 4 - Controlled App/Stack Restore

- Compose stack validated on Server B:
  - backend healthy
  - postgres healthy
  - nginx up
- Health checks:
  - `https://127.0.0.1/` => 200
  - `https://127.0.0.1/health` => 200

## Phase 5 - Secret Rotation

- Rotated internal application secret:
  - `SECRET_KEY` in `/root/ibu_sw/.env.prod`
- Restarted backend/nginx after rotation.
- Runtime validation:
  - backend reads rotated secret successfully.

## Phase 6 - Acceptance (No Data Loss)

- OTP endpoint verification:
  - `/api/v1/auth/send-otp` => 200
- Data consistency checks (live DB vs backup-restore DB):
  - `tournaments`: 10 vs 10
  - `users`: 16 vs 16
  - `participants`: 132 vs 132
  - `groups`: 40 vs 40
  - `group_matches`: 386 vs 386
  - `knockout_matches`: 149 vs 149
  - `leagues`: 3 vs 3

## Phase 7 - Closeout

- Recovery execution documented.
- Main-plan gate sync completed in:
  - `c:/Users/goksc/.cursor/plans/mvp-erweiterung-1-verbesserungen_b90f1322.plan.md`
- Note:
  - full "clean host replacement" requires provisioning of a fresh host; current run completed as in-place recovery/hardening on Server B.

## Addendum - Fresh Host Rebuild (2026-03-17)

- Server B was freshly reinstalled and rebuilt on `95.111.238.180`.
- Security baseline is active:
  - `PermitRootLogin no`
  - `PasswordAuthentication no`
  - `PubkeyAuthentication yes`
  - `AllowUsers opsadmin`
  - fail2ban `sshd` active
- Production stack was rebuilt on `/opt/ibu_sw` and database dump was restored.
- Data check after restore:
  - `tournaments=10`
  - `users=16`
  - `participants=132`
  - `groups=40`
  - `group_matches=386`
  - `knockout_matches=149`
  - `leagues=3`
- TLS certificate for `test.finalstage.ch` was issued successfully via certbot.
- Current open issue after rebuild:
  - OTP mail sending still returns `503` due SMTP transport disconnect (`Connection unexpectedly closed`).
