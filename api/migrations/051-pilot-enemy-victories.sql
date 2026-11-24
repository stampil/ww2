CREATE TABLE IF NOT EXISTS pilot_enemy_victories (
    pilot_id INT UNSIGNED NOT NULL,
    enemy VARCHAR(16) NOT NULL,
    victories INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (pilot_id, enemy),
    FOREIGN KEY (pilot_id) REFERENCES pilots (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
