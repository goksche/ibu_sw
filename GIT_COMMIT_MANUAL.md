# Git Commit & Push - Manuelle Anleitung

## Status

Das Repository wurde bereits lokal committed:
- Commit: `feat: v1.2.0-alpha.2 - Web Interface Backend implementiert`
- 47 files changed, 2536 insertions(+)

## Nächste Schritte

### 1. Release Notes hinzufügen

```bash
git add RELEASE_NOTES_v1.2.0-alpha.2.md
git commit -m "docs: v1.2.0-alpha.2 Release Notes hinzugefügt"
```

### 2. Auf GitHub pushen

```bash
git push origin main
```

Falls es Probleme gibt:

```bash
# Branch Status prüfen
git status

# Alle Commits anzeigen
git log --oneline -5

# Force Push nur wenn nötig (vorsichtig!)
git push --force-with-lease origin main
```

### 3. Tag erstellen

```bash
git tag -a v1.2.0-alpha.2 -m "v1.2.0-alpha.2: Web Interface Backend"
git push origin v1.2.0-alpha.2
```

## Alternative: Via GitHub Web Interface

Falls `git push` nicht funktioniert:

1. Öffnen Sie: https://github.com/IhreUsername/ibu_sw
2. Upload der Dateien manuell über GitHub Web Interface
3. Oder: GitHub Desktop App verwenden

## Lokale Sicherung

Alle Änderungen sind bereits lokal gesichert im Git Repository. Das Backend ist voll funktionsfähig.

