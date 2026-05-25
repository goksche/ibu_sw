SELECT id, name, ko_start_round::text, ko_block_same_group,
       (SELECT COUNT(*) FROM knockout_matches WHERE tournament_id = 76) AS ko_matches
FROM tournaments WHERE id = 76;
