CREATE TABLE IF NOT EXISTS fallen_pilot_victories (
    fallen_pilot_id INT UNSIGNED NOT NULL PRIMARY KEY,
    fighter_victories INT UNSIGNED NOT NULL,
    bomber_victories INT UNSIGNED NOT NULL,
    FOREIGN KEY (fallen_pilot_id) REFERENCES fallen_pilots (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
