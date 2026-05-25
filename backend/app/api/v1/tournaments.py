# Tournament API Endpoints
# v1.2.0-alpha.2

import math
import random
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Tuple, Optional, Literal
from pydantic import BaseModel
from app.models.tournament import TournamentStatus

from app.core.database import get_db
from app.core.dependencies import require_user_or_admin, require_viewer_or_above, get_current_user
from app.services.visibility import get_accessible_tournament as _get_accessible_tournament, get_visible_tournaments_query
from app.schemas.tournament import TournamentCreate, TournamentUpdate, TournamentResponse, QualificationManualSelection
from app.models.tournament import Tournament, TournamentMode, LeagueScoringSystem
from app.models.group import Group, GroupParticipant
from app.models.match import GroupMatch, KnockoutMatch
from app.models.participant import TournamentParticipant, Participant
from app.models.location import Spielfeld
from app.services.round_robin import generate_round_robin_rounds, validate_round_robin_participants, generate_swiss_like_rounds
from app.services.group_distribution import distribute_participants_random, distribute_participants_seeded, validate_distribution
from app.services.ko_bracket import (
    generate_ko_bracket_from_groups,
    generate_ko_bracket_from_participants,
    append_third_place_placeholder_if_needed,
)
from app.services.qualification import calculate_qualification_plan, get_qualified_participants_from_groups
from app.services.decision_matches import (
    compute_ranking_with_decision_matches,
    compute_group_ranking_with_rules,
    compute_group_stats,
)
from app.services.ko_propagation import (
    BRONZE_ROUND,
    can_enter_ko_result,
    save_ko_result_and_propagate,
)
from app.models.tournament import KOStartRound
from app.core.mode_matrix import normalize_mode_payload, validate_mode_payload
from app.core.matrix_restrictions import validate_tournament_matrix_restrictions_a
from app.services.league_standings import get_tournament_placements

router = APIRouter(prefix="/tournaments", tags=["Tournaments"])
logger = logging.getLogger(__name__)


def _merged_matrix_validation_kwargs(tournament, update_data: dict) -> dict:
    """Felder für Matrix-Validierung nach partiellen Updates mit bestehendem Turnier zusammenführen."""

    def pick(attr: str):
        if attr in update_data:
            return update_data[attr]
        return getattr(tournament, attr)

    return {
        "mode": pick("mode"),
        "has_group_phase": pick("has_group_phase"),
        "groups_count": pick("groups_count"),
        "group_distribution": pick("group_distribution"),
        "league_variant": pick("league_variant"),
        "league_rounds_multiplier": pick("league_rounds_multiplier"),
    }


def _normalize_spielfeld_assignment_mode(raw: Optional[str]) -> str:
    """Whitespace/Typo soll nicht zu einem stillen Fallback auf 'random' (faire Rundenverteilung) führen."""
    if not raw or not isinstance(raw, str):
        return "random"
    m = raw.strip().lower()
    if m in ("random", "group_fixed", "group_random"):
        return m
    return "random"


def _validate_seeded_before_group_generation(
    group_distribution: Optional[str],
    num_groups: Optional[int],
    participant_ids: List[int],
    seeded_participant_ids: Optional[List[int]],
) -> None:
    """Bei Auslosungsart 'seeded' und mehreren Gruppen müssen gespeicherte Gesetzte existieren (vor Löschen alter Gruppen prüfen)."""
    gd = group_distribution or "random"
    if gd != "seeded" or not num_groups or num_groups <= 1:
        return
    pool = set(participant_ids)
    seeded_ok = [pid for pid in (seeded_participant_ids or []) if pid in pool]
    if len(seeded_ok) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Bei Auslosungsart „Gesetzt“ müssen vor der Gruppen-Generierung unter den Turnier-Teilnehmern "
                "gesetzte Spieler markiert und mit „Gesetzte speichern“ gesichert sein."
            ),
        )


