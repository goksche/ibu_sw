#!/usr/bin/env python3
import sys

from app.core.database import SessionLocal
from app.models.tournament import Tournament
from app.models.group import Group, GroupParticipant
from sqlalchemy import func


def main() -> None:
    db = SessionLocal()
    try:
        tournament_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
        if tournament_id is None:
            tournament = db.query(Tournament).order_by(Tournament.id.desc()).first()
            if not tournament:
                print("no tournament found")
                return
            tournament_id = tournament.id
            print("latest_tournament:", tournament.id, tournament.name)

        groups = (
            db.query(Group)
            .filter(Group.tournament_id == tournament_id)
            .order_by(Group.id)
            .all()
        )

        if not groups:
            print("no groups found for tournament:", tournament_id)
            return

        for group in groups:
            total_count = (
                db.query(GroupParticipant)
                .filter(GroupParticipant.group_id == group.id)
                .count()
            )
            distinct_count = (
                db.query(func.count(func.distinct(GroupParticipant.participant_id)))
                .filter(GroupParticipant.group_id == group.id)
                .scalar()
            )
            duplicates = (
                db.query(GroupParticipant.participant_id, func.count(GroupParticipant.participant_id))
                .filter(GroupParticipant.group_id == group.id)
                .group_by(GroupParticipant.participant_id)
                .having(func.count(GroupParticipant.participant_id) > 1)
                .all()
            )
            dup_text = ", ".join([f"{pid}x{cnt}" for pid, cnt in duplicates]) if duplicates else "-"
            print(f"group {group.id} {group.name}: total={total_count} distinct={distinct_count} duplicates={dup_text}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
