CREATE TABLE IF NOT EXISTS flight_alert_bonuses (
    alert_id INT UNSIGNED NOT NULL,
    kind VARCHAR(16) NOT NULL,
    quantity TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (alert_id, kind),
    FOREIGN KEY (alert_id) REFERENCES flight_alerts (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
