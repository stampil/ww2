CREATE TABLE IF NOT EXISTS bases (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    instance_id INT UNSIGNED NOT NULL,
    site ENUM('lille', 'reims', 'metz', 'nancy', 'dijon', 'orleans') NOT NULL,
    plan VARCHAR(32) NOT NULL,
    player_id INT UNSIGNED NULL,
    UNIQUE KEY bases_site (instance_id, site),
    FOREIGN KEY (instance_id) REFERENCES instances (id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
