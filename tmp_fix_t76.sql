UPDATE tournaments SET ko_start_round = 'QUARTERFINAL' WHERE id = 76;
DELETE FROM knockout_matches WHERE tournament_id = 76;
