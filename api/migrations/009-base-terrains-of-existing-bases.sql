INSERT INTO base_terrains (player_id, plan)
SELECT player_id, 'start' FROM base_resources
WHERE player_id NOT IN (SELECT player_id FROM base_terrains)
