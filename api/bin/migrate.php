<?php

declare(strict_types=1);

use Ww2\Database\DatabaseSettings;
use Ww2\Database\PdoDatabase;

require dirname(__DIR__) . '/vendor/autoload.php';

$database = new PdoDatabase(DatabaseSettings::fromEnvironmentFile(dirname(__DIR__, 2)));

$migrations = glob(dirname(__DIR__) . '/migrations/*.sql');
sort($migrations);
foreach ($migrations as $migration) {
    $database->execute((string) file_get_contents($migration));
    echo basename($migration) . " applied\n";
}
