from __future__ import annotations

from typing import Tuple


def next_round_slot_for(match_no: int) -> Tuple[int, int]:
    """
    Canonical winner propagation for KO trees.

    Match numbers are paired as (1,2)->next match 1, (3,4)->next match 2, ...
    Winners from odd matches go to slot 1, winners from even matches to slot 2.
    """
    if match_no <= 0:
        raise ValueError("match_no must be >= 1")
    target_match_no = (match_no + 1) // 2
    slot = 1 if (match_no % 2 == 1) else 2
    return target_match_no, slot