def _distributed_groups_for_auto(
    participant_ids: List[int],
    num_groups: int,
    group_distribution: str,
    seeded_participant_ids: Optional[List[int]],
) -> List[List[int]]:
    """
    - manual: leere Gruppen.
    - random: gleichmäßig zufällig; gespeicherte Seed-Markierungen werden für die Gruppeneinteilung ignoriert.
    - seeded: Verteilung nach gesetzten Spielern (eine Gruppe pro Gesetztem, Rest zufällig); bei mehreren Gruppen
      ohne gespeicherte Gesetzte -> Fehler (Aufrufer muss vorher validieren / HTTPException).
    """
    if group_distribution == "manual":
        return [[] for _ in range(num_groups)]

    if group_distribution == "random":
        return distribute_participants_random(participant_ids, num_groups)

    pool = set(participant_ids)
    seeded_ids = [pid for pid in (seeded_participant_ids or []) if pid in pool]

    if group_distribution == "seeded":
        if num_groups <= 1:
            return distribute_participants_random(participant_ids, num_groups)
        if len(seeded_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Bei Auslosungsart „Gesetzt“ müssen vor der Gruppen-Generierung unter den Turnier-Teilnehmern "
                    "gesetzte Spieler markiert und mit „Gesetzte speichern“ gesichert sein."
                ),
            )
        id_to_index = {pid: idx for idx, pid in enumerate(participant_ids)}
        seeded_indices = [id_to_index[pid] for pid in seeded_ids if pid in id_to_index]
        try:
            return distribute_participants_seeded(
                participant_ids,
                num_groups,
                seeded_indices=seeded_indices,
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return distribute_participants_random(participant_ids, num_groups)


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


class ManualKOPair(BaseModel):
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None


class ManualKOBracketRequest(BaseModel):
    pairs: List[ManualKOPair]


class KoRoundPairing(BaseModel):
    match_no: int
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None


class KoRoundPairingsRequest(BaseModel):
    pairs: List[KoRoundPairing]


class DeleteTournamentRequest(BaseModel):
    password: Optional[str] = None


class PhaseSimulationRequest(BaseModel):
    phase: Literal["group", "ko"]
    min_score: int = 0
    max_score: int = 5
    allow_draws: bool = False
    overwrite_existing: bool = False
    group_id: Optional[int] = None


def _random_score_pair(min_score: int, max_score: int, allow_draws: bool) -> Tuple[int, int]:
    score1 = random.randint(min_score, max_score)
    score2 = random.randint(min_score, max_score)
    if not allow_draws and score1 == score2:
        if score2 < max_score:
            score2 += 1
        elif score1 > min_score:
            score1 -= 1
        else:
            score2 = min(max_score, score2 + 1)
    return score1, score2


def _effective_groups_count(tournament: Tournament, groups: Optional[List[Group]] = None) -> int:
    # If groups are already created, trust the actual count to avoid mismatches
    # (e.g. settings groups_count != real groups -> wrong qualification remainder).
    if groups is not None and len(groups) > 0:
        return len(groups)
    raw_count = getattr(tournament, "groups_count", None)
    if isinstance(raw_count, int) and raw_count > 0:
        return raw_count
    return 0


def _normalize_fallback_rules(raw_value) -> List[Dict]:
    if not raw_value:
        return []
    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
        except Exception:
            return []
        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)]
        if isinstance(parsed, dict):
            return [parsed]
        return []
    if isinstance(raw_value, list):
        return [item for item in raw_value if isinstance(item, dict)]
    if isinstance(raw_value, dict):
        return [raw_value]
    return []


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def _get_qualified_participant_ids_for_ko(db: Session, tournament: Tournament) -> List[int]:
    """
    Teilnehmer-IDs für KO Runde 1: reiner KO = alle Turnierteilnehmer;
    Kombi = Qualifikanten laut Plan (gleiche Logik wie Qualifikationstabelle).
    """
    if tournament.mode == TournamentMode.KNOCKOUT:
        tps = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == tournament.id
        ).all()
        return [tp.participant_id for tp in tps]

    if tournament.mode != TournamentMode.COMBINED or not getattr(tournament, "has_group_phase", False):
        return []
    if not tournament.ko_start_round:
        return []

    groups = db.query(Group).filter(Group.tournament_id == tournament.id).all()
    if not groups:
        return []

    groups_count = _effective_groups_count(tournament, groups)
    if groups_count <= 0:
        return []

    qualification_plan = calculate_qualification_plan(
        groups_count=groups_count,
        ko_start_round=tournament.ko_start_round,
    )
    stored_fallback = _normalize_fallback_rules(tournament.ko_fallback_qualifiers)
    if qualification_plan and stored_fallback:
        merged_fallback_rules = []
        for rule in qualification_plan.get("fallback_rules", []):
            matched = next(
                (
                    stored
                    for stored in stored_fallback
                    if stored.get("position") == rule.get("position")
                    and stored.get("count") == rule.get("count")
                ),
                None,
            )
            if matched and matched.get("manual_selected_ids"):
                merged_rule = {**rule, "manual_selected_ids": matched.get("manual_selected_ids")}
            else:
                merged_rule = rule
            merged_fallback_rules.append(merged_rule)
        qualification_plan["fallback_rules"] = merged_fallback_rules

    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    group_rankings: Dict[int, List[int]] = {}
    group_stats: Dict[int, Dict[int, Dict]] = {}
    tid = tournament.id

    for group in groups:
        group_participants = [gp.participant_id for gp in group.participants]
        regular_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tid,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == False,
        ).all()
        regular_matches = [
            {
                "player1_id": m.player1_id,
                "player2_id": m.player2_id,
                "score1": m.score1,
                "score2": m.score2,
            }
            for m in regular_matches_data
        ]
        decision_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tid,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == True,
        ).all()
        decision_matches = [
            {
                "player1_id": m.player1_id,
                "player2_id": m.player2_id,
                "score1": m.score1,
                "score2": m.score2,
            }
            for m in decision_matches_data
        ]
        if decision_matches:
            ranking, _ = compute_ranking_with_decision_matches(
                regular_matches=regular_matches,
                decision_matches=decision_matches,
                participant_ids=group_participants,
                scoring_system=scoring_system,
                tie_breaking_rules=tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        else:
            ranking = compute_group_ranking_with_rules(
                regular_matches,
                group_participants,
                scoring_system,
                tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        group_rankings[group.id] = ranking
        stats = compute_group_stats(
            regular_matches,
            group_participants,
            scoring_system,
            exclude_decision_matches=True,
            points_for_win=tournament.league_points_win or 3,
            points_for_draw=tournament.league_points_draw or 1,
            points_for_loss=tournament.league_points_loss or 0,
        )
        scoring_system_value = _enum_value(scoring_system)
        for pid in stats:
            stats[pid]["scoring_system"] = scoring_system_value
        group_stats[group.id] = stats

    return get_qualified_participants_from_groups(
        group_rankings=group_rankings,
        qualification_plan=qualification_plan,
        group_stats=group_stats,
        tie_breaking_rules=tournament.tie_breaking_rules,
    )


def _tournament_response_with_summary(db: Session, tournament: Tournament) -> TournamentResponse:
    """Echte Teilnehmerzahl + Siegername für Karten/Listen (nicht Planungsfelder)."""
    data = TournamentResponse.model_validate(tournament).model_dump()
    cnt = (
        db.query(func.count(TournamentParticipant.id))
        .filter(TournamentParticipant.tournament_id == tournament.id)
        .scalar()
    )
    data["participant_count"] = int(cnt or 0)
    winner_name = None
    if tournament.status == TournamentStatus.COMPLETED:
        placements = get_tournament_placements(db, tournament)
        for pid, place in placements.items():
            if place == 1:
                p = db.query(Participant).filter(Participant.id == pid).first()
                if p:
                    winner_name = f"{p.first_name} {(p.last_name or '').strip()}".strip()
                break
    data["winner_name"] = winner_name
    return TournamentResponse(**data)


@router.get("", response_model=List[TournamentResponse])
async def get_tournaments(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get all tournaments with pagination (filtered by visibility)"""
    tournaments = get_visible_tournaments_query(db, current_user).offset(skip).limit(limit).all()
    return [_tournament_response_with_summary(db, t) for t in tournaments]


@router.get("/templates", response_model=List[TournamentResponse])
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get all tournament templates"""
    tournaments = get_visible_tournaments_query(db, current_user).filter(Tournament.is_template == True).offset(skip).limit(limit).all()
    return [_tournament_response_with_summary(db, t) for t in tournaments]


@router.get("/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get a specific tournament by ID (visibility checked)"""
    tournament = _get_accessible_tournament(db, tournament_id, current_user)
    return _tournament_response_with_summary(db, tournament)


@router.get("/{tournament_id}/qualified-participants")
async def get_qualified_participants_for_ko_r1(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
):
    """Teilnehmer für KO R1 (reiner KO: alle; Kombi: qualifizierte) – für manuelle Auslosung UI."""
    tournament = _get_accessible_tournament(db, tournament_id, current_user)
    if not tournament.has_ko_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine KO-Phase",
        )
    participant_ids = _get_qualified_participant_ids_for_ko(db, tournament)
    if not participant_ids:
        return {"participant_ids": [], "participants": []}
    rows = (
        db.query(Participant)
        .filter(Participant.id.in_(participant_ids))
        .all()
    )
    id_to_row = {p.id: p for p in rows}
    ordered = [id_to_row[pid] for pid in participant_ids if pid in id_to_row]
    return {
        "participant_ids": participant_ids,
        "participants": [
            {"id": p.id, "first_name": p.first_name, "last_name": p.last_name or ""}
            for p in ordered
        ],
    }


@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    tournament_data: TournamentCreate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Create a new tournament"""
    requested_has_ko = bool(
        tournament_data.has_ko_phase or tournament_data.mode in {TournamentMode.KNOCKOUT, TournamentMode.COMBINED}
    )
    if requested_has_ko:
        provided_fields = set(getattr(tournament_data, "model_fields_set", set()))
        required_modern_fields = {"mode_variant", "ko_pairing_mode", "ko_draw_method"}
        missing_fields = sorted(field for field in required_modern_fields if field not in provided_fields)
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Für neue KO/Kombi-Turniere sind mode_variant, ko_pairing_mode und ko_draw_method "
                    f"verpflichtend. Fehlend: {', '.join(missing_fields)}"
                ),
            )

    normalized_data = normalize_mode_payload(tournament_data.model_dump())
    validate_mode_payload(normalized_data)
    tournament_data = TournamentCreate(**normalized_data)

    # Gesetzte Spieler: nie aus Create/Wizard persistieren (Teilnehmer sind da noch unbekannt).
    # Konfiguration nur nach Turniererstellung via POST /set-seeded-participants.
    tournament_data = tournament_data.model_copy(update={"seeded_participant_ids": None})

    # Validate required fields based on mode
    if tournament_data.mode == TournamentMode.COMBINED:
        if not tournament_data.ko_structure or not tournament_data.ko_draw_method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="KO-Struktur und KO-Auslosung sind bei kombiniertem Modus erforderlich"
            )
        if not tournament_data.league_scoring_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ligatabelle Wertung ist bei kombiniertem Modus erforderlich"
            )
        if not tournament_data.tie_breaking_rules or len(tournament_data.tie_breaking_rules) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gleichstandsregeln sind bei kombiniertem Modus erforderlich"
            )
    elif tournament_data.mode == TournamentMode.ROUND_ROBIN:
        if not tournament_data.league_scoring_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ligatabelle Wertung ist bei Liga-Modus erforderlich"
            )
        if not tournament_data.tie_breaking_rules or len(tournament_data.tie_breaking_rules) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gleichstandsregeln sind bei Liga-Modus erforderlich"
            )
    
    # Create tournament: Ersteller = eingeloggter User (Pflicht für private/shared in visibility.py)
    create_data = tournament_data.model_dump(exclude={"mode_variant", "ko_pairing_mode"})
    create_data.pop("creator_id", None)
    tournament = Tournament(**create_data)
    tournament.creator_id = current_user.id
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(
    tournament_id: int,
    tournament_data: TournamentUpdate,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Update a tournament. Groups and matches are deleted if configuration changes."""
    tournament = ensure_tournament_editable(db, tournament_id)
    
    # Fields that require deletion of groups/matches if changed
    config_fields = [
        'mode', 'has_group_phase', 'has_ko_phase', 'groups_count', 
        'participants_per_group', 'group_distribution', 'ko_participants',
        'ko_first_round_size', 'ko_structure', 'ko_draw_method', 'ko_distribution',
        'league_scoring_system', 'tie_breaking_rules', 'mode_variant', 'ko_pairing_mode'
    ]
    
    update_data = tournament_data.model_dump(exclude_unset=True)
    if "mode_variant" in update_data or "ko_pairing_mode" in update_data:
        base_payload = {
            "mode": tournament.mode.value if hasattr(tournament.mode, "value") else tournament.mode,
            "has_group_phase": tournament.has_group_phase,
            "has_ko_phase": tournament.has_ko_phase,
            "ko_structure": tournament.ko_structure.value if tournament.ko_structure is not None and hasattr(tournament.ko_structure, "value") else tournament.ko_structure,
            "league_variant": tournament.league_variant.value if tournament.league_variant is not None and hasattr(tournament.league_variant, "value") else tournament.league_variant,
            "ko_draw_method": tournament.ko_draw_method.value if tournament.ko_draw_method is not None and hasattr(tournament.ko_draw_method, "value") else tournament.ko_draw_method,
            "ko_distribution": tournament.ko_distribution,
            "ko_block_same_group": tournament.ko_block_same_group,
            "mode_variant": getattr(tournament, "mode_variant", None),
            "ko_pairing_mode": getattr(tournament, "ko_pairing_mode", None),
        }
        normalized_full = normalize_mode_payload({**base_payload, **update_data})
        if "mode_variant" in update_data:
            for key in ["mode_variant", "mode", "has_group_phase", "has_ko_phase", "ko_structure", "league_variant"]:
                update_data[key] = normalized_full.get(key)
        if "ko_pairing_mode" in update_data:
            for key in ["ko_pairing_mode", "ko_draw_method", "ko_distribution", "ko_block_same_group"]:
                update_data[key] = normalized_full.get(key)

    validate_mode_payload({
        "mode": update_data.get("mode", tournament.mode.value if hasattr(tournament.mode, "value") else tournament.mode),
        "has_group_phase": update_data.get("has_group_phase", tournament.has_group_phase),
        "ko_draw_method": update_data.get("ko_draw_method", tournament.ko_draw_method.value if tournament.ko_draw_method is not None and hasattr(tournament.ko_draw_method, "value") else tournament.ko_draw_method),
        "ko_pairing_mode": update_data.get("ko_pairing_mode", getattr(tournament, "ko_pairing_mode", None)),
        "ko_structure": update_data.get("ko_structure", tournament.ko_structure.value if tournament.ko_structure is not None and hasattr(tournament.ko_structure, "value") else tournament.ko_structure),
    })

    try:
        validate_tournament_matrix_restrictions_a(**_merged_matrix_validation_kwargs(tournament, update_data))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    # Check if any config fields are being changed
    config_changed = any(field in update_data for field in config_fields)
    
    if config_changed:
        # Delete all related data (groups, matches, etc.)
        db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()
        db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
        db.query(GroupParticipant).filter(
            GroupParticipant.group_id.in_(
                db.query(Group.id).filter(Group.tournament_id == tournament_id)
            )
        ).delete()
        db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    
    # Update fields
    for field, value in update_data.items():
        if field in {"mode_variant", "ko_pairing_mode"}:
            continue
        setattr(tournament, field, value)
    
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tournament(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a tournament (CASCADE deletes all related data) - DEPRECATED: Use POST /{tournament_id}/delete instead"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    if tournament.status == TournamentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turnier ist abgeschlossen; Löschen nur via POST /{tournament_id}/delete mit Passwort"
        )
    
    db.delete(tournament)
    db.commit()
    return None


@router.post("/{tournament_id}/delete", status_code=status.HTTP_200_OK)
async def delete_tournament(
    tournament_id: int,
    payload: Optional[DeleteTournamentRequest] = None,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a tournament (CASCADE deletes all related data)"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    if tournament.status == TournamentStatus.COMPLETED:
        if not payload or payload.password != "414141":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Passwort erforderlich, um ein abgeschlossenes Turnier zu löschen"
            )
    
    # Delete all related data manually (CASCADE in SQLAlchemy doesn't always work as expected)
    # Delete KO matches
    db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()
    # Delete group matches
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    # Delete group participants
    db.query(GroupParticipant).filter(
        GroupParticipant.group_id.in_(
            db.query(Group.id).filter(Group.tournament_id == tournament_id)
        )
    ).delete()
    # Delete groups
    db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    # Delete tournament participants
    db.query(TournamentParticipant).filter(TournamentParticipant.tournament_id == tournament_id).delete()
    # Delete tournament
    db.delete(tournament)
    db.commit()
    return {"message": "Tournament deleted successfully"}


@router.post("/{tournament_id}/simulate-phase", status_code=status.HTTP_200_OK)
@router.post("/{tournament_id}/simulate_phase", status_code=status.HTTP_200_OK)
async def simulate_tournament_phase(
    tournament_id: int,
    payload: PhaseSimulationRequest,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db),
):
    # Wie bei Match-Updates: eingeloggte User mit Zugriff aufs Turnier (nicht nur globale Admins)
    tournament = _get_accessible_tournament(db, tournament_id, current_user)
    if tournament.status == TournamentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turnier ist abgeschlossen; Änderungen sind nicht mehr möglich",
        )

    if payload.min_score < 0 or payload.max_score < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scores müssen >= 0 sein")
    if payload.min_score > payload.max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_score darf nicht größer als max_score sein",
        )

    updated = 0
    skipped = 0

    if payload.phase == "group":
        if not tournament.has_group_phase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dieses Turnier hat keine Gruppenphase",
            )
        query = db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id)
        if payload.group_id is not None:
            query = query.filter(GroupMatch.group_id == payload.group_id)
        group_matches = query.all()
        if not group_matches:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Keine Gruppenspiele für die Simulation gefunden",
            )
        for match in group_matches:
            if match.player1_id is None or match.player2_id is None:
                skipped += 1
                continue
            already_scored = match.score1 is not None or match.score2 is not None
            if already_scored and not payload.overwrite_existing:
                skipped += 1
                continue
            score1, score2 = _random_score_pair(payload.min_score, payload.max_score, payload.allow_draws)
            match.score1 = score1
            match.score2 = score2
            updated += 1
        db.commit()
        return {
            "status": "ok",
            "phase": "group",
            "updated_matches": updated,
            "skipped_matches": skipped,
        }

    if not tournament.has_ko_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dieses Turnier hat keine KO-Phase",
        )

    # Hauptschlacht: Runden 1..N; Bronze (99) wird unten extra behandelt (nicht max über 99 bestimmen)
    max_main_round = (
        db.query(func.max(KnockoutMatch.round))
        .filter(
            KnockoutMatch.tournament_id == tournament_id,
            KnockoutMatch.round >= 1,
            KnockoutMatch.round != BRONZE_ROUND,
        )
        .scalar()
    )
    if not max_main_round:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine KO-Spiele für die Simulation gefunden",
        )

    for round_no in range(1, max_main_round + 1):
        round_matches = (
            db.query(KnockoutMatch)
            .filter(KnockoutMatch.tournament_id == tournament_id, KnockoutMatch.round == round_no)
            .order_by(KnockoutMatch.match_no)
            .all()
        )
        for match in round_matches:
            if not can_enter_ko_result(db, match):
                skipped += 1
                continue
            if match.player1_id is None or match.player2_id is None:
                skipped += 1
                continue
            already_scored = match.score1 is not None or match.score2 is not None
            if already_scored and not payload.overwrite_existing:
                skipped += 1
                continue
            score1, score2 = _random_score_pair(payload.min_score, payload.max_score, payload.allow_draws)
            if score1 == score2:
                if score2 < payload.max_score:
                    score2 += 1
                else:
                    score1 = max(payload.min_score, score1 - 1)
            match.score1 = score1
            match.score2 = score2
            db.flush()
            save_ko_result_and_propagate(db, match.id, score1, score2, force_propagate=True)
            updated += 1

    bronze_matches = (
        db.query(KnockoutMatch)
        .filter(KnockoutMatch.tournament_id == tournament_id, KnockoutMatch.round == BRONZE_ROUND)
        .order_by(KnockoutMatch.match_no)
        .all()
    )
    for match in bronze_matches:
        if not can_enter_ko_result(db, match):
            skipped += 1
            continue
        if match.player1_id is None or match.player2_id is None:
            skipped += 1
            continue
        already_scored = match.score1 is not None or match.score2 is not None
        if already_scored and not payload.overwrite_existing:
            skipped += 1
            continue
        score1, score2 = _random_score_pair(payload.min_score, payload.max_score, payload.allow_draws)
        if score1 == score2:
            if score2 < payload.max_score:
                score2 += 1
            else:
                score1 = max(payload.min_score, score1 - 1)
        match.score1 = score1
        match.score2 = score2
        db.flush()
        save_ko_result_and_propagate(db, match.id, score1, score2, force_propagate=True)
        updated += 1

    return {
        "status": "ok",
        "phase": "ko",
        "updated_matches": updated,
        "skipped_matches": skipped,
    }


