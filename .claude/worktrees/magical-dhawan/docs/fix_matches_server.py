# Patch for server: remove can_enter_ko_result check in update_group_match
# Run on server: python3 < fix_matches_server.py  (or: ssh server "python3" < fix_matches_server.py)
path = "/root/ibu_sw/backend/app/api/v1/matches.py"
with open(path) as f:
    s = f.read()
old = """    # Update fields
    update_data = match_update.model_dump(exclude_unset=True)
    if "score1" in update_data or "score2" in update_data:
        setting_result = (
            update_data.get("score1") is not None or update_data.get("score2") is not None
        )
        if setting_result:
            if not can_enter_ko_result(db, db_match):
                if db_match.player1_id is None and db_match.player2_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Keine Paarung ??? bitte zuerst diese Runde auslosen (Button Runde auslosen)."
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ergebnis kann erst eingetragen werden, wenn die Vorrunde abgeschlossen ist."
                )
    for field, value in update_data.items():
        setattr(db_match, field, value)"""
new = """    # Update fields – Gruppenspiele: Ergebnisse jederzeit eintragen und anpassen erlauben
    update_data = match_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_match, field, value)"""
if old not in s:
    print("BLOCK_NOT_FOUND")
    exit(1)
s = s.replace(old, new, 1)
with open(path, "w") as f:
    f.write(s)
print("PATCH_OK")
