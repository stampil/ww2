CREATE TABLE IF NOT EXISTS fallen_pilots (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    base_id INT UNSIGNED NOT NULL,
    name VARCHAR(64) NOT NULL,
    pilot_rank TINYINT UNSIGNED NOT NULL,
    missions_flown INT UNSIGNED NOT NULL,
    missions_succeeded INT UNSIGNED NOT NULL,
    air_combats INT UNSIGNED NOT NULL,
    victories INT UNSIGNED NOT NULL,
    ground_successes INT UNSIGNED NOT NULL,
    aircraft_lost INT UNSIGNED NOT NULL,
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
