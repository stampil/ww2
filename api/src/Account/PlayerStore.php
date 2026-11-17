<?php

declare(strict_types=1);

namespace Ww2\Account;

use Ww2\Database\Database;

/**
 * Keeps the players in the database.
 */
final class PlayerStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function add(string $nickname, string $passwordHash): void
    {
        $this->database->execute(
            'INSERT INTO players (nickname, password_hash) VALUES (:nickname, :password_hash)',
            ['nickname' => $nickname, 'password_hash' => $passwordHash],
        );
    }

    public function findCredentials(string $nickname): ?PlayerCredentials
    {
        $rows = $this->database->fetchAll(
            'SELECT id, nickname, password_hash FROM players WHERE nickname = :nickname',
            ['nickname' => $nickname],
        );

        return $rows === [] ? null : new PlayerCredentials(new Player((int) $rows[0]['id'], (string) $rows[0]['nickname']), (string) $rows[0]['password_hash']);
    }

    public function find(int $id): ?Player
    {
        $rows = $this->database->fetchAll('SELECT id, nickname FROM players WHERE id = :id', ['id' => $id]);

        return $rows === [] ? null : new Player((int) $rows[0]['id'], (string) $rows[0]['nickname']);
    }
}
