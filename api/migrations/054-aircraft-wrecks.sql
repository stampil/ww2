CREATE TABLE IF NOT EXISTS aircraft_wrecks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    base_id INT UNSIGNED NOT NULL,
    model_id INT UNSIGNED NOT NULL,
    livery VARCHAR(16) NOT NULL,
    number INT UNSIGNED NOT NULL,
    commissioned_epoch BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES aircraft_models (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