@router.post("/{tournament_id}/generate-round-robin", status_code=status.HTTP_201_CREATED)
async def generate_round_robin_matches(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Generate Round Robin matches for all groups in a tournament"""
    tournament = ensure_tournament_editable(db, tournament_id)
    
    # Get all groups for tournament
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    if not groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Gruppen vorhanden. Bitte zuerst Gruppen erstellen."
        )
    
    spielfeld_ids: List[int] = []
    if tournament.location_id:
        spielfelder = (
            db.query(Spielfeld)
            .filter(Spielfeld.location_id == tournament.location_id)
            .order_by(Spielfeld.sort_order, Spielfeld.id)
            .all()
        )
        spielfeld_ids = [s.id for s in spielfelder]
    
    assignment_mode = _normalize_spielfeld_assignment_mode(tournament.spielfeld_assignment_mode)
    rng = random.Random(tournament.ko_random_seed) if tournament.ko_random_seed is not None else random.Random()
    
    # Delete existing matches
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    
    # Generate matches for each group
    total_matches = 0
    matches_to_assign: List[Tuple[int, int, int, GroupMatch]] = []
    for group in groups:
        # Get participants in this group
        participant_ids = [gp.participant_id for gp in group.participants]
        
        # Validate
        is_valid, error_msg = validate_round_robin_participants(participant_ids)
        if not is_valid:
            continue  # Skip group if not valid
        
        # Get league variant and multiplier
        variant = tournament.league_variant.value if tournament.league_variant else 'classic'
        multiplier = tournament.league_rounds_multiplier if tournament.league_rounds_multiplier else 1
        
        # Generate rounds
        if getattr(tournament, "mode_variant", None) in ("L4", "C2"):
            rounds_count = max(3, int(math.ceil(math.log2(max(2, len(participant_ids))))) + 1)
            rounds = generate_swiss_like_rounds(
                participant_ids,
                rounds_count=rounds_count,
                rng_seed=tournament.ko_random_seed,
            )
        else:
            rounds = generate_round_robin_rounds(participant_ids, multiplier=multiplier, variant=variant)
        
        # Create matches
        match_no = 1
        for round_idx, pairs in enumerate(rounds, start=1):
            for player1_id, player2_id in pairs:
                match = GroupMatch(
                    tournament_id=tournament_id,
                    group_id=group.id,
                    round=round_idx,
                    match_no=match_no,
                    player1_id=player1_id,
                    player2_id=player2_id
                )
                db.add(match)
                matches_to_assign.append((round_idx, group.id, match_no, match))
                total_matches += 1
                match_no += 1

    if spielfeld_ids:
        if assignment_mode == 'group_random':
            group_to_spielfeld = {g.id: rng.choice(spielfeld_ids) for g in groups}
            for _, group_id, __, match in matches_to_assign:
                match.spielfeld_id = group_to_spielfeld.get(group_id)
        elif assignment_mode == 'group_fixed':
            group_to_spielfeld = {g.id: g.spielfeld_id for g in groups}
            for _, group_id, __, match in matches_to_assign:
                match.spielfeld_id = group_to_spielfeld.get(group_id)
        else:
            spielfeld_counts = {sid: 0 for sid in spielfeld_ids}
            for _, group_id, match_no, match in sorted(
                matches_to_assign,
                key=lambda item: (item[0], item[1], item[2])
            ):
                if match.player1_id is None or match.player2_id is None:
                    continue
                min_count = min(spielfeld_counts.values())
                candidates = [sid for sid, count in spielfeld_counts.items() if count == min_count]
                chosen = rng.choice(candidates)
                match.spielfeld_id = chosen
                spielfeld_counts[chosen] += 1

    db.commit()
    
    return {
        "message": "Round Robin matches generated successfully",
        "groups_processed": len(groups),
        "matches_created": total_matches
    }


@router.post("/{tournament_id}/generate-groups", status_code=status.HTTP_201_CREATED)
async def generate_groups_and_distribute(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    """Generate groups and randomly distribute participants"""
    tournament = ensure_tournament_editable(db, tournament_id)
    
    # Get participants registered for this tournament
    tournament_participants = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id
    ).all()
    
    if not tournament_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Teilnehmer für dieses Turnier registriert. Bitte zuerst Teilnehmer hinzufügen."
        )
    
    participant_ids = [tp.participant_id for tp in tournament_participants]
    num_groups = tournament.groups_count

    _validate_seeded_before_group_generation(
        tournament.group_distribution,
        num_groups,
        participant_ids,
        tournament.seeded_participant_ids,
    )
    
    # Validate distribution parameters for automatic assignment modes only.
    # Manual mode allows empty groups and later manual placement.
    if tournament.group_distribution != 'manual':
        is_valid, error_msg = validate_distribution(participant_ids, num_groups)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
    
    # Delete existing groups and their matches
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    db.query(GroupParticipant).filter(
        GroupParticipant.group_id.in_(
            db.query(Group.id).filter(Group.tournament_id == tournament_id)
        )
    ).delete()
    db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    db.commit()
    
    distributed = _distributed_groups_for_auto(
        participant_ids,
        num_groups,
        tournament.group_distribution or "random",
        tournament.seeded_participant_ids,
    )
    
    # Create groups and assign participants
    groups_created = 0
    participants_assigned = 0
    
    for group_idx, group_participants in enumerate(distributed):
        group_name = f"Gruppe {chr(65 + group_idx)}"  # A, B, C, D...
        
        # Create group
        group = Group(
            tournament_id=tournament_id,
            name=group_name
        )
        db.add(group)
        db.flush()  # Get the group ID
        
        # Assign participants
        for participant_id in group_participants:
            group_participant = GroupParticipant(
                group_id=group.id,
                participant_id=participant_id
            )
            db.add(group_participant)
            participants_assigned += 1
        
        groups_created += 1
    
    db.commit()
    
    return {
        "message": "Gruppen erfolgreich generiert und Teilnehmer verteilt" if tournament.group_distribution != 'manual' else "Gruppen erfolgreich generiert (manuelle Zuweisung aktiv)",
        "groups_created": groups_created,
        "participants_assigned": participants_assigned,
        "distribution_method": tournament.group_distribution
    }


@router.post("/{tournament_id}/auto-distribute-groups")
async def auto_distribute_groups(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """
    Automatically distribute tournament participants into groups.
    Creates groups if they don't exist and generates Round Robin matches.
    """
    tournament = ensure_tournament_editable(db, tournament_id)
    
    if tournament.group_distribution == 'manual':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auto-Verteilung ist bei manueller Auslosungsart deaktiviert. Bitte Gruppen erzeugen und Teilnehmer manuell zuweisen."
        )

    # Get tournament participants
    tournament_participants = db.query(TournamentParticipant).filter(
        TournamentParticipant.tournament_id == tournament_id
    ).all()
    
    if not tournament_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Teilnehmer für dieses Turnier vorhanden. Bitte zuerst Teilnehmer hinzufügen."
        )
    
    participant_ids = [tp.participant_id for tp in tournament_participants]

    _validate_seeded_before_group_generation(
        tournament.group_distribution,
        tournament.groups_count,
        participant_ids,
        tournament.seeded_participant_ids,
    )
    
    # Validate distribution
    is_valid, error_msg = validate_distribution(participant_ids, tournament.groups_count)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Delete existing groups and their data
    db.query(GroupMatch).filter(GroupMatch.tournament_id == tournament_id).delete()
    db.query(GroupParticipant).filter(
        GroupParticipant.group_id.in_(
            db.query(Group.id).filter(Group.tournament_id == tournament_id)
        )
    ).delete()
    db.query(Group).filter(Group.tournament_id == tournament_id).delete()
    
    distributed = _distributed_groups_for_auto(
        participant_ids,
        tournament.groups_count,
        tournament.group_distribution or "random",
        tournament.seeded_participant_ids,
    )
    
    # Create groups
    for i, group_participants in enumerate(distributed):
        group_name = f"Gruppe {chr(65 + i)}"  # A, B, C, etc.
        group = Group(tournament_id=tournament_id, name=group_name)
        db.add(group)
        db.flush()  # Get group ID
        
        # Add participants to group
        for participant_id in group_participants:
            gp = GroupParticipant(group_id=group.id, participant_id=participant_id)
            db.add(gp)
    
    db.commit()
    
    # Refresh to get new groups
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    
    # Generate Round Robin matches
    total_matches = 0
    for group in groups:
        participant_ids = [gp.participant_id for gp in group.participants]
        
        # Validate
        is_valid, error_msg = validate_round_robin_participants(participant_ids)
        if not is_valid:
            continue
        
        # Get league variant and multiplier
        variant = tournament.league_variant.value if tournament.league_variant else 'classic'
        multiplier = tournament.league_rounds_multiplier if tournament.league_rounds_multiplier else 1
        
        # Generate rounds
        if getattr(tournament, "mode_variant", None) in ("L4", "C2"):
            rounds_count = max(3, int(math.ceil(math.log2(max(2, len(participant_ids))))) + 1)
            rounds = generate_swiss_like_rounds(
                participant_ids,
                rounds_count=rounds_count,
                rng_seed=tournament.ko_random_seed,
            )
        else:
            rounds = generate_round_robin_rounds(participant_ids, multiplier=multiplier, variant=variant)
        
        # Create matches
        match_no = 1
        for round_idx, pairs in enumerate(rounds, start=1):
            for player1_id, player2_id in pairs:
                match = GroupMatch(
                    tournament_id=tournament_id,
                    group_id=group.id,
                    round=round_idx,
                    match_no=match_no,
                    player1_id=player1_id,
                    player2_id=player2_id
                )
                db.add(match)
                total_matches += 1
                match_no += 1
    
    db.commit()
    
    return {
        "message": "Groups created and Round Robin matches generated successfully",
        "groups_created": len(groups),
        "matches_created": total_matches
    }


@router.post("/{tournament_id}/generate-ko-bracket", status_code=status.HTTP_201_CREATED)
async def generate_ko_bracket_matches(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Generate KO bracket from completed group phase (combined mode) or directly from participants (knockout mode)"""
    tournament = ensure_tournament_editable(db, tournament_id)
    
    # Check tournament has KO phase
    if not tournament.has_ko_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dieses Turnier hat keine KO-Phase konfiguriert"
        )
    
    def _resolve_draw_config(current_tournament: Tournament) -> tuple[str, str, bool]:
        """
        Resolve KO generation mode/draw method from modern + legacy fields.
        Returns: (mode, draw_method, random_each_round_active)
        """
        draw_method = _enum_value(current_tournament.ko_draw_method)
        ko_distribution = (current_tournament.ko_distribution or "").strip()
        known_draw_methods = {
            "fixed_cross",
            "same_position_cross",
            "overall_seeding",
            "pot_system",
            "full_random",
            "bonus_draw_for_winners",
            "predefined_bracket",
            "manual",
            "random_each_round",
        }

        if draw_method:
            if draw_method not in known_draw_methods:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unbekannte KO-Auslosungsmethode: {draw_method}"
                )
            random_each_round_active = draw_method == "random_each_round"
            mode = "cross" if draw_method in {"fixed_cross", "same_position_cross"} else "draw"
            return mode, draw_method, random_each_round_active

        # Legacy read fallback for existing tournaments without modern fieldset.
        legacy_map = {
            "cross": "fixed_cross",
            "draw": "full_random",
            "random_first_round": "full_random",
            "predefined_slots": "manual",
            "random_each_round": "random_each_round",
        }
        mapped = legacy_map.get(ko_distribution)
        if not mapped:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Keine valide KO-Auslosung konfiguriert. "
                    "Bitte ko_draw_method/ko_pairing_mode setzen."
                ),
            )
        mode = "cross" if mapped in {"fixed_cross", "same_position_cross"} else "draw"
        return mode, mapped, mapped == "random_each_round"

    ko_structure_value = _enum_value(getattr(tournament, "ko_structure", None))

    # Check if this is a pure knockout tournament (no groups) or combined tournament (with groups)
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    
    if tournament.mode == TournamentMode.KNOCKOUT and not groups:
        # Pure knockout mode: generate bracket directly from participants
        tournament_participants = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == tournament_id
        ).all()
        
        if len(tournament_participants) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mindestens 2 Teilnehmer benötigt für KO-Bracket"
            )
        
        participant_ids = [tp.participant_id for tp in tournament_participants]

        # Resolve draw behavior from modern + legacy settings.
        _, draw_method, random_each_round_active = _resolve_draw_config(tournament)
        draw_method = _enum_value(draw_method)

        pure_ko_supported_methods = {
            'full_random',
            'pot_system',
            'overall_seeding',
            'predefined_bracket',
            'manual',
            'random_each_round',
        }
        if draw_method not in pure_ko_supported_methods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"KO-Auslosungsmethode '{draw_method}' ist im KO-Modus nicht unterstützt."
            )

        if draw_method in {'fixed_cross', 'same_position_cross', 'bonus_draw_for_winners'}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Diese Auslosungsmethode setzt eine Gruppenphase voraus "
                    "(Kreuzpaarung oder Bonus fuer Gruppensieger). "
                    "Bitte Seeding, Zufall oder manuell verwenden."
                ),
            )

        generation_draw_method = 'full_random' if random_each_round_active else draw_method

        # For manual mode, don't generate matches automatically - user will set them manually
        if draw_method == 'manual':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bei manueller Auslosung müssen die Paarungen manuell über die Turnier-Verwaltung festgelegt werden. "
                       "Bitte verwenden Sie die Funktion 'Paarungen manuell erstellen' im Turnier-Bereich."
            )

        def _apply_seeded_order(ids: List[int]) -> List[int]:
            seeded = tournament.seeded_participant_ids or []
            seeded_ids = [pid for pid in seeded if pid in ids]
            remaining_ids = [pid for pid in ids if pid not in seeded_ids]
            if remaining_ids:
                participants = db.query(Participant).filter(Participant.id.in_(remaining_ids)).all()
                participants.sort(key=lambda p: (p.last_name.lower(), p.first_name.lower(), p.id))
                remaining_ids = [p.id for p in participants]
            return seeded_ids + remaining_ids

        if generation_draw_method in ('overall_seeding', 'pot_system'):
            participant_ids = _apply_seeded_order(participant_ids)

        rng_seed = tournament.ko_random_seed
        
        # Generate KO bracket
        try:
            ko_matches = generate_ko_bracket_from_participants(
                participant_ids=participant_ids,
                draw_method=generation_draw_method,
                rng_seed=rng_seed,
                ko_structure=ko_structure_value
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            logger.exception("KO bracket generation failed (pure knockout)", exc_info=e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"KO-Generierung fehlgeschlagen (KO-Modus): {str(e)}"
            )
        
        # Note: generate_ko_bracket_from_participants already creates consolation matches
        # if ko_structure == 'consolation_bracket', so we don't need to create them again here
        
        # Handle other KO structures that need special generation
        if ko_structure_value == 'double_elimination':
            from app.services.ko_bracket import generate_double_elimination_bracket
            ko_matches = generate_double_elimination_bracket(
                participant_ids=participant_ids,
                draw_method=generation_draw_method,
                rng_seed=rng_seed
            )
        elif ko_structure_value == 'triple_elimination':
            from app.services.ko_bracket import generate_triple_elimination_bracket
            ko_matches = generate_triple_elimination_bracket(
                participant_ids=participant_ids,
                draw_method=generation_draw_method,
                rng_seed=rng_seed
            )
        elif ko_structure_value == 'aggregate_ko':
            from app.services.ko_bracket import generate_aggregate_ko_bracket
            ko_matches = generate_aggregate_ko_bracket(
                participant_ids=participant_ids,
                draw_method=generation_draw_method,
                rng_seed=rng_seed
            )
        elif ko_structure_value == 'page_playoff':
            from app.services.ko_bracket import generate_page_playoff_bracket
            ko_matches = generate_page_playoff_bracket(
                participant_ids=participant_ids,
                draw_method=generation_draw_method,
                rng_seed=rng_seed
            )
        
        # Calculate bracket size from first round matches
        first_round_matches = [m for m in ko_matches if m['round'] == 1]
        bracket_size = len(first_round_matches) * 2
        mode = generation_draw_method
        first_round_size = bracket_size
        
    else:
        # Combined mode: generate bracket from groups
        if not groups:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Keine Gruppen vorhanden"
            )
        
        # Compute group rankings
        group_rankings = {}
        participant_cache = {}  # To speed up lookup
        
        for group in groups:
            # Get group participants
            group_participants = [gp.participant_id for gp in group.participants]
            participant_cache.update({p: True for p in group_participants})
            
            # Get regular matches (non-decision)
            regular_matches_data = db.query(GroupMatch).filter(
                GroupMatch.tournament_id == tournament_id,
                GroupMatch.group_id == group.id,
                GroupMatch.is_decision_match == False
            ).all()
            
            regular_matches = [
                {
                    'player1_id': m.player1_id,
                    'player2_id': m.player2_id,
                    'score1': m.score1,
                    'score2': m.score2
                }
                for m in regular_matches_data
            ]
            
            # Get decision matches (if any)
            decision_matches_data = db.query(GroupMatch).filter(
                GroupMatch.tournament_id == tournament_id,
                GroupMatch.group_id == group.id,
                GroupMatch.is_decision_match == True
            ).all()
            
            decision_matches = [
                {
                    'player1_id': m.player1_id,
                    'player2_id': m.player2_id,
                    'score1': m.score1,
                    'score2': m.score2
                }
                for m in decision_matches_data
            ]
            
            # Compute ranking with decision matches considered
            from app.models.tournament import LeagueScoringSystem
            scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
            
            if decision_matches:
                ranking, _ = compute_ranking_with_decision_matches(
                    regular_matches=regular_matches,
                    decision_matches=decision_matches,
                    participant_ids=group_participants,
                    scoring_system=scoring_system,
                    tie_breaking_rules=tournament.tie_breaking_rules,
                    points_for_win=tournament.league_points_win or 3,
                    points_for_draw=tournament.league_points_draw or 1,
                    points_for_loss=tournament.league_points_loss or 0,
                )
            else:
                ranking = compute_group_ranking_with_rules(
                    regular_matches,
                    group_participants,
                    scoring_system,
                    tournament.tie_breaking_rules,
                    points_for_win=tournament.league_points_win or 3,
                    points_for_draw=tournament.league_points_draw or 1,
                    points_for_loss=tournament.league_points_loss or 0,
                )
            
            group_rankings[group.id] = ranking
        
        # Get first_round_size and qualification_plan from tournament settings
        qualification_plan = None
        first_round_size = 4  # Default fallback
        
        # Use new ko_start_round logic if available
        if tournament.ko_start_round:
            groups_count = _effective_groups_count(tournament, groups)
            if groups_count <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ungültige Gruppenanzahl für Qualifikationsplan"
                )
            qualification_plan = calculate_qualification_plan(
                groups_count=groups_count,
                ko_start_round=tournament.ko_start_round
            )
            first_round_size = qualification_plan.get("required_participants", 4)
            # Store fallback qualifiers if not already set
            stored_fallback = _normalize_fallback_rules(tournament.ko_fallback_qualifiers)
            if not stored_fallback and qualification_plan.get("fallback_rules"):
                tournament.ko_fallback_qualifiers = qualification_plan.get("fallback_rules")
                stored_fallback = _normalize_fallback_rules(tournament.ko_fallback_qualifiers)
            # Merge manual selections from stored fallback qualifiers
            if stored_fallback:
                merged_fallback_rules = []
                for rule in qualification_plan.get("fallback_rules", []):
                    matched = next(
                        (
                            stored
                            for stored in stored_fallback
                            if stored.get("position") == rule.get("position")
                            and stored.get("count") == rule.get("count")
                        ),
                        None
                    )
                    if matched and matched.get("manual_selected_ids"):
                        merged_rule = {**rule, "manual_selected_ids": matched.get("manual_selected_ids")}
                    else:
                        merged_rule = rule
                    merged_fallback_rules.append(merged_rule)
                qualification_plan["fallback_rules"] = merged_fallback_rules
        else:
            # Legacy: use ko_first_round_size or ko_participants
            if tournament.ko_first_round_size:
                first_round_size = tournament.ko_first_round_size
            elif tournament.ko_participants:
                first_round_size = tournament.ko_participants
        
        if first_round_size not in (4, 8, 16, 32):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ungültige erste KO-Runde: {first_round_size}. Muss 4, 8, 16 oder 32 sein"
            )
        
        # Determine draw mode + draw method for combined tournaments.
        mode, draw_method, random_each_round_active = _resolve_draw_config(tournament)
        generation_draw_method = 'full_random' if random_each_round_active else draw_method

        if generation_draw_method == 'manual':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manuelle KO-Auslosung ist aktuell nur im reinen KO-Modus unterstuetzt."
            )

        # Activate explicit group-winner preference when requested.
        if tournament.ko_group_winner_advantage and mode == 'draw' and generation_draw_method not in {'bonus_draw_for_winners'}:
            generation_draw_method = 'bonus_draw_for_winners'
        
        # For qualification plan with fallback rules, we need to compute stats for proper ranking
        # Compute group stats for qualification service
        from app.services.decision_matches import compute_group_stats
        from app.models.tournament import LeagueScoringSystem
        
        scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
        group_stats_dict = {}
        
        if qualification_plan and qualification_plan.get("fallback_rules"):
            for group in groups:
                group_participants = [gp.participant_id for gp in group.participants]
                matches_data = db.query(GroupMatch).filter(
                    GroupMatch.tournament_id == tournament_id,
                    GroupMatch.group_id == group.id,
                    GroupMatch.is_decision_match == False
                ).all()
                
                matches = [
                    {
                        'player1_id': m.player1_id,
                        'player2_id': m.player2_id,
                        'score1': m.score1,
                        'score2': m.score2
                    }
                    for m in matches_data
                ]
                
                stats = compute_group_stats(
                    matches,
                    group_participants,
                    scoring_system,
                    exclude_decision_matches=True,
                    points_for_win=tournament.league_points_win or 3,
                    points_for_draw=tournament.league_points_draw or 1,
                    points_for_loss=tournament.league_points_loss or 0,
                )
                # Add scoring_system to each stat
                scoring_system_value = _enum_value(scoring_system)
                for pid in stats:
                    stats[pid]["scoring_system"] = scoring_system_value
                group_stats_dict[group.id] = stats
            
            # Update qualification plan to use stats for ranking
            # We'll pass group_stats_dict to the qualification service when generating bracket
            # But for now, we'll let the qualification service handle it internally
        else:
            group_stats_dict = None
        
        # Generate KO bracket
        try:
            ko_matches = generate_ko_bracket_from_groups(
                group_rankings=group_rankings,
                first_round_size=first_round_size,
                mode=mode,
                qualification_plan=qualification_plan,
                block_same_group=tournament.ko_block_same_group,
                block_same_position=tournament.ko_block_same_position,
                group_stats=group_stats_dict,
                tie_breaking_rules=tournament.tie_breaking_rules,
                draw_method=generation_draw_method,
            )
        except Exception as e:
            # Compatibility fallback: if cross/group logic fails on legacy data,
            # fall back to participant-based generation from qualified participants.
            logger.warning("Group-based KO generation failed; trying participant fallback", exc_info=e)
            try:
                from app.services.qualification import get_qualified_participants_from_groups

                if qualification_plan:
                    qualified_participants = get_qualified_participants_from_groups(
                        group_rankings=group_rankings,
                        qualification_plan=qualification_plan,
                        group_stats=group_stats_dict,
                        tie_breaking_rules=tournament.tie_breaking_rules,
                    )
                else:
                    per_group = max(1, first_round_size // max(1, len(group_rankings)))
                    qualified_participants = []
                    for _, ranking in sorted(group_rankings.items()):
                        qualified_participants.extend(ranking[:per_group])

                # Deduplicate while preserving order
                seen = set()
                qualified_participants = [pid for pid in qualified_participants if not (pid in seen or seen.add(pid))]

                if len(qualified_participants) < 2:
                    raise ValueError("Zu wenige qualifizierte Teilnehmer für KO-Fallback")

                # If cross pairing fails for a combined qualification setup (e.g. 10 groups -> 32 KO),
                # keep the intended "group winners vs weakest qualifiers" behavior by seeded fallback.
                if qualification_plan and generation_draw_method in {"fixed_cross", "same_position_cross"}:
                    try:
                        from app.services.qualification import rank_candidates_with_keys

                        qualified_set = set(qualified_participants)
                        ordered_qualified: List[int] = []
                        used_ids = set()

                        max_position = int(qualification_plan.get("basis_per_group", 0) or 0)
                        for rule in qualification_plan.get("fallback_rules", []) or []:
                            max_position = max(max_position, int(rule.get("position", 0) or 0))
                        if max_position <= 0:
                            max_position = 1

                        for position in range(1, max_position + 1):
                            ranked_candidates = rank_candidates_with_keys(
                                group_rankings=group_rankings,
                                position=position,
                                group_stats=group_stats_dict,
                                tie_breaking_rules=tournament.tie_breaking_rules,
                            )
                            for candidate in ranked_candidates:
                                participant_id = candidate.get("participant_id")
                                if participant_id in qualified_set and participant_id not in used_ids:
                                    ordered_qualified.append(participant_id)
                                    used_ids.add(participant_id)

                        for participant_id in qualified_participants:
                            if participant_id not in used_ids:
                                ordered_qualified.append(participant_id)

                        qualified_participants = ordered_qualified
                    except Exception as ordering_error:
                        logger.warning("Seeded ordering for cross fallback failed; using default qualified order", exc_info=ordering_error)

                safe_methods = {
                    "full_random",
                    "pot_system",
                    "overall_seeding",
                    "predefined_bracket",
                    "bonus_draw_for_winners",
                    "manual",
                }
                fallback_draw_method = generation_draw_method if generation_draw_method in safe_methods else "full_random"
                if fallback_draw_method == "manual":
                    fallback_draw_method = "full_random"
                if qualification_plan and generation_draw_method in {"fixed_cross", "same_position_cross"}:
                    fallback_draw_method = "overall_seeding"

                ko_matches = generate_ko_bracket_from_participants(
                    participant_ids=qualified_participants,
                    draw_method=fallback_draw_method,
                    rng_seed=tournament.ko_random_seed,
                    ko_structure=ko_structure_value,
                )
                mode = fallback_draw_method
            except Exception as fallback_error:
                logger.exception("KO fallback generation also failed", exc_info=fallback_error)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"KO-Generierung fehlgeschlagen (Gruppenmodus): {str(fallback_error)}"
                )
        
        # Generate additional structures if needed
        if ko_structure_value == 'consolation_bracket':
            from app.services.ko_bracket import generate_consolation_bracket_from_first_round_losers
            first_round_matches = [m for m in ko_matches if m['round'] == 1]
            # Get draw method for consolation bracket
            consolation_draw_method = None
            if generation_draw_method in ('full_random', 'pot_system', 'overall_seeding', 'predefined_bracket', 'bonus_draw_for_winners'):
                consolation_draw_method = generation_draw_method
            consolation_matches = generate_consolation_bracket_from_first_round_losers(
                first_round_matches=first_round_matches,
                rng_seed=tournament.ko_random_seed,
                draw_method=consolation_draw_method
            )
            ko_matches.extend(consolation_matches)
        elif ko_structure_value in ('double_elimination', 'triple_elimination', 'aggregate_ko', 'page_playoff'):
            # For combined mode with these structures, we need to generate from qualified participants
            # Get qualified participants from group rankings
            qualified_participants = []
            for group_id, ranking in group_rankings.items():
                # Take first N participants based on qualification plan
                if qualification_plan:
                    basis_per_group = qualification_plan.get("basis_per_group", 0)
                    qualified_participants.extend(ranking[:basis_per_group])
                else:
                    qualifiers_per_group = first_round_size // len(group_rankings)
                    qualified_participants.extend(ranking[:qualifiers_per_group])
            
            if ko_structure_value == 'double_elimination':
                from app.services.ko_bracket import generate_double_elimination_bracket
                ko_matches = generate_double_elimination_bracket(
                    participant_ids=qualified_participants,
                    draw_method=generation_draw_method if generation_draw_method in ('full_random', 'pot_system', 'overall_seeding', 'predefined_bracket', 'bonus_draw_for_winners') else 'full_random',
                    rng_seed=tournament.ko_random_seed
                )
            elif ko_structure_value == 'triple_elimination':
                from app.services.ko_bracket import generate_triple_elimination_bracket
                ko_matches = generate_triple_elimination_bracket(
                    participant_ids=qualified_participants,
                    draw_method=generation_draw_method if generation_draw_method in ('full_random', 'pot_system', 'overall_seeding', 'predefined_bracket', 'bonus_draw_for_winners') else 'full_random',
                    rng_seed=tournament.ko_random_seed
                )
            elif ko_structure_value == 'aggregate_ko':
                from app.services.ko_bracket import generate_aggregate_ko_bracket
                ko_matches = generate_aggregate_ko_bracket(
                    participant_ids=qualified_participants,
                    draw_method=generation_draw_method if generation_draw_method in ('full_random', 'pot_system', 'overall_seeding', 'predefined_bracket', 'bonus_draw_for_winners') else 'full_random',
                    rng_seed=tournament.ko_random_seed
                )
            elif ko_structure_value == 'page_playoff':
                from app.services.ko_bracket import generate_page_playoff_bracket
                ko_matches = generate_page_playoff_bracket(
                    participant_ids=qualified_participants,
                    draw_method=generation_draw_method if generation_draw_method in ('full_random', 'pot_system', 'overall_seeding', 'predefined_bracket', 'bonus_draw_for_winners') else 'overall_seeding',
                    rng_seed=tournament.ko_random_seed
                )
        
        bracket_size = first_round_size
        # mode already set above for combined mode

    ko_matches = append_third_place_placeholder_if_needed(
        ko_matches,
        ko_third_place_match=getattr(tournament, "ko_third_place_match", False),
        ko_structure=ko_structure_value,
    )

    # Delete existing KO matches
    db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()
    
    # Create KO matches
    created_matches = []
    for match_data in ko_matches:
        ko_match = KnockoutMatch(
            tournament_id=tournament_id,
            round=match_data['round'],
            match_no=match_data['match_no'],
            player1_id=match_data.get('player1_id'),
            player2_id=match_data.get('player2_id'),
            score1=match_data.get('score1'),  # May be set for byes (3:0)
            score2=match_data.get('score2')   # May be set for byes (3:0)
        )
        db.add(ko_match)
        created_matches.append(ko_match)
    
    db.commit()
    
    # Propagate bye matches immediately (matches with scores already set)
    from app.services.ko_propagation import save_ko_result_and_propagate, assign_consolation_first_round_losers
    for ko_match in created_matches:
        # If scores are set (for byes), propagate immediately
        if ko_match.score1 is not None and ko_match.score2 is not None:
            db.refresh(ko_match)  # Ensure we have the ID
            save_ko_result_and_propagate(
                db,
                ko_match.id,
                ko_match.score1,
                ko_match.score2
            )
    
    # After propagation, assign losers to consolation bracket if all first round matches are completed
    # This is important for cases where matches already have scores (e.g., byes)
    if ko_structure_value == 'consolation_bracket':
        draw_method = None
        if tournament.ko_draw_method:
            draw_method = _enum_value(tournament.ko_draw_method)
        assign_consolation_first_round_losers(
            db,
            tournament_id,
            tournament.ko_random_seed if tournament else None,
            draw_method=draw_method
        )
    
    return {
        "message": "KO-Bracket erfolgreich generiert",
        "matches_created": len(ko_matches),
        "bracket_size": bracket_size,
        "mode": mode
    }


