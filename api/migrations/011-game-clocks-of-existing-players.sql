INSERT INTO game_clocks (player_id, elapsed_seconds, running_since)
SELECT id, 0, NOW() FROM players
WHERE id NOT IN (SELECT player_id FROM game_clocks)
