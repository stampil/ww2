CREATE TABLE IF NOT EXISTS ai_holders (
    player_id INT UNSIGNED NOT NULL PRIMARY KEY,
    instance_id INT UNSIGNED NOT NULL,
    clan VARCHAR(8) NOT NULL,
    UNIQUE KEY ai_holders_instance_clan (instance_id, clan),
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES instances (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
