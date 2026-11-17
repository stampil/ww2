<?php

declare(strict_types=1);

namespace Ww2\Account;

use Ww2\Database\Database;

/**
 * Counts the wrong passwords given for each nickname: a nickname that had too many of them in a while is shut for a time.
 */
final class SignInAttempts
{
    private const MAX_FAILURES = 5;
    private const WINDOW_SECONDS = 900;

    public function __construct(private readonly Database $database)
    {
    }

    public function isShut(string $nickname): bool
    {
        $rows = $this->database->fetchAll(
            'SELECT COUNT(*) AS failures FROM sign_in_failures WHERE nickname = :nickname AND failed_at > NOW() - INTERVAL :window SECOND',
            ['nickname' => $nickname, 'window' => self::WINDOW_SECONDS],
        );

        return (int) $rows[0]['failures'] >= self::MAX_FAILURES;
    }

    /**
     * Notes a wrong password, and drops the failures that are too old to count.
     */
    public function recordFailure(string $nickname): void
    {
        $this->database->execute('DELETE FROM sign_in_failures WHERE failed_at <= NOW() - INTERVAL :window SECOND', ['window' => self::WINDOW_SECONDS]);
        $this->database->execute('INSERT INTO sign_in_failures (nickname, failed_at) VALUES (:nickname, NOW())', ['nickname' => $nickname]);
    }

    public function forget(string $nickname): void
    {
        $this->database->execute('DELETE FROM sign_in_failures WHERE nickname = :nickname', ['nickname' => $nickname]);
    }
}
