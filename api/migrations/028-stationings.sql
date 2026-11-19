CREATE TABLE IF NOT EXISTS stationings (
    aircraft_id INT UNSIGNED NOT NULL PRIMARY KEY,
    pilot_id INT UNSIGNED NOT NULL,
    origin_base_id INT UNSIGNED NOT NULL,
    destination_base_id INT UNSIGNED NOT NULL,
    fuel INT UNSIGNED NOT NULL,
    ammunition INT UNSIGNED NOT NULL,
    lands_game_second INT UNSIGNED NOT NULL,
    returns_game_second INT UNSIGNED NULL,
    UNIQUE KEY stationings_pilot (pilot_id),
    KEY stationings_origin (origin_base_id),
    KEY stationings_destination (destination_base_id),
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE,
    FOREIGN KEY (pilot_id) REFERENCES pilots (id) ON DELETE CASCADE,
    FOREIGN KEY (origin_base_id) REFERENCES bases (id) ON DELETE CASCADE,
    FOREIGN KEY (destination_base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
