CREATE TABLE IF NOT EXISTS game_clocks (
    player_id INT UNSIGNED NOT NULL PRIMARY KEY,
    elapsed_seconds INT UNSIGNED NOT NULL,
    running_since DATETIME NULL,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
