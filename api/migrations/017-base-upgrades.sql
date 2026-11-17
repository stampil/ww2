CREATE TABLE IF NOT EXISTS base_upgrades (
    base_id INT UNSIGNED NOT NULL,
    upgrade ENUM('hangar', 'workshop', 'warehouse') NOT NULL,
    level TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (base_id, upgrade),
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
