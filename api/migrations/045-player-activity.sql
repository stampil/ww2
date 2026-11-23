CREATE TABLE IF NOT EXISTS player_activity (
    player_id INT UNSIGNED NOT NULL PRIMARY KEY,
    seen_at DATETIME(6) NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
