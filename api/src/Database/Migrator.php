<?php

declare(strict_types=1);

namespace Ww2\Database;

/**
 * Plays the migrations the database has not seen yet, in the order of their names, and remembers which it has played.
 * A migration may be played twice by two requests at once: write each one so that it can be replayed.
 */
final class Migrator
{
    private const CREATE_LEDGER = 'CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(128) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci';

    public function __construct(private readonly Database $database, private readonly string $migrationsDirectory)
    {
    }

    /**
     * @return list<string> the names of the migrations played now
     */
    public function migrate(): array
    {
        $this->database->execute(self::CREATE_LEDGER);
        $playedNames = array_column($this->database->fetchAll('SELECT name FROM schema_migrations'), 'name');
        $files = glob($this->migrationsDirectory . '/*.sql');
        sort($files);
        $newlyPlayed = [];
        foreach ($files as $file) {
            $name = basename($file);
            if (in_array($name, $playedNames, true)) {
                continue;
            }
            $this->database->execute((string) file_get_contents($file));
            $this->database->execute('INSERT IGNORE INTO schema_migrations (name, applied_at) VALUES (:name, NOW())', ['name' => $name]);
            $newlyPlayed[] = $name;
        }

        return $newlyPlayed;
    }
}
