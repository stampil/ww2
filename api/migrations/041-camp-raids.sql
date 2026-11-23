CREATE TABLE IF NOT EXISTS camp_raids (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    base_id INT UNSIGNED NOT NULL,
    game_second INT UNSIGNED NOT NULL,
    KEY camp_raids_base (base_id, game_second),
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
