<?php

declare(strict_types=1);

namespace Ww2\Database;

/**
 * The game database, the only door the game code opens to SQL.
 * Implementations return plain rows and counts, so the rules never depend on PDO.
 */
interface Database
{
    /**
     * Runs a query and returns every row of its result.
     *
     * @param array<string, scalar|null> $parameters named values bound to the query
     * @return list<array<string, scalar|null>>
     * @throws DatabaseException when the database cannot answer
     */
    public function fetchAll(string $query, array $parameters = []): array;

    /**
     * Runs a statement that changes data and returns the number of rows it changed.
     *
     * @param array<string, scalar|null> $parameters named values bound to the statement
     * @throws DatabaseException when the database cannot run it
     */
    public function execute(string $statement, array $parameters = []): int;
}
