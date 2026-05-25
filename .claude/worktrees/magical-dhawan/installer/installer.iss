; IBU – Dart Turnier Tool Installer (per-user, no admin, auto-detect EXE)
#define MyAppName "IBU – Dart Turnier Tool"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "IBU"

[Setup]
AppId={{E5B3C9B9-1F5C-44C9-A0D1-8C7E6F6B4B2B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}

; Per-User-Installation (kein Admin), schreibt in AppData
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

; Ausgabe relativ zu installer\ Ordner
OutputDir=build\output
OutputBaseFilename=IBU_Dart_Turnier_Tool_v{#MyAppVersion}_setup

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "Zusätzliche Aufgaben:"; Flags: unchecked

[Dirs]
Name: "{app}\data";    Flags: uninsalwaysuninstall
Name: "{app}\exports"; Flags: uninsalwaysuninstall
Name: "{app}\backups"; Flags: uninsalwaysuninstall

[Files]
; Achtung: installer\ liegt eine Ebene ÜBER dist\
Source: "..\dist\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}";         Filename: "{code:GetAppExe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{code:GetAppExe}"; Tasks: desktopicon

[Run]
Filename: "{code:GetAppExe}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\exports"
Type: filesandordirs; Name: "{app}\backups"

[Code]
var
  DetectedExe: string;

function GetFindRecSize64(const FR: TFindRec): Int64;
begin
  { Dateigröße aus SizeHigh/SizeLow zusammensetzen }
  Result := (Int64(FR.SizeHigh) shl 32) + FR.SizeLow;
end;

procedure DetectMainExe;
var
  FR: TFindRec;
  Size, MaxSize: Int64;
  Candidate: string;
begin
  DetectedExe := '';
  MaxSize := -1;

  { Größte .exe im {app}-Root suchen (typisch: PyInstaller-Onefile) }
  if FindFirst(ExpandConstant('{app}\*.exe'), FR) then
  try
    repeat
      { Nur Dateien (kein Verzeichnis) }
      if (FR.Attributes and FILE_ATTRIBUTE_DIRECTORY) = 0 then
      begin
        Candidate := ExpandConstant('{app}\') + FR.Name;
        Size := GetFindRecSize64(FR);
        if Size > MaxSize then
        begin
          MaxSize := Size;
          DetectedExe := Candidate;
        end;
      end;
    until not FindNext(FR);
  finally
    FindClose(FR);
  end;
end;

function GetAppExe(Param: string): string;
begin
  { Falls noch nicht ermittelt (z. B. Voransicht), konservativer Fallback }
  if DetectedExe = '' then
    Result := ExpandConstant('{app}\main.exe')
  else
    Result := DetectedExe;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  { Nach dem Kopieren der Dateien EXE ermitteln }
  if CurStep = ssPostInstall then
    DetectMainExe;
end;
