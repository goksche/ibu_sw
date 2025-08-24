; v0.9.3 – Inno Setup Script (IBU Turniere)
; Kompilieren: Inno Setup öffnen -> Datei laden -> "Compile"

#define MyAppName        "IBU Turniere"
#define MyAppVersion     "0.9.3"
#define MyAppPublisher   "ibu_sw Team"
#define MyExeName        "IBU Turniere.exe"

; Ausgabe
#define MyOutputDir      "output"
#define MySetupBase      "IBU_Turniere_v0.9.3_setup"

[Setup]
AppId={{B9C29D8B-7E5A-4B8E-9B7D-0DBA4F12A9C5}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\ibu_sw
DefaultGroupName=ibu_sw
DisableDirPage=no
DisableProgramGroupPage=no
OutputDir={#MyOutputDir}
OutputBaseFilename={#MySetupBase}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
; Warnungen bereinigt:
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Files]
; Mögliche Orte der EXE (je nach PyInstaller-Run)
Source: "..\dist\{#MyExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\dist\IBU Turniere\{#MyExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: ".\IBU Turniere\{#MyExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Dirs]
; Schreibbare Arbeitsverzeichnisse für die App
Name: "{app}\data"
Name: "{app}\exports"
Name: "{app}\backups"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyExeName}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Desktop-Verknüpfung erstellen"; GroupDescription: "Zusätzliche Aufgaben:"; Flags: unchecked

[Run]
Filename: "{app}\{#MyExeName}"; Description: "Anwendung starten"; Flags: nowait postinstall skipifsilent
