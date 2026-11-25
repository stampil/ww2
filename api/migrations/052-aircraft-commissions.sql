CREATE TABLE IF NOT EXISTS aircraft_commissions (
    aircraft_id INT UNSIGNED NOT NULL PRIMARY KEY,
    commissioned_epoch BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
