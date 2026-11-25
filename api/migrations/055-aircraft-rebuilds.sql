CREATE TABLE IF NOT EXISTS aircraft_rebuilds (
    wreck_id INT UNSIGNED NOT NULL PRIMARY KEY,
    finish_game_second INT UNSIGNED NOT NULL,
    FOREIGN KEY (wreck_id) REFERENCES aircraft_wrecks (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
