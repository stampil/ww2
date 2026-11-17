<?php

declare(strict_types=1);

namespace Ww2\Database;

use PDO;
use PDOException;

/**
 * The game database over PDO, connected on first use.
 * Every PDO failure leaves as a DatabaseException.
 */
final class PdoDatabase implements Database
{
    private const CHARSET = 'utf8mb4';

    private ?PDO $connection = null;

    public function __construct(private readonly DatabaseSettings $settings)
    {
    }

    public function fetchAll(string $query, array $parameters = []): array
    {
        try {
            $statement = $this->connection()->prepare($query);
            $statement->execute($parameters);

            return $statement->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $exception) {
            throw new DatabaseException($exception->getMessage(), previous: $exception);
        }
    }

    public function execute(string $statement, array $parameters = []): int
    {
        try {
            $prepared = $this->connection()->prepare($statement);
            $prepared->execute($parameters);

            return $prepared->rowCount();
        } catch (PDOException $exception) {
            throw new DatabaseException($exception->getMessage(), previous: $exception);
        }
    }

    private function connection(): PDO
    {
        if ($this->connection === null) {
            $dataSourceName = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $this->settings->host,
                $this->settings->port,
                $this->settings->name,
                self::CHARSET,
            );
            $this->connection = new PDO($dataSourceName, $this->settings->user, $this->settings->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return $this->connection;
    }
}
