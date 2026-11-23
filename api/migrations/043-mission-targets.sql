CREATE TABLE IF NOT EXISTS mission_targets (
    mission_id INT UNSIGNED NOT NULL PRIMARY KEY,
    target_base_id INT UNSIGNED NOT NULL,
    FOREIGN KEY (mission_id) REFERENCES missions (id) ON DELETE CASCADE,
    FOREIGN KEY (target_base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
