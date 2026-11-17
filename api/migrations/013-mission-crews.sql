CREATE TABLE IF NOT EXISTS mission_crews (
    pilot_id INT UNSIGNED NOT NULL PRIMARY KEY,
    aircraft_id INT UNSIGNED NOT NULL,
    mission_id INT UNSIGNED NOT NULL,
    UNIQUE KEY mission_crews_aircraft (aircraft_id),
    FOREIGN KEY (pilot_id) REFERENCES pilots (id) ON DELETE CASCADE,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
