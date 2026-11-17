CREATE TABLE IF NOT EXISTS base_resources (
    player_id INT UNSIGNED NOT NULL PRIMARY KEY,
    supplies INT UNSIGNED NOT NULL,
    fuel INT UNSIGNED NOT NULL,
    ammunition INT UNSIGNED NOT NULL,
    materials INT UNSIGNED NOT NULL,
    command_points INT UNSIGNED NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
