CREATE TABLE IF NOT EXISTS production_jobs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    player_id INT UNSIGNED NOT NULL,
    part ENUM('engine', 'wings', 'fuselage', 'armament') NOT NULL,
    has_mechanic TINYINT(1) NOT NULL,
    finish_game_second INT UNSIGNED NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
