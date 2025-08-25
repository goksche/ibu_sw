 ; =============================================================
;  IBU Turniere – Inno Setup Script (v0.9.6)
;  ROBUST: Pfade relativ zur .iss, Icon optional, Verzeichnisse via [Dirs]
; =============================================================

#define MyAppName      "IBU Turniere"
#define MyAppVersion   "0.9.6"
#define MyAppPublisher "IBU"
#define MyAppExeName   "IBU Turniere.exe"

; --- Pfade relativ zur .iss ---
#define AppRoot        AddBackslash(SourcePath) + "..\\"
#define SrcExe         AppRoot + "dist\\IBU Turniere.exe"
#define ReadmeMd       AppRoot + "README.md"
#if FileExists(AppRoot + "assets\\ibu.ico")
  #define SetupIco AppRoot + "assets\\ibu.ico"
#endif

[Setup]
AppId={{A8C2D3B1-3F5B-4E3C-A8B5-3DF1B8B8B6A1}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\\ibu_sw
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=yes
OutputDir=output
OutputBaseFilename=IBU_Turniere_v{#MyAppVersion}_setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\\{#MyAppExeName}
#ifdef SetupIco
  SetupIconFile={#SetupIco}
#endif

[Languages]
Name: "de"; MessagesFile: "compiler:Languages\\German.isl"

[Tasks]
Name: "desktopicon"; Description: "Desktop-Verknüpfung erstellen"; GroupDescription: "Zusätzliche Aufgaben:"; Flags: unchecked

[Files]
; Hauptprogramm
Source: "{#SrcExe}"; DestDir: "{app}"; Flags: ignoreversion

; README nur einbinden, wenn vorhanden
#if FileExists(ReadmeMd)
Source: "{#ReadmeMd}"; DestDir: "{app}"; Flags: ignoreversion isreadme
#endif

[Dirs]
Name: "{app}\\data"
Name: "{app}\\exports"
Name: "{app}\\backups"

[Icons]
Name: "{group}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"
Name: "{userdesktop}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "Anwendung starten"; Flags: nowait postinstall skipifsilent
