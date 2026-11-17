CREATE TABLE IF NOT EXISTS cockpit_duels (
    alert_id INT UNSIGNED NOT NULL PRIMARY KEY,
    outcome VARCHAR(16) NULL,
    FOREIGN KEY (alert_id) REFERENCES flight_alerts (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
