UPDATE tournaments SET
  name = 'B1b-block-group-off-20260520',
  ko_block_same_group = false,
  ko_block_same_position = false
WHERE id = 76 AND status = 'PLANNED';

INSERT INTO tournament_participants (tournament_id, participant_id)
SELECT 76, participant_id FROM tournament_participants WHERE tournament_id = 75
ON CONFLICT ON CONSTRAINT uq_tournament_participant DO NOTHING;

SELECT id, name, ko_block_same_group, ko_block_same_position FROM tournaments WHERE id = 76;
SELECT COUNT(*) AS participants FROM tournament_participants WHERE tournament_id = 76;
