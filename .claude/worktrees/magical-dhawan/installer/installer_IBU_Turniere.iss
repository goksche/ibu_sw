; IBU Turniere Installer (per-user, no admin) - tailored
#define MyAppName    "IBU Turniere"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "IBU"
#define ExeName      "IBU Turniere.exe"

[Setup]
AppId={{F1E2D3C4-5B6A-47A8-9C0D-11E22F33A44B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}

; Per-User Installation (kein Admin, AppData)
DefaultDirName={userappdata}\IBU\Dart Turnier Tool
DefaultGroupName=IBU
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64

DisableDirPage=no
DisableProgramGroupPage=yes
Compression=lzma
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes
UsePreviousAppDir=no
Uninstallable=yes

; Ausgabe relativ zum installer\ Ordner
OutputDir=build\output
OutputBaseFilename=IBU_Turniere_v{#MyAppVersion}_setup

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "Zusätzliche Aufgaben:"; Flags: unchecked

[Dirs]
Name: "{app}\data";    Flags: uninsalwaysuninstall
Name: "{app}\exports"; Flags: uninsalwaysuninstall
Name: "{app}\backups"; Flags: uninsalwaysuninstall

[Files]
; Achtung: installer\ liegt parallel zu dist\, daher eine Ebene hoch
; Deine EXE liegt direkt in dist\, nicht in einem Unterordner
Source: "..\dist\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}";         Filename: "{app}\{#ExeName}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#ExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#ExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\exports"
Type: filesandordirs; Name: "{app}\backups"
