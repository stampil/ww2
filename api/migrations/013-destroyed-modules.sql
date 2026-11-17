CREATE TABLE IF NOT EXISTS destroyed_modules (
    aircraft_id INT UNSIGNED NOT NULL,
    part ENUM('engine', 'wings', 'fuselage', 'armament') NOT NULL,
    PRIMARY KEY (aircraft_id, part),
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
