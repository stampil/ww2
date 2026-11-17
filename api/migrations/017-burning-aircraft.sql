CREATE TABLE IF NOT EXISTS burning_aircraft (
    aircraft_id INT UNSIGNED NOT NULL PRIMARY KEY,
    pilot_id INT UNSIGNED NULL,
    explodes_at_game_second INT UNSIGNED NOT NULL,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE,
    FOREIGN KEY (pilot_id) REFERENCES pilots (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
