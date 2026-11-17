CREATE TABLE IF NOT EXISTS missions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    player_id INT UNSIGNED NOT NULL,
    type ENUM('reconnaissance', 'airCombat', 'bombing') NOT NULL,
    aircraft_count TINYINT UNSIGNED NOT NULL,
    duration_seconds SMALLINT UNSIGNED NOT NULL,
    fuel_per_aircraft SMALLINT UNSIGNED NOT NULL,
    ammunition_per_aircraft SMALLINT UNSIGNED NOT NULL,
    risk TINYINT UNSIGNED NOT NULL,
    reward_supplies SMALLINT UNSIGNED NOT NULL,
    reward_command_points TINYINT UNSIGNED NOT NULL,
    fuel_loaded SMALLINT UNSIGNED NULL,
    ammunition_loaded SMALLINT UNSIGNED NULL,
    wind_speed TINYINT UNSIGNED NULL,
    return_game_second INT UNSIGNED NULL,
    FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
