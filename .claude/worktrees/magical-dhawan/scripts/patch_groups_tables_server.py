#!/usr/bin/env python3
"""Patch groups.py and tables.py on server: COMPLETED-Sperre. Run: ssh root@SERVER 'cd /root/ibu_sw && python3 -' < this_script"""
import os
import sys

try:
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
except NameError:
    BASE = "/root/ibu_sw"
if not os.path.isdir(os.path.join(BASE, "backend")):
    BASE = "/root/ibu_sw"

def patch_groups():
    path = os.path.join(BASE, "backend", "app", "api", "v1", "groups.py")
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    if "check_tournament_editable" in s:
        print("groups.py: already has check_tournament_editable")
        return True
    s = s.replace(
        "from app.models import Group, GroupParticipant, Tournament, Participant\nfrom app.schemas.group import",
        "from app.models import Group, GroupParticipant, Tournament, Participant\nfrom app.models.tournament import TournamentStatus\nfrom app.schemas.group import",
        1
    )
    s = s.replace(
        "    return tournament\n\n\n@router.get(\"/\", response_model=List[GroupResponse])",
        "    return tournament\n\n\ndef check_tournament_editable(db: Session, tournament_id: int):\n    \"\"\"Check tournament exists and is not completed (for write operations).\"\"\"\n    tournament = check_tournament_access(db, tournament_id)\n    if tournament.status == TournamentStatus.COMPLETED:\n        raise HTTPException(\n            status_code=status.HTTP_403_FORBIDDEN,\n            detail=\"Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich\"\n        )\n    return tournament\n\n\n@router.get(\"/\", response_model=List[GroupResponse])",
        1
    )
    for old_cmt in ["    # Check if group name already exists in tournament", "    # Check if group name already exists"]:
        old_create = '    """Create a new group for a tournament"""\n    check_tournament_access(db, group.tournament_id)\n    \n    ' + old_cmt
        if old_create in s:
            s = s.replace(old_create, '    """Create a new group for a tournament"""\n    check_tournament_editable(db, group.tournament_id)\n    \n    ' + old_cmt, 1)
            break
    s = s.replace(
        "    check_tournament_access(db, db_group.tournament_id)\n    \n    # Update fields",
        "    check_tournament_editable(db, db_group.tournament_id)\n    \n    # Update fields",
        1
    )
    s = s.replace(
        "    check_tournament_access(db, db_group.tournament_id)\n    \n    db.delete(db_group)",
        "    check_tournament_editable(db, db_group.tournament_id)\n    \n    db.delete(db_group)",
        1
    )
    s = s.replace(
        "    check_tournament_access(db, db_group.tournament_id)\n    \n    # Check if participant exists",
        "    check_tournament_editable(db, db_group.tournament_id)\n    \n    # Check if participant exists",
        1
    )
    s = s.replace(
        "    check_tournament_access(db, db_group.tournament_id)\n    \n    # Remove participant",
        "    check_tournament_editable(db, db_group.tournament_id)\n    \n    # Remove participant",
        1
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("groups.py: patched")
    return True


def patch_tables():
    path = os.path.join(BASE, "backend", "app", "api", "v1", "tables.py")
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    if "_ensure_tournament_editable" in s:
        print("tables.py: already has _ensure_tournament_editable")
        return True
    s = s.replace(
        "from app.models.tournament import Tournament, LeagueScoringSystem\nfrom app.models.group import Group",
        "from app.models.tournament import Tournament, TournamentStatus, LeagueScoringSystem\nfrom app.models.group import Group",
        1
    )
    old = "router = APIRouter()\n\n\ndef _compute_ranking_from_stats_for_table("
    new = """router = APIRouter()


def _ensure_tournament_editable(db: Session, tournament_id: int) -> Tournament:
    \"\"\"Raise 404 if tournament not found, 403 if status is COMPLETED.\"\"\"
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    if tournament.status == TournamentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich"
        )
    return tournament


def _compute_ranking_from_stats_for_table("""
    if old not in s:
        print("tables.py: pattern router/_compute not found")
        return False
    s = s.replace(old, new, 1)
    # decision-matches create
    s = s.replace(
        '        detail=f"Group with ID {group_id} not found"\n        )\n\n    created_matches = generate_decision_matches_for_group(db, group.tournament_id, group_id)',
        '        detail=f"Group with ID {group_id} not found"\n        )\n    _ensure_tournament_editable(db, group.tournament_id)\n\n    created_matches = generate_decision_matches_for_group(db, group.tournament_id, group_id)',
        1
    )
    # decision-matches delete (server: two newlines before "deleted")
    s = s.replace(
        '        detail=f"Group with ID {group_id} not found"\n        )\n\n    deleted = db.query(GroupMatch).filter(',
        '        detail=f"Group with ID {group_id} not found"\n        )\n    _ensure_tournament_editable(db, group.tournament_id)\n\n    deleted = db.query(GroupMatch).filter(',
        1
    )
    # tie-break playoff: after "if not group" block, before "Validate participants"
    s = s.replace(
        '            detail=f"Group with ID {group_id} not found"\n        )\n    \n    # Validate participants belong to group\n    group_participant_ids = [gp.participant_id for gp in group.participants]\n    if not all(pid in group_participant_ids for pid in participant_ids):\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail="Not all participants belong to this group"\n        )\n    \n    # Get existing matches to determine next round\n    existing_matches = db.query(GroupMatch).filter(\n        GroupMatch.tournament_id == group.tournament_id,\n        GroupMatch.group_id == group_id\n    ).all()\n    \n    max_round = max((m.round for m in existing_matches), default=0)\n    next_round = max_round + 1\n    \n    # Generate round robin rounds\n    rounds = generate_round_robin_rounds(participant_ids, multiplier=1, variant=\'classic\')',
        '            detail=f"Group with ID {group_id} not found"\n        )\n    _ensure_tournament_editable(db, group.tournament_id)\n    \n    # Validate participants belong to group\n    group_participant_ids = [gp.participant_id for gp in group.participants]\n    if not all(pid in group_participant_ids for pid in participant_ids):\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail="Not all participants belong to this group"\n        )\n    \n    # Get existing matches to determine next round\n    existing_matches = db.query(GroupMatch).filter(\n        GroupMatch.tournament_id == group.tournament_id,\n        GroupMatch.group_id == group_id\n    ).all()\n    \n    max_round = max((m.round for m in existing_matches), default=0)\n    next_round = max_round + 1\n    \n    # Generate round robin rounds\n    rounds = generate_round_robin_rounds(participant_ids, multiplier=1, variant=\'classic\')',
        1
    )
    # tie-break random
    s = s.replace(
        '            detail=f"Group with ID {group_id} not found"\n        )\n    \n    # Validate participants belong to group\n    group_participant_ids = [gp.participant_id for gp in group.participants]\n    if not all(pid in group_participant_ids for pid in participant_ids):\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail="Not all participants belong to this group"\n        )\n    \n    if not participant_ids:',
        '            detail=f"Group with ID {group_id} not found"\n        )\n    _ensure_tournament_editable(db, group.tournament_id)\n    \n    # Validate participants belong to group\n    group_participant_ids = [gp.participant_id for gp in group.participants]\n    if not all(pid in group_participant_ids for pid in participant_ids):\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail="Not all participants belong to this group"\n        )\n    \n    if not participant_ids:',
        1
    )
    # tie-break manual
    s = s.replace(
        '            detail=f"Group with ID {group_id} not found"\n        )\n    \n    # Validate participants belong to group\n    group_participant_ids = [gp.participant_id for gp in group.participants]\n    if not all(pid in group_participant_ids for pid in participant_ids):\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail="Not all participants belong to this group"\n        )\n    \n    if winner_id not in participant_ids:',
        '            detail=f"Group with ID {group_id} not found"\n        )\n    _ensure_tournament_editable(db, group.tournament_id)\n    \n    # Validate participants belong to group\n    group_participant_ids = [gp.participant_id for gp in group.participants]\n    if not all(pid in group_participant_ids for pid in participant_ids):\n        raise HTTPException(\n            status_code=status.HTTP_400_BAD_REQUEST,\n            detail="Not all participants belong to this group"\n        )\n    \n    if winner_id not in participant_ids:',
        1
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("tables.py: patched")
    return True


if __name__ == "__main__":
    ok = patch_groups() and patch_tables()
    sys.exit(0 if ok else 1)
