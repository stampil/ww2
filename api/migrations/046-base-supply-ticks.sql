CREATE TABLE IF NOT EXISTS base_supply_ticks (
    base_id INT UNSIGNED NOT NULL PRIMARY KEY,
    accrued_game_second INT UNSIGNED NOT NULL,
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
