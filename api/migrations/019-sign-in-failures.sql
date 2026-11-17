CREATE TABLE IF NOT EXISTS sign_in_failures (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(32) NOT NULL,
    failed_at DATETIME NOT NULL,
    KEY sign_in_failures_nickname (nickname, failed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
