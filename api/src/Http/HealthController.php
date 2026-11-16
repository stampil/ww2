<?php

declare(strict_types=1);

namespace Ww2\Http;

use Ww2\Database\Database;
use Ww2\Database\DatabaseException;

/**
 * Tells the front whether the API answers and whether the database does.
 */
final class HealthController
{
    private const STATUS_OK = 'ok';
    private const STATUS_UNREACHABLE = 'unreachable';
    private const PROBE_QUERY = 'SELECT 1';

    public function __construct(private readonly Database $database)
    {
    }

    /**
     * @return array{api: string, database: string}
     */
    public function __invoke(): array
    {
        return [
            'api' => self::STATUS_OK,
            'database' => $this->databaseStatus(),
        ];
    }

    private function databaseStatus(): string
    {
        try {
            $this->database->fetchAll(self::PROBE_QUERY);
        } catch (DatabaseException) {
            return self::STATUS_UNREACHABLE;
        }

        return self::STATUS_OK;
    }
}
