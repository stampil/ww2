CREATE TABLE IF NOT EXISTS pilot_rests (
    pilot_id INT UNSIGNED NOT NULL PRIMARY KEY,
    finish_game_second INT UNSIGNED NOT NULL,
    FOREIGN KEY (pilot_id) REFERENCES pilots (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