@router.post("/{tournament_id}/manual-ko-bracket", status_code=status.HTTP_201_CREATED)
async def create_manual_ko_bracket(
    tournament_id: int,
    payload: ManualKOBracketRequest,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Create KO bracket aus manuellen Paarungen (KO-Modus oder Kombi mit manueller Auslosung)."""
    tournament = ensure_tournament_editable(db, tournament_id)

    if not tournament.has_ko_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dieses Turnier hat keine KO-Phase konfiguriert"
        )

    if tournament.mode not in (TournamentMode.KNOCKOUT, TournamentMode.COMBINED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manuelle KO-Auslosung ist nur im KO- oder Kombi-Modus möglich"
        )

    draw_method_value = tournament.ko_draw_method.value if tournament.ko_draw_method is not None and hasattr(tournament.ko_draw_method, "value") else tournament.ko_draw_method
    if draw_method_value != 'manual':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manuelle Auslosung ist für dieses Turnier nicht aktiviert"
        )

    if tournament.mode == TournamentMode.KNOCKOUT:
        tournament_participants = db.query(TournamentParticipant).filter(
            TournamentParticipant.tournament_id == tournament_id
        ).all()
        if len(tournament_participants) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mindestens 2 Teilnehmer benötigt für KO-Bracket"
            )
        participant_ids = [tp.participant_id for tp in tournament_participants]
    else:
        if not tournament.has_group_phase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kombi-Turnier ohne Gruppenphase: manuelles KO nicht möglich"
            )
        participant_ids = _get_qualified_participant_ids_for_ko(db, tournament)
        if len(participant_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zu wenige qualifizierte Teilnehmer für das KO-Bracket. Bitte Gruppenphase und Qualifikation prüfen."
            )

    num_participants = len(participant_ids)
    if num_participants <= 4:
        bracket_size = 4
    elif num_participants <= 8:
        bracket_size = 8
    elif num_participants <= 16:
        bracket_size = 16
    elif num_participants <= 32:
        bracket_size = 32
    else:
        bracket_size = 2 ** (int(round(math.log2(num_participants))) + 1)

    expected_pairs = bracket_size // 2
    if len(payload.pairs) != expected_pairs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Es werden genau {expected_pairs} Paarungen erwartet"
        )

    selected_ids = []
    selected_set = set()

    for idx, pair in enumerate(payload.pairs, start=1):
        p1 = pair.player1_id
        p2 = pair.player2_id

        if p1 is not None and p1 not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ungültiger Teilnehmer in Paarung {idx} (Spieler 1)"
            )
        if p2 is not None and p2 not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ungültiger Teilnehmer in Paarung {idx} (Spieler 2)"
            )
        if p1 is not None and p2 is not None and p1 == p2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Teilnehmer darf nicht gegen sich selbst spielen (Paarung {idx})"
            )

        for pid in (p1, p2):
            if pid is None:
                continue
            if pid in selected_set:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Teilnehmer {pid} ist mehrfach zugewiesen"
                )
            selected_set.add(pid)
            selected_ids.append(pid)

    if set(participant_ids) != selected_set:
        missing = sorted(set(participant_ids) - selected_set)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nicht alle Teilnehmer zugewiesen: {missing}"
        )

    ko_matches = []
    match_no = 1
    for pair in payload.pairs:
        ko_matches.append({
            'round': 1,
            'match_no': match_no,
            'player1_id': pair.player1_id,
            'player2_id': pair.player2_id
        })
        match_no += 1

    rounds_total = int(round(math.log2(bracket_size)))
    for r in range(2, rounds_total + 1):
        mcount = max(1, bracket_size // (2 ** r))
        for m in range(1, mcount + 1):
            ko_matches.append({'round': r, 'match_no': m, 'player1_id': None, 'player2_id': None})

    ko_structure_manual = _enum_value(getattr(tournament, "ko_structure", None))
    ko_matches = append_third_place_placeholder_if_needed(
        ko_matches,
        ko_third_place_match=getattr(tournament, "ko_third_place_match", False),
        ko_structure=ko_structure_manual,
    )

    db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).delete()

    for match_data in ko_matches:
        ko_match = KnockoutMatch(
            tournament_id=tournament_id,
            round=match_data['round'],
            match_no=match_data['match_no'],
            player1_id=match_data.get('player1_id'),
            player2_id=match_data.get('player2_id')
        )
        db.add(ko_match)

    db.commit()

    return {
        "message": "Manuelles KO-Bracket erfolgreich erstellt",
        "matches_created": len(ko_matches),
        "bracket_size": bracket_size,
        "mode": "manual"
    }


@router.put("/{tournament_id}/ko-round/{round}/pairings", status_code=status.HTTP_200_OK)
async def set_ko_round_pairings(
    tournament_id: int,
    round: int,
    payload: KoRoundPairingsRequest,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Save pairings for one KO round (1, 2, ... or 99 for Bronze). Only when ko_draw_method is manual."""
    from app.services.ko_propagation import (
        get_winners_of_round,
        get_losers_of_round,
        get_participants_in_round,
        BRONZE_ROUND,
    )

    tournament = ensure_tournament_editable(db, tournament_id)
    if not tournament.has_ko_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine KO-Phase"
        )

    draw_val = tournament.ko_draw_method.value if tournament.ko_draw_method is not None and hasattr(tournament.ko_draw_method, "value") else tournament.ko_draw_method
    if draw_val != "manual":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paarungen pro Runde nur bei manueller Auslosung"
        )

    if round < 1 and round != BRONZE_ROUND:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültige Runde"
        )

    # Allowed participants depend on round context.
    if round == 1:
        if tournament.mode == TournamentMode.COMBINED and tournament.has_group_phase:
            allowed_ids = set(_get_qualified_participant_ids_for_ko(db, tournament))
        else:
            allowed_ids = set(
                pid for (pid,) in db.query(TournamentParticipant.participant_id).filter(
                    TournamentParticipant.tournament_id == tournament_id
                ).all()
            )
        if len(allowed_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mindestens 2 Teilnehmer nötig für KO-Runde 1"
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
            allowed_ids = set(get_participants_in_round(db, tournament_id, round - 1))

    # Validate payload participant usage.
    selected_set = set()
    for item in payload.pairs:
        p1, p2 = item.player1_id, item.player2_id
        if p1 is not None:
            if p1 not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Spieler {p1} ist kein gültiger Teilnehmer für diese Runde"
                )
            if p1 in selected_set:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Spieler {p1} mehrfach in dieser Runde"
                )
            selected_set.add(p1)
        if p2 is not None:
            if p2 not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Spieler {p2} ist kein gültiger Teilnehmer für diese Runde"
                )
            if p2 in selected_set:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Spieler {p2} mehrfach in dieser Runde"
                )
            selected_set.add(p2)

    existing = db.query(KnockoutMatch).filter(
        KnockoutMatch.tournament_id == tournament_id,
        KnockoutMatch.round == round
    ).all()

    # Round 1 may bootstrap whole bracket when it does not exist yet.
    if round == 1 and not existing:
        any_ko = db.query(KnockoutMatch).filter(KnockoutMatch.tournament_id == tournament_id).first()
        if not any_ko:
            bracket_size = len(payload.pairs) * 2
            rounds_total = int(math.log2(bracket_size))
            ko_matches = []
            for idx, pair in enumerate(payload.pairs, start=1):
                ko_matches.append({
                    "round": 1,
                    "match_no": idx,
                    "player1_id": pair.player1_id,
                    "player2_id": pair.player2_id,
                })
            for r in range(2, rounds_total + 1):
                mcount = max(1, bracket_size // (2 ** r))
                for m in range(1, mcount + 1):
                    ko_matches.append({"round": r, "match_no": m, "player1_id": None, "player2_id": None})
            if getattr(tournament, "ko_third_place_match", False):
                ko_matches.append({"round": BRONZE_ROUND, "match_no": 1, "player1_id": None, "player2_id": None})

            manual_ko_spielfeld_ids = []
            if tournament.location_id:
                spielfelder = (
                    db.query(Spielfeld)
                    .filter(Spielfeld.location_id == tournament.location_id)
                    .order_by(Spielfeld.sort_order, Spielfeld.id)
                    .all()
                )
                manual_ko_spielfeld_ids = [s.id for s in spielfelder]

            for match_data in ko_matches:
                sf_id = random.choice(manual_ko_spielfeld_ids) if manual_ko_spielfeld_ids else None
                ko_match = KnockoutMatch(
                    tournament_id=tournament_id,
                    round=match_data["round"],
                    match_no=match_data["match_no"],
                    player1_id=match_data.get("player1_id"),
                    player2_id=match_data.get("player2_id"),
                    spielfeld_id=sf_id,
                )
                db.add(ko_match)
            db.commit()
            return {"message": "Paarungen Runde 1 gespeichert (Bracket erstellt)", "round": 1}
    elif round == 1 and existing:
        by_match_no = {m.match_no: m for m in existing}
        for item in payload.pairs:
            match_row = by_match_no.get(item.match_no)
            if not match_row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Match Runde {round} Nr. {item.match_no} existiert nicht"
                )
            match_row.player1_id = item.player1_id
            match_row.player2_id = item.player2_id
        db.commit()
        return {"message": "Paarungen Runde 1 gespeichert", "round": 1}

    by_match_no = {m.match_no: m for m in existing}
    for item in payload.pairs:
        match_row = by_match_no.get(item.match_no)
        if not match_row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Match Runde {round} Nr. {item.match_no} existiert nicht"
            )
        match_row.player1_id = item.player1_id
        match_row.player2_id = item.player2_id
    db.commit()
    return {"message": f"Paarungen Runde {round} gespeichert", "round": round}


