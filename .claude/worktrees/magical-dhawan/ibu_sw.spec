# PyInstaller Spec für IBU (Dart Turnier Verwaltungs Tool)
# - onefolder (COLLECT), windowed
# - Hauptdatei: main.py am Repo-Root

from PyInstaller.utils.hooks import collect_submodules

hidden_imports = collect_submodules('PyQt6')

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Statische Assets hier eintragen, wenn mit ausgeliefert werden sollen:
        # ('data/Meisterschaft.xlsx', 'data'),
        # ('data/16er.xlsx', 'data'),
        # ('README.md', '.'),
    ],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ibu_sw',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,   # GUI-App
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ibu_sw'
)
