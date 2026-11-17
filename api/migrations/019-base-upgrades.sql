CREATE TABLE IF NOT EXISTS base_upgrades (
    player_id INT UNSIGNED NOT NULL,
    upgrade ENUM('hangar', 'workshop', 'warehouse') NOT NULL,
    level TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (player_id, upgrade),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
