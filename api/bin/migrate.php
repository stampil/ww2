<?php

declare(strict_types=1);

use Ww2\Database\DatabaseSettings;
use Ww2\Database\Migrator;
use Ww2\Database\PdoDatabase;

require dirname(__DIR__) . '/vendor/autoload.php';

$database = new PdoDatabase(DatabaseSettings::fromEnvironmentFile(dirname(__DIR__, 2)));

foreach ((new Migrator($database, dirname(__DIR__) . '/migrations'))->migrate() as $name) {
    echo $name . " applied\n";
}
