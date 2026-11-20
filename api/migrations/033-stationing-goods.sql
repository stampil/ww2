CREATE TABLE IF NOT EXISTS stationing_goods (
    aircraft_id INT UNSIGNED NOT NULL PRIMARY KEY,
    materials INT UNSIGNED NOT NULL,
    supplies INT UNSIGNED NOT NULL,
    FOREIGN KEY (aircraft_id) REFERENCES stationings (aircraft_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