@router.post("/{tournament_id}/duplicate", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_tournament(
    tournament_id: int,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Duplicate a tournament (only configuration, no participants/groups/matches)"""
    original = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    if original.status == TournamentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Abgeschlossene Turniere dürfen nicht dupliziert werden"
        )
    
    # Create new tournament with copied settings
    new_tournament_data = {
        'name': f"{original.name} (Kopie)",
        'description': original.description,
        'start_date': original.start_date,
        'end_date': original.end_date,
        'mode': original.mode,
        'status': TournamentStatus.PLANNED,
        'has_group_phase': original.has_group_phase,
        'has_ko_phase': original.has_ko_phase,
        'groups_count': original.groups_count,
        'participants_per_group': original.participants_per_group,
        'group_distribution': original.group_distribution,
        'ko_participants': original.ko_participants,
        'ko_first_round_size': original.ko_first_round_size,
        'ko_distribution': original.ko_distribution,
        'ko_structure': original.ko_structure,
        'ko_draw_method': original.ko_draw_method,
        'ko_third_place_match': original.ko_third_place_match,
        'ko_group_winner_advantage': original.ko_group_winner_advantage,
        'ko_block_same_group': original.ko_block_same_group,
        'ko_block_same_position': original.ko_block_same_position,
        'ko_random_seed': original.ko_random_seed,
        'league_scoring_system': original.league_scoring_system,
        'tie_breaking_rules': original.tie_breaking_rules,
        'is_template': False,
        'seeded_participant_ids': None,
        'show_matches': original.show_matches,
        'show_tables': original.show_tables,
    }
    new_tournament_data.pop("creator_id", None)

    new_tournament = Tournament(**new_tournament_data)
    new_tournament.creator_id = current_user.id
    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)
    return new_tournament


@router.post("/{tournament_id}/set-template", response_model=TournamentResponse)
async def set_tournament_template(
    tournament_id: int,
    is_template: bool,
    db: Session = Depends(get_db)
):
    """Set or unset tournament as template"""
    tournament = ensure_tournament_editable(db, tournament_id)
    
    tournament.is_template = is_template
    db.commit()
    db.refresh(tournament)
    return tournament


@router.post("/{tournament_id}/set-seeded-participants", response_model=TournamentResponse)
async def set_seeded_participants(
    tournament_id: int,
    participant_ids: List[int],
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Set seeded participants for a tournament"""
    tournament = ensure_tournament_editable(db, tournament_id)
    
    if tournament.group_distribution == 'manual':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bei manueller Auslosungsart können keine gesetzten Spieler für die automatische Gruppenverteilung markiert werden.",
        )
    
    # Check if groups already exist
    existing_groups = db.query(Group).filter(Group.tournament_id == tournament_id).count()
    if existing_groups > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Groups already exist. Seeded participants must be set before generating groups"
        )
    
    # Validate: seeded participants must belong to the tournament participant pool
    tournament_participant_ids = {
        row[0]
        for row in db.query(TournamentParticipant.participant_id).filter(
            TournamentParticipant.tournament_id == tournament_id
        ).all()
    }
    if len(participant_ids) > 0 and len(tournament_participant_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zuerst Turnier-Teilnehmer registrieren, danach können gesetzte Spieler gewählt werden.",
        )
    invalid_ids = [pid for pid in participant_ids if pid not in tournament_participant_ids]
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültige gesetzte Spieler: {invalid_ids}. Nur Turnier-Teilnehmer sind erlaubt."
        )

    # Keep seed order but remove duplicates.
    seen = set()
    normalized_seeded_ids = [pid for pid in participant_ids if not (pid in seen or seen.add(pid))]

    if tournament.groups_count and len(normalized_seeded_ids) > tournament.groups_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Zu viele gesetzte Spieler ({len(normalized_seeded_ids)}). "
                f"Maximal {tournament.groups_count} bei {tournament.groups_count} Gruppen."
            )
        )

    tournament.seeded_participant_ids = normalized_seeded_ids
    db.commit()
    db.refresh(tournament)
    return tournament


