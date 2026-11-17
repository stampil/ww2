CREATE TABLE IF NOT EXISTS repairs (
    aircraft_id INT UNSIGNED NOT NULL PRIMARY KEY,
    finish_game_second INT UNSIGNED NOT NULL,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
