<?php

declare(strict_types=1);

use Laminas\HttpHandlerRunner\Emitter\SapiEmitter;
use League\Route\Router;
use League\Route\RouteGroup;
use League\Route\Strategy\JsonStrategy;
use Nyholm\Psr7\Factory\Psr17Factory;
use Nyholm\Psr7Server\ServerRequestCreator;
use Ww2\Account\AccountService;
use Ww2\Account\PlayerSession;
use Ww2\Account\PlayerStore;
use Ww2\Database\DatabaseSettings;
use Ww2\Database\PdoDatabase;
use Ww2\Http\AccountController;
use Ww2\Http\HealthController;
use Ww2\Http\SessionController;
use Ww2\Http\TerrainController;
use Ww2\Terrain\TerrainGenerator;

require dirname(__DIR__) . '/vendor/autoload.php';

$database = new PdoDatabase(DatabaseSettings::fromEnvironmentFile(dirname(__DIR__, 2)));

$psr17Factory = new Psr17Factory();
$requestCreator = new ServerRequestCreator($psr17Factory, $psr17Factory, $psr17Factory, $psr17Factory);

$players = new PlayerStore($database);
$accounts = new AccountService($players);
$session = new PlayerSession();

$router = new Router();
$router->setStrategy(new JsonStrategy($psr17Factory));
$router->group('/api', function (RouteGroup $routes) use ($database, $accounts, $players, $session): void {
    $routes->get('/health', new HealthController($database));
    $routes->get('/terrain', new TerrainController(new TerrainGenerator()));
    $routes->post('/account', new AccountController($accounts, $session));
    $sessionController = new SessionController($accounts, $players, $session);
    $routes->get('/session', [$sessionController, 'show']);
    $routes->post('/session', [$sessionController, 'signIn']);
    $routes->delete('/session', [$sessionController, 'signOut']);
});

$response = $router->dispatch($requestCreator->fromGlobals());
(new SapiEmitter())->emit($response);
