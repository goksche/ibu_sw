import os, hashlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = os.path.join(ROOT, "REPO_SNAPSHOT.md")

SKIP_DIRS = {".git", ".github", ".venv", "__pycache__", ".idea", ".vscode", "dist", "build"}
SKIP_EXT  = {".sqlite", ".db", ".log", ".png", ".jpg", ".jpeg", ".gif", ".pdf",
             ".exe", ".dll", ".so", ".dylib", ".zip", ".tar", ".gz"}
ALLOW_EXT = {".py", ".md", ".txt", ".yml", ".yaml", ".json", ".toml", ".ini", ".cfg",
             ".bat", ".ps1", ".sh", ".sql", ".csv"}

MAX_FILE_BYTES  = 200_000
MAX_TOTAL_BYTES = 5_000_000

def is_binary_ext(p): return os.path.splitext(p.lower())[1] in SKIP_EXT
def allow_ext(p):     return os.path.splitext(p.lower())[1] in ALLOW_EXT

def iter_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, ROOT)
            if rel.startswith(".git"): continue
            if is_binary_ext(path):    continue
            if not allow_ext(path):    continue
            yield rel, path

def read_text(path, limit):
    try:
        with open(path, "rb") as f:
            data = f.read(limit + 1)
        cut = len(data) > limit
        if cut: data = data[:limit]
        return data.decode("utf-8", errors="replace") + ("\n\n[... gekürzt ...]\n" if cut else "")
    except Exception as e:
        return f"<<Fehler beim Lesen: {e}>>"

def make_tree(files):
    lines = ["```text", "."]
    for rel, _ in sorted(files, key=lambda x: x[0].lower()):
        parts = rel.split(os.sep)
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                lines.append(f"{'  ' * i}└─ {part}")
    lines.append("```")
    return "\n".join(lines)

def sha(s): return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def main():
    files = list(iter_files())
    tree = make_tree(files)

    total = 0
    sections = []
    for rel, path in files:
        text = read_text(path, MAX_FILE_BYTES)
        total += len(text.encode("utf-8"))
        if total > MAX_TOTAL_BYTES:
            sections.append(f"\n\n---\n## {rel}\n*Inhalt übersprungen: Snapshotlimit erreicht.*\n")
            continue
        sections.append(f"\n\n---\n## {rel}\n\n```text\n{text}\n```")

    body = (
        "# 📦 Repository-Snapshot\n\n"
        "Automatisch generiert (Dateibaum + Inhalte relevanter Textdateien).\n\n"
        "## Dateibaum\n\n" + tree + "\n\n## Inhalte\n" + "".join(sections) + "\n"
    )
    digest = sha(body)
    with open(SNAPSHOT, "w", encoding="utf-8") as f:
        f.write(f"<!-- snapshot:{digest} -->\n" + body)

if __name__ == "__main__":
    main()
