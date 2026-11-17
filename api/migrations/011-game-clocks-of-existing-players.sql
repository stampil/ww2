INSERT INTO game_clocks (player_id, started_at)
SELECT id, NOW() FROM players
WHERE id NOT IN (SELECT player_id FROM game_clocks)
