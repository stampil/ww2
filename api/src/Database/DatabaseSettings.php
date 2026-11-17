<?php

declare(strict_types=1);

namespace Ww2\Database;

use Dotenv\Dotenv;

/**
 * Where and how to reach the database, as set in the .env file.
 */
final readonly class DatabaseSettings
{
    public function __construct(
        public string $host,
        public int $port,
        public string $name,
        public string $user,
        public string $password,
    ) {
    }

    /**
     * Loads the .env file of the directory and builds the settings from its DB_* variables.
     */
    public static function fromEnvironmentFile(string $directory): self
    {
        $environment = Dotenv::createImmutable($directory);
        $environment->load();
        $environment->required(['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']);

        return self::fromEnvironment($_ENV);
    }

    /**
     * Builds the settings from the DB_* variables loaded from the .env file.
     *
     * @param array<string, string> $environment
     */
    private static function fromEnvironment(array $environment): self
    {
        return new self(
            $environment['DB_HOST'],
            (int) $environment['DB_PORT'],
            $environment['DB_NAME'],
            $environment['DB_USER'],
            $environment['DB_PASSWORD'],
        );
    }
}