@router.get("/{tournament_id}/seeded-participants")
async def get_seeded_participants(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get seeded participants for a tournament"""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    return {
        "tournament_id": tournament_id,
        "seeded_participant_ids": tournament.seeded_participant_ids or []
    }


@router.get("/calculate-qualification-plan")
async def calculate_qualification_plan_endpoint(
    groups_count: int = Query(..., ge=1),
    ko_start_round: KOStartRound = Query(...),
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Calculate qualification plan based on groups count and KO start round"""
    try:
        plan = calculate_qualification_plan(
            groups_count=groups_count,
            ko_start_round=ko_start_round
        )
        return plan
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{tournament_id}/qualification-table")
async def get_qualification_table(
    tournament_id: int,
    current_user = Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    """Get qualification table showing which participants qualify and fallback candidates"""
    from app.services.decision_matches import compute_group_ranking_with_rules
    from app.models.match import GroupMatch
    from app.models.participant import Participant
    from app.services.decision_matches import compute_group_stats, compute_ranking_with_decision_matches
    from app.models.tournament import LeagueScoringSystem
    
    # Check tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with ID {tournament_id} not found"
        )
    
    if not tournament.has_group_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine Gruppenphase"
        )
    
    # Get groups
    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    if not groups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine Gruppen vorhanden"
        )
    
    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    
    # Get qualification plan
    qualification_plan = None
    if tournament.ko_start_round:
        groups_count = _effective_groups_count(tournament, groups)
        if groups_count <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ungültige Gruppenanzahl für Qualifikationsplan"
            )
        qualification_plan = calculate_qualification_plan(
            groups_count=groups_count,
            ko_start_round=tournament.ko_start_round
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine KO-Start-Runde konfiguriert"
        )

    # Merge manual selections from stored fallback qualifiers (if any)
    stored_fallback = _normalize_fallback_rules(tournament.ko_fallback_qualifiers)
    if qualification_plan and stored_fallback:
        merged_fallback_rules = []
        for rule in qualification_plan.get("fallback_rules", []):
            matched = next(
                (
                    stored
                    for stored in stored_fallback
                    if stored.get("position") == rule.get("position")
                    and stored.get("count") == rule.get("count")
                ),
                None
            )
            if matched and matched.get("manual_selected_ids"):
                merged_rule = {**rule, "manual_selected_ids": matched.get("manual_selected_ids")}
            else:
                merged_rule = rule
            merged_fallback_rules.append(merged_rule)
        qualification_plan["fallback_rules"] = merged_fallback_rules
    
    # Get group rankings and stats
    group_rankings = {}
    group_stats = {}
    participants_map = {}
    
    for group in groups:
        group_participants = [gp.participant_id for gp in group.participants]
        
        # Get regular matches (non-decision)
        regular_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tournament_id,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == False
        ).all()
        
        regular_matches = [
            {
                'player1_id': m.player1_id,
                'player2_id': m.player2_id,
                'score1': m.score1,
                'score2': m.score2
            }
            for m in regular_matches_data
        ]
        
        # Get decision matches (if any)
        decision_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tournament_id,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == True
        ).all()
        
        decision_matches = [
            {
                'player1_id': m.player1_id,
                'player2_id': m.player2_id,
                'score1': m.score1,
                'score2': m.score2
            }
            for m in decision_matches_data
        ]
        
        # Compute ranking with decision matches considered
        if decision_matches:
            ranking, decision_winners = compute_ranking_with_decision_matches(
                regular_matches=regular_matches,
                decision_matches=decision_matches,
                participant_ids=group_participants,
                scoring_system=scoring_system,
                tie_breaking_rules=tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        else:
            ranking = compute_group_ranking_with_rules(
                regular_matches,
                group_participants,
                scoring_system,
                tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        
        group_rankings[group.id] = ranking
        
        # Compute stats (only from regular matches, exclude decision matches)
        stats = compute_group_stats(
            regular_matches,
            group_participants,
            scoring_system,
            exclude_decision_matches=True,
            points_for_win=tournament.league_points_win or 3,
            points_for_draw=tournament.league_points_draw or 1,
            points_for_loss=tournament.league_points_loss or 0,
        )
        # Add scoring_system to each stat for ranking
        scoring_system_value = _enum_value(scoring_system)
        for pid in stats:
            stats[pid]["scoring_system"] = scoring_system_value
        group_stats[group.id] = stats
        
        # Get participant details
        participants = db.query(Participant).filter(Participant.id.in_(group_participants)).all()
        for p in participants:
            participants_map[p.id] = p
    
    # Get qualified participants
    from app.services.qualification import get_qualified_participants_from_groups
    qualified_participants = get_qualified_participants_from_groups(
        group_rankings=group_rankings,
        qualification_plan=qualification_plan,
        group_stats=group_stats,
        tie_breaking_rules=tournament.tie_breaking_rules
    )
    
    # Build qualification table
    basis_per_group = qualification_plan["basis_per_group"]
    fallback_rules = qualification_plan.get("fallback_rules", [])
    
    qualification_table = []
    
    # Basis qualifiers (per group)
    for group in sorted(groups, key=lambda g: g.id):
        ranking = group_rankings[group.id]
        group_qualifiers = []
        
        for pos in range(basis_per_group):
            if pos < len(ranking):
                participant_id = ranking[pos]
                participant = participants_map.get(participant_id)
                if participant:
                    stats = group_stats[group.id].get(participant_id, {})
                    group_qualifiers.append({
                        'participant_id': participant_id,
                        'name': f"{participant.first_name} {participant.last_name}",
                        'position': pos + 1,
                        'qualified': participant_id in qualified_participants,
                        'stats': {
                            'points': stats.get('points', 0) if scoring_system == LeagueScoringSystem.POINTS else None,
                            'wins': stats.get('wins', 0),
                            'diff': stats.get('diff', 0),
                            'goals_for': stats.get('goals_for', 0),
                            'goals_against': stats.get('goals_against', 0)
                        }
                    })
        
        qualification_table.append({
            'group_id': group.id,
            'group_name': group.name,
            'basis_qualifiers': group_qualifiers
        })
    
    # Fallback candidates
    fallback_candidates_by_rule = []
    for rule in fallback_rules:
        position = rule["position"]
        count = rule["count"]
        selection = rule.get("selection", "best")
        
        from app.services.qualification import rank_candidates_with_keys, compute_manual_selection_required
        ranked_candidates = rank_candidates_with_keys(
            group_rankings=group_rankings,
            position=position,
            group_stats=group_stats,
            tie_breaking_rules=tournament.tie_breaking_rules
        )
        candidates = [c["participant_id"] for c in ranked_candidates]
        
        # Determine ties at cutoff for manual resolution
        tie_groups: Dict[Tuple, List[int]] = {}
        for candidate in ranked_candidates:
            tie_key = tuple(candidate.get("tie_key", []))
            tie_groups.setdefault(tie_key, []).append(candidate["participant_id"])

        cutoff_tie_group = []
        top_ids = set(candidates[:count])
        for _, group_ids in tie_groups.items():
            if group_ids and any(pid in top_ids for pid in group_ids) and any(pid not in top_ids for pid in group_ids):
                cutoff_tie_group = group_ids
                break

        manual_selection_required = compute_manual_selection_required(
            count, candidates, cutoff_tie_group
        )

        manual_selected_ids = rule.get("manual_selected_ids") if isinstance(rule, dict) else None

        # Get ALL candidates (not just the qualified ones) to show complete ranking
        candidate_details = []
        for candidate_id in candidates:  # Show all candidates, not just [:count]
            participant = participants_map.get(candidate_id)
            if participant:
                # Find which group this candidate is from
                candidate_group_id = None
                candidate_stats = {}
                for gid, ranking in group_rankings.items():
                    if candidate_id in ranking:
                        candidate_group_id = gid
                        candidate_stats = group_stats[gid].get(candidate_id, {})
                        break
                
                candidate_group = next((g for g in groups if g.id == candidate_group_id), None)
                candidate_details.append({
                    'participant_id': candidate_id,
                    'name': f"{participant.first_name} {participant.last_name}",
                    'group_id': candidate_group_id,
                    'group_name': candidate_group.name if candidate_group else None,
                    'position': position,
                    'qualified': candidate_id in qualified_participants,
                    'stats': {
                        'points': candidate_stats.get('points', 0) if scoring_system == LeagueScoringSystem.POINTS else None,
                        'wins': candidate_stats.get('wins', 0),
                        'diff': candidate_stats.get('diff', 0),
                        'goals_for': candidate_stats.get('goals_for', 0),
                        'goals_against': candidate_stats.get('goals_against', 0)
                    }
                })
        
        fallback_candidates_by_rule.append({
            'position': position,
            'count': count,
            'selection': selection,
            'candidates': candidate_details,
            'cutoff_tie_group': cutoff_tie_group,
            'manual_selection_required': manual_selection_required,
            'manual_selected_ids': manual_selected_ids
        })
    
    return {
        'tournament_id': tournament_id,
        'qualification_plan': qualification_plan,
        'basis_per_group': basis_per_group,
        'qualified_count': len(qualified_participants),
        'group_qualifiers': qualification_table,
        'fallback_candidates': fallback_candidates_by_rule,
        'all_qualified_participants': qualified_participants
    }


@router.post("/{tournament_id}/qualification-table/manual", status_code=status.HTTP_200_OK)
async def set_manual_qualification_selection(
    tournament_id: int,
    payload: QualificationManualSelection,
    current_user = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Manually select fallback qualifiers when ties persist"""
    from app.services.decision_matches import compute_group_stats, compute_ranking_with_decision_matches, compute_group_ranking_with_rules
    from app.models.tournament import LeagueScoringSystem
    from app.services.qualification import rank_candidates_with_keys, compute_manual_selection_required

    tournament = ensure_tournament_editable(db, tournament_id)

    if not tournament.has_group_phase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine Gruppenphase"
        )

    if not tournament.ko_start_round:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnier hat keine KO-Start-Runde konfiguriert"
        )

    groups = db.query(Group).filter(Group.tournament_id == tournament_id).all()
    if not groups:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine Gruppen vorhanden"
        )

    groups_count = _effective_groups_count(tournament, groups)
    if groups_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültige Gruppenanzahl für Qualifikationsplan"
        )
    qualification_plan = calculate_qualification_plan(
        groups_count=groups_count,
        ko_start_round=tournament.ko_start_round
    )

    fallback_rules = qualification_plan.get("fallback_rules", [])
    rule = next((r for r in fallback_rules if r.get("position") == payload.position), None)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Fallback-Regel für diese Position"
        )

    required_count = rule.get("count", 0)
    selected_ids = list(dict.fromkeys(payload.selected_ids or []))

    scoring_system = tournament.league_scoring_system or LeagueScoringSystem.POINTS
    group_rankings = {}
    group_stats = {}

    for group in groups:
        group_participants = [gp.participant_id for gp in group.participants]
        regular_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tournament_id,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == False
        ).all()
        regular_matches = [
            {
                'player1_id': m.player1_id,
                'player2_id': m.player2_id,
                'score1': m.score1,
                'score2': m.score2
            }
            for m in regular_matches_data
        ]

        decision_matches_data = db.query(GroupMatch).filter(
            GroupMatch.tournament_id == tournament_id,
            GroupMatch.group_id == group.id,
            GroupMatch.is_decision_match == True
        ).all()
        decision_matches = [
            {
                'player1_id': m.player1_id,
                'player2_id': m.player2_id,
                'score1': m.score1,
                'score2': m.score2
            }
            for m in decision_matches_data
        ]

        if decision_matches:
            ranking, _ = compute_ranking_with_decision_matches(
                regular_matches=regular_matches,
                decision_matches=decision_matches,
                participant_ids=group_participants,
                scoring_system=scoring_system,
                tie_breaking_rules=tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        else:
            ranking = compute_group_ranking_with_rules(
                regular_matches,
                group_participants,
                scoring_system,
                tournament.tie_breaking_rules,
                points_for_win=tournament.league_points_win or 3,
                points_for_draw=tournament.league_points_draw or 1,
                points_for_loss=tournament.league_points_loss or 0,
            )
        group_rankings[group.id] = ranking

        stats = compute_group_stats(
            regular_matches,
            group_participants,
            scoring_system,
            exclude_decision_matches=True,
            points_for_win=tournament.league_points_win or 3,
            points_for_draw=tournament.league_points_draw or 1,
            points_for_loss=tournament.league_points_loss or 0,
        )
        scoring_system_value = _enum_value(scoring_system)
        for pid in stats:
            stats[pid]["scoring_system"] = scoring_system_value
        group_stats[group.id] = stats

    ranked_candidates = rank_candidates_with_keys(
        group_rankings=group_rankings,
        position=payload.position,
        group_stats=group_stats,
        tie_breaking_rules=tournament.tie_breaking_rules
    )
    candidate_ids = [c["participant_id"] for c in ranked_candidates]

    tie_groups: Dict[Tuple, List[int]] = {}
    for candidate in ranked_candidates:
        tie_key = tuple(candidate.get("tie_key", []))
        tie_groups.setdefault(tie_key, []).append(candidate["participant_id"])

    cutoff_tie_group = []
    top_ids = set(candidate_ids[:required_count])
    for _, group_ids in tie_groups.items():
        if group_ids and any(pid in top_ids for pid in group_ids) and any(pid not in top_ids for pid in group_ids):
            cutoff_tie_group = group_ids
            break

    manual_required = compute_manual_selection_required(required_count, candidate_ids, cutoff_tie_group)

    if selected_ids and len(selected_ids) != manual_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Es müssen genau {manual_required} Teilnehmer ausgewählt werden"
        )

    if selected_ids and not all(pid in candidate_ids for pid in selected_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ausgewählte Teilnehmer sind nicht in der Kandidatenliste"
        )

    stored_fallback = _normalize_fallback_rules(tournament.ko_fallback_qualifiers) or fallback_rules
    updated_fallback = []
    for stored in stored_fallback:
        if stored.get("position") == payload.position and stored.get("count") == required_count:
            if selected_ids:
                updated_rule = {**stored, "manual_selected_ids": selected_ids}
            else:
                updated_rule = {k: v for k, v in stored.items() if k != "manual_selected_ids"}
            updated_fallback.append(updated_rule)
        else:
            updated_fallback.append(stored)

    tournament.ko_fallback_qualifiers = updated_fallback
    db.commit()

    return {
        "tournament_id": tournament_id,
        "position": payload.position,
        "selected_ids": selected_ids
    }

