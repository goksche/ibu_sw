SELECT id, ko_start_round::text, ko_draw_method::text, ko_block_same_group FROM tournaments WHERE id=76;
SELECT round, COUNT(*) FROM knockout_matches WHERE tournament_id=76 GROUP BY round ORDER BY round;
