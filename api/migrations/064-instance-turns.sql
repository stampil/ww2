CREATE TABLE IF NOT EXISTS instance_turns (
    instance_id INT UNSIGNED NOT NULL PRIMARY KEY,
    last_day INT UNSIGNED NOT NULL,
    FOREIGN KEY (instance_id) REFERENCES instances (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
