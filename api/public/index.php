<?php

declare(strict_types=1);

use Dotenv\Dotenv;
use Laminas\HttpHandlerRunner\Emitter\SapiEmitter;
use League\Route\Router;
use League\Route\RouteGroup;
use League\Route\Strategy\JsonStrategy;
use Nyholm\Psr7\Factory\Psr17Factory;
use Nyholm\Psr7Server\ServerRequestCreator;
use Ww2\Database\DatabaseSettings;
use Ww2\Database\PdoDatabase;
use Ww2\Http\HealthController;

require dirname(__DIR__) . '/vendor/autoload.php';

$environment = Dotenv::createImmutable(dirname(__DIR__, 2));
$environment->load();
$environment->required(['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']);

$database = new PdoDatabase(DatabaseSettings::fromEnvironment($_ENV));

$psr17Factory = new Psr17Factory();
$requestCreator = new ServerRequestCreator($psr17Factory, $psr17Factory, $psr17Factory, $psr17Factory);

$router = new Router();
$router->setStrategy(new JsonStrategy($psr17Factory));
$router->group('/api', function (RouteGroup $routes) use ($database): void {
    $routes->get('/health', new HealthController($database));
});

$response = $router->dispatch($requestCreator->fromGlobals());
(new SapiEmitter())->emit($response);
