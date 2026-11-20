CREATE TABLE IF NOT EXISTS aircraft_liveries (
    aircraft_id INT UNSIGNED NOT NULL PRIMARY KEY,
    livery VARCHAR(16) NOT NULL,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
