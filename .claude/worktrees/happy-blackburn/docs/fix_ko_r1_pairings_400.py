# Fix 400 on server: allow Runde 1 pairings via PUT ko-round/1/pairings
# Run on server: cd /root/ibu_sw && python3 (then paste or pipe this file)
path = "/root/ibu_sw/backend/app/api/v1/tournaments.py"
with open(path, "r", encoding="utf-8") as f:
    s = f.read()

# 1) Remove block that rejects round 1 (exact string from patch_manual_ko_r1_server.py)
old1 = """    if round < 2 and round != BRONZE_ROUND:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Runde 1 bitte über manual-ko-bracket anlegen"
        )

    if round == BRONZE_ROUND:"""
if old1 in s:
    s = s.replace(old1, "    if round == BRONZE_ROUND:", 1)
    print("Removed round-1 rejection block")
else:
    print("Rejection block not found (already removed or different)")

# 2) If round==1 branch for allowed_ids is missing, add it (before BRONZE)
if "if round == 1:" not in s or "allowed_ids = set(_get_qualified_participant_ids_for_ko(db, tournament))" not in s:
    old2 = """    if round == BRONZE_ROUND:
        from sqlalchemy import func
        max_main = db.query(func.max(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == tournament_id,
            KnockoutMatch.round != BRONZE_ROUND,
            KnockoutMatch.round >= 1
        ).scalar()
        semi_round = (max_main - 1) if max_main and max_main > 1 else 2
        allowed_ids = set(get_losers_of_round(db, tournament_id, semi_round))
        if not allowed_ids:
            allowed_ids = set(get_participants_in_round(db, tournament_id, semi_round))
    else:
        allowed_ids = set(get_winners_of_round(db, tournament_id, round - 1))
        if not allowed_ids:
            allowed_ids = set(get_participants_in_round(db, tournament_id, round - 1))"""
    new2 = """    if round == 1:
        allowed_ids = set(_get_qualified_participant_ids_for_ko(db, tournament))
        if len(allowed_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mindestens 2 Teilnehmer für KO-Runde 1 nötig (KO: alle; kombiniert: qualifizierte)"
            )
    elif round == BRONZE_ROUND:
        from sqlalchemy import func
        max_main = db.query(func.max(KnockoutMatch.round)).filter(
            KnockoutMatch.tournament_id == tournament_id,
            KnockoutMatch.round != BRONZE_ROUND,
            KnockoutMatch.round >= 1
        ).scalar()
        semi_round = (max_main - 1) if max_main and max_main > 1 else 2
        allowed_ids = set(get_losers_of_round(db, tournament_id, semi_round))
        if not allowed_ids:
            allowed_ids = set(get_participants_in_round(db, tournament_id, semi_round))
    else:
        allowed_ids = set(get_winners_of_round(db, tournament_id, round - 1))
        if not allowed_ids:
            allowed_ids = set(get_participants_in_round(db, tournament_id, round - 1))"""
    if old2 in s:
        s = s.replace(old2, new2, 1)
        print("Added round-1 allowed_ids branch")
    else:
        print("allowed_ids block not found or already has round 1")
else:
    print("Round-1 branch already present")

with open(path, "w", encoding="utf-8") as f:
    f.write(s)
print("Done:", path)
