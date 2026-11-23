CREATE TABLE IF NOT EXISTS destroyed_buildings (
    base_id INT UNSIGNED NOT NULL,
    building VARCHAR(16) NOT NULL,
    PRIMARY KEY (base_id, building),
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
