CREATE TABLE IF NOT EXISTS aircraft_models (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(64) NOT NULL,
    category ENUM('fighter', 'bomber') NOT NULL,
    durability SMALLINT UNSIGNED NOT NULL,
    maneuverability SMALLINT UNSIGNED NOT NULL,
    fuel_capacity SMALLINT UNSIGNED NOT NULL,
    ammunition_capacity SMALLINT UNSIGNED NOT NULL,
    UNIQUE KEY aircraft_models_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
