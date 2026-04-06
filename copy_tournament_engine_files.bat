@echo off
setlocal enabledelayedexpansion

set "DEST=C:\Users\goksc\OneDrive\Desktop\tre"

if not exist "%DEST%" mkdir "%DEST%"

copy /Y "backend\app\models\tournament.py" "%DEST%\"
copy /Y "backend\app\models\match.py" "%DEST%\"
copy /Y "backend\app\services\ko_bracket.py" "%DEST%\"
copy /Y "backend\app\services\ko_propagation.py" "%DEST%\"
copy /Y "backend\app\services\qualification.py" "%DEST%\"
copy /Y "backend\app\services\round_robin.py" "%DEST%\"
copy /Y "backend\app\services\decision_matches.py" "%DEST%\"
copy /Y "backend\app\services\group_distribution.py" "%DEST%\"
copy /Y "backend\app\core\mode_matrix.py" "%DEST%\"
copy /Y "backend\app\api\v1\tournaments.py" "%DEST%\"
copy /Y "backend\app\api\v1\tables.py" "%DEST%\"
copy /Y "backend\app\schemas\tournament.py" "%DEST%\"
copy /Y "backend\migrations\add_ko_structure_fields.sql" "%DEST%\"
copy /Y "backend\migrations\add_ko_qualification_fields.sql" "%DEST%\"
copy /Y "backend\migrations\add_league_scoring_fields.sql" "%DEST%\"
copy /Y "backend\migrations\add_league_variant_fields.sql" "%DEST%\"

echo.
echo Fertig. Dateien wurden kopiert, Originale bleiben unveraendert.
