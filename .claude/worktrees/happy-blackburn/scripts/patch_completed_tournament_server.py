#!/usr/bin/env python3
"""Apply tournament COMPLETED guard on server. Run on Server B: cd /root/ibu_sw && python3 - < this_script or via stdin."""

import sys
import os

try:
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
except NameError:
    BASE = "/root/ibu_sw"
if not os.path.isdir(os.path.join(BASE, "backend")):
    BASE = "/root/ibu_sw"  # Server: Projektroot
if not os.path.isdir(os.path.join(BASE, "backend")):
    BASE = os.getcwd()

def patch_tournaments():
    path = os.path.join(BASE, "backend", "app", "api", "v1", "tournaments.py")
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    # Already patched?
    if "def ensure_tournament_editable" in s:
        print("tournaments.py: already has ensure_tournament_editable")
        return True
    helper = '''
def ensure_tournament_editable(db: Session, tournament_id: int) -> Tournament:
    """Raise 404 if tournament not found, 403 if status is COMPLETED. Return tournament otherwise."""
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

'''
    # Server: nach router kommt def _get_qualified...; lokal: class ManualKOPair
    old_server = 'router = APIRouter(prefix="/tournaments", tags=["Tournaments"])\n\n\ndef _get_qualified_participant_ids_for_ko'
    old_local = 'router = APIRouter(prefix="/tournaments", tags=["Tournaments"])\n\n\nclass ManualKOPair(BaseModel):'
    if old_server in s:
        s = s.replace(old_server, 'router = APIRouter(prefix="/tournaments", tags=["Tournaments"])\n\n' + helper + 'def _get_qualified_participant_ids_for_ko', 1)
    elif old_local in s:
        s = s.replace(old_local, 'router = APIRouter(prefix="/tournaments", tags=["Tournaments"])\n\n' + helper + 'class ManualKOPair(BaseModel):', 1)
    else:
        print("tournaments.py: pattern not found (router/ManualKOPair or router/_get_qualified)")
        return False
    # Replace update_tournament block (Kommentar auf Server: "deletion of groups/matches if changed")
    for old_cmt in ['    # Fields that require deletion of groups/matches if changed', '    # Fields that require deletion']:
        old_up = '    """Update a tournament. Groups and matches are deleted if configuration changes."""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    ' + old_cmt
        if old_up in s:
            s = s.replace(old_up, '    """Update a tournament. Groups and matches are deleted if configuration changes."""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    ' + old_cmt, 1)
            break
    # DELETE delete (first one)
    s = s.replace(
        '    """Delete a tournament (CASCADE deletes all related data) - DEPRECATED: Use POST /{tournament_id}/delete instead"""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    db.delete(tournament)',
        '    """Delete a tournament (CASCADE deletes all related data) - DEPRECATED: Use POST /{tournament_id}/delete instead"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    db.delete(tournament)',
        1
    )
    # POST delete
    s = s.replace(
        '    """Delete a tournament (CASCADE deletes all related data)"""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Delete all related data manually',
        '    """Delete a tournament (CASCADE deletes all related data)"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    # Delete all related data manually',
        1
    )
    # generate_round_robin_matches
    s = s.replace(
        '    """Generate Round Robin matches for all groups in a tournament"""\n    \n    # Check tournament exists\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Get all groups for tournament',
        '    """Generate Round Robin matches for all groups in a tournament"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    # Get all groups for tournament',
        1
    )
    # generate_groups_and_distribute
    s = s.replace(
        '    """Generate groups and randomly distribute participants"""\n    \n    # Check tournament exists\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Get participants registered for this tournament',
        '    """Generate groups and randomly distribute participants"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    # Get participants registered for this tournament',
        1
    )
    # auto_distribute_groups
    s = s.replace(
        '    """\n    Automatically distribute tournament participants into groups.\n    Creates groups if they don\'t exist and generates Round Robin matches.\n    """\n    # Check tournament exists\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Get tournament participants',
        '    """\n    Automatically distribute tournament participants into groups.\n    Creates groups if they don\'t exist and generates Round Robin matches.\n    """\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    # Get tournament participants',
        1
    )
    # generate_ko_bracket_matches
    s = s.replace(
        '    """Generate KO bracket from completed group phase (combined mode) or directly from participants (knockout mode)"""\n    \n    # Check tournament exists\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Check tournament has KO phase',
        '    """Generate KO bracket from completed group phase (combined mode) or directly from participants (knockout mode)"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    # Check tournament has KO phase',
        1
    )
    # create_manual_ko_bracket
    s = s.replace(
        '    """Create KO bracket from manual pairings (knockout mode only)."""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n\n    if not tournament.has_ko_phase:',
        '    """Create KO bracket from manual pairings (knockout mode only)."""\n    tournament = ensure_tournament_editable(db, tournament_id)\n\n    if not tournament.has_ko_phase:',
        1
    )
    # duplicate_tournament
    s = s.replace(
        '    """Duplicate a tournament (only configuration, no participants/groups/matches)"""\n    original = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not original:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Create new tournament with copied settings',
        '    """Duplicate a tournament (only configuration, no participants/groups/matches)"""\n    original = ensure_tournament_editable(db, tournament_id)\n    \n    # Create new tournament with copied settings',
        1
    )
    # set_tournament_template
    s = s.replace(
        '    """Set or unset tournament as template"""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    tournament.is_template = is_template',
        '    """Set or unset tournament as template"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    tournament.is_template = is_template',
        1
    )
    # set_seeded_participants
    s = s.replace(
        '    """Set seeded participants for a tournament"""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Validate that tournament has groups and seeded distribution',
        '    """Set seeded participants for a tournament"""\n    tournament = ensure_tournament_editable(db, tournament_id)\n    \n    # Validate that tournament has groups and seeded distribution',
        1
    )
    # set_manual_qualification_selection
    s = s.replace(
        '    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n\n    if not tournament.has_group_phase:',
        '    tournament = ensure_tournament_editable(db, tournament_id)\n\n    if not tournament.has_group_phase:',
        1
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("tournaments.py: patched")
    return True


def patch_matches():
    path = os.path.join(BASE, "backend", "app", "api", "v1", "matches.py")
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    if "def check_tournament_editable" in s:
        print("matches.py: already has check_tournament_editable")
        return True
    if "from app.models.tournament import TournamentStatus" not in s:
        s = s.replace(
            "from app.models import GroupMatch, KnockoutMatch, Tournament, Group, Participant, User\n",
            "from app.models import GroupMatch, KnockoutMatch, Tournament, Group, Participant, User\nfrom app.models.tournament import TournamentStatus\n",
            1
        )
    old = '''    return tournament


# Group Matches'''
    new = '''    return tournament


def check_tournament_editable(db: Session, tournament_id: int):
    """Check tournament exists and is not completed (for write operations)."""
    tournament = check_tournament_access(db, tournament_id)
    if tournament.status == TournamentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich"
        )
    return tournament


# Group Matches'''
    if old not in s:
        print("matches.py: pattern not found")
        return False
    s = s.replace(old, new, 1)
    s = s.replace('    """Create a new group match"""\n    check_tournament_access(db, match.tournament_id)\n    \n    # Check if group exists', '    """Create a new group match"""\n    check_tournament_editable(db, match.tournament_id)\n    \n    # Check if group exists', 1)
    s = s.replace('    check_tournament_access(db, db_match.tournament_id)\n    \n    # Update fields ???', '    check_tournament_editable(db, db_match.tournament_id)\n    \n    # Update fields ???', 1)
    s = s.replace('    check_tournament_access(db, db_match.tournament_id)\n    \n    db.delete(db_match)', '    check_tournament_editable(db, db_match.tournament_id)\n    \n    db.delete(db_match)', 2)  # group + knockout delete
    s = s.replace('    """Create a new knockout match"""\n    check_tournament_access(db, match.tournament_id)\n    \n    # Check if match already exists', '    """Create a new knockout match"""\n    check_tournament_editable(db, match.tournament_id)\n    \n    # Check if match already exists', 1)
    s = s.replace('    """Update a knockout match"""\n    db_match = db.query(KnockoutMatch)', '    """Update a knockout match"""\n    db_match = db.query(KnockoutMatch)', 1)
    # Replace the check in update_knockout_match and delete_knockout_match (second occurrence of check_tournament_access before db.delete is already done; we need update_knockout)
    s = s.replace('    check_tournament_access(db, db_match.tournament_id)\n    \n    # Update fields\n    update_data = match_update', '    check_tournament_editable(db, db_match.tournament_id)\n    \n    # Update fields\n    update_data = match_update', 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("matches.py: patched")
    return True


def patch_participants():
    path = os.path.join(BASE, "backend", "app", "api", "v1", "participants.py")
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    if "TournamentStatus.COMPLETED" in s and "add_tournament_participants" in s:
        # Check if add already has the block
        if '    """Add participants to a tournament"""\n    added_count = 0' in s:
            pass  # not yet patched for add
        else:
            print("participants.py: already patched")
            return True
    if "from app.models.tournament import Tournament, TournamentStatus" not in s:
        s = s.replace(
            "from app.models.participant import Participant, TournamentParticipant\nfrom pydantic import BaseModel",
            "from app.models.participant import Participant, TournamentParticipant\nfrom app.models.tournament import Tournament, TournamentStatus\nfrom pydantic import BaseModel",
            1
        )
    s = s.replace(
        '    """Add participants to a tournament"""\n    added_count = 0',
        '    """Add participants to a tournament"""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    if tournament.status == TournamentStatus.COMPLETED:\n        raise HTTPException(\n            status_code=status.HTTP_403_FORBIDDEN,\n            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich"\n        )\n    added_count = 0',
        1
    )
    s = s.replace(
        '    # Check if tournament exists\n    from app.models.tournament import Tournament\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    \n    # Check if already in tournament',
        '    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    if tournament.status == TournamentStatus.COMPLETED:\n        raise HTTPException(\n            status_code=status.HTTP_403_FORBIDDEN,\n            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich"\n        )\n    \n    # Check if already in tournament',
        1
    )
    s = s.replace(
        '    """Remove a participant from a tournament"""\n    tp = db.query(TournamentParticipant).filter(',
        '    """Remove a participant from a tournament"""\n    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()\n    if not tournament:\n        raise HTTPException(\n            status_code=status.HTTP_404_NOT_FOUND,\n            detail=f"Tournament with ID {tournament_id} not found"\n        )\n    if tournament.status == TournamentStatus.COMPLETED:\n        raise HTTPException(\n            status_code=status.HTTP_403_FORBIDDEN,\n            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich"\n        )\n    tp = db.query(TournamentParticipant).filter(',
        1
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("participants.py: patched")
    return True


if __name__ == "__main__":
    os.chdir(BASE)
    ok = patch_tournaments() and patch_matches() and patch_participants()
    sys.exit(0 if ok else 1)
