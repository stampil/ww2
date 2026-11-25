CREATE TABLE IF NOT EXISTS pilot_assignments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    pilot_id INT UNSIGNED NOT NULL,
    base_id INT UNSIGNED NOT NULL,
    assigned_epoch BIGINT UNSIGNED NOT NULL,
    KEY pilot_assignments_pilot (pilot_id),
    FOREIGN KEY (pilot_id) REFERENCES pilots (id) ON DELETE CASCADE,
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
