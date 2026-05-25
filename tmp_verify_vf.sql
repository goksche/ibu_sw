WITH gp AS (
  SELECT gp.participant_id, g.name AS group_name
  FROM group_participants gp
  JOIN groups g ON g.id = gp.group_id
  WHERE g.tournament_id = 76
),
vf AS (
  SELECT km.id, km.player1_id, km.player2_id
  FROM knockout_matches km
  WHERE km.tournament_id = 76 AND km.round = 1
)
SELECT vf.id,
  (p1.first_name || ' ' || p1.last_name) AS p1,
  g1.group_name AS g1,
  (p2.first_name || ' ' || p2.last_name) AS p2,
  g2.group_name AS g2,
  (g1.group_name = g2.group_name) AS same_group
FROM vf
JOIN participants p1 ON p1.id = vf.player1_id
JOIN participants p2 ON p2.id = vf.player2_id
JOIN gp g1 ON g1.participant_id = vf.player1_id
JOIN gp g2 ON g2.participant_id = vf.player2_id
ORDER BY vf.id;

SELECT COUNT(*) FILTER (WHERE same_group) AS same_group_count
FROM (
  SELECT (g1.group_name = g2.group_name) AS same_group
  FROM knockout_matches km
  JOIN group_participants gp1 ON gp1.participant_id = km.player1_id
  JOIN group_participants gp2 ON gp2.participant_id = km.player2_id
  JOIN groups g1 ON g1.id = gp1.group_id AND g1.tournament_id = 76
  JOIN groups g2 ON g2.id = gp2.group_id AND g2.tournament_id = 76
  WHERE km.tournament_id = 76 AND km.round = 1
) x;
