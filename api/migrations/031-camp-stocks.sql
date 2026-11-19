CREATE TABLE IF NOT EXISTS camp_stocks (
    base_id INT UNSIGNED NOT NULL,
    stock ENUM('fuel', 'ammunition', 'materials') NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    game_second INT UNSIGNED NOT NULL,
    PRIMARY KEY (base_id, stock),
    FOREIGN KEY (base_id) REFERENCES bases (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
