; installer/ibu_sw.iss
; Inno Setup Script für IBU (Dart Turnier Verwaltungs Tool)
; Installer baut aus dem PyInstaller-OneFolder-Output (dist\ibu_sw\*)

#define AppName       "IBU – Dart Turnier Tool"
#define AppPublisher  "goksche"
#define AppURL        "https://github.com/goksche/ibu_sw"

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

; Relativ zum Speicherort dieses Skripts (liegt in installer\)
#ifndef SourceDir
  #define SourceDir "..\\dist\\ibu_sw"
#endif

#ifndef OutputDir
  #define OutputDir "..\\dist\\installer"
#endif

#define MainExe "ibu_sw.exe"
#define GroupName "IBU Dart Tool"

[Setup]
AppId={{CF8F51A0-2C08-42F4-8F8A-5E9F3E0D6A11}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}

; *** Per-User Installation, keine Adminrechte nötig ***
DefaultDirName={localappdata}\\IBU
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64

DefaultGroupName={#GroupName}
OutputDir={#OutputDir}
OutputBaseFilename=IBU_Setup_{#AppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyMemo=no
UninstallDisplayIcon={app}\\{#MainExe}
SetupIconFile=
UsePreviousAppDir=yes

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\\German.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "Zusätzliche Aufgaben:"; Flags: unchecked

[Dirs]
; Sichtbare Standard-Schreibordner
Name: "{app}\\data";    Flags: uninsalwaysuninstall
Name: "{app}\\exports"; Flags: uninsalwaysuninstall
Name: "{app}\\backups"; Flags: uninsalwaysuninstall

[Files]
; PyInstaller-OneFolder-Output
Source: "{#SourceDir}\\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
; Startmenü
Name: "{group}\\{#AppName}";     Filename: "{app}\\{#MainExe}"
Name: "{group}\\Deinstallieren"; Filename: "{uninstallexe}"

; Desktop:
; - Für normale (nicht erhöhte) Installation: Benutzer-Desktop
Name: "{userdesktop}\\{#AppName}"; Filename: "{app}\\{#MainExe}"; Tasks: desktopicon; Check: not IsAdminLoggedOn
; - Optional, nur wenn Installer als Admin läuft: Öffentlicher Desktop
Name: "{commondesktop}\\{#AppName}"; Filename: "{app}\\{#MainExe}"; Tasks: desktopicon; Check: IsAdminLoggedOn

[Run]
; Nach Installation starten (optional)
Filename: "{app}\\{#MainExe}"; Description: "{cm:LaunchProgram, {#AppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: dirifempty; Name: "{app}\\data"
Type: dirifempty; Name: "{app}\\exports"
Type: dirifempty; Name: "{app}\\backups"
