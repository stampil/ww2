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
use Ww2\Base\BaseFounder;
use Ww2\Base\BaseOverview;
use Ww2\Base\BaseStore;
use Ww2\Base\EventLog;
use Ww2\Base\Hangar;
use Ww2\Base\HangarStore;
use Ww2\Base\Headquarters;
use Ww2\Base\Mechanics;
use Ww2\Base\Roster;
use Ww2\Base\Warehouse;
use Ww2\Base\Workshop;
use Ww2\Clock\GameClockStore;
use Ww2\Database\DatabaseSettings;
use Ww2\Database\PdoDatabase;
use Ww2\Http\AccountController;
use Ww2\Http\BaseController;
use Ww2\Http\HealthController;
use Ww2\Http\SessionController;
use Ww2\Http\TerrainPatchController;
use Ww2\Mission\MissionGenerator;
use Ww2\Mission\MissionResolver;
use Ww2\Mission\MissionStore;
use Ww2\Mission\WeatherForecast;
use Ww2\Http\TerrainController;
use Ww2\Squadron\PilotGenerator;
use Ww2\Squadron\SquadronFounder;
use Ww2\Squadron\SquadronStore;
use Ww2\Terrain\TerrainGenerator;
use Ww2\Terrain\TilePatchGenerator;

require dirname(__DIR__) . '/vendor/autoload.php';

$database = new PdoDatabase(DatabaseSettings::fromEnvironmentFile(dirname(__DIR__, 2)));

$psr17Factory = new Psr17Factory();
$requestCreator = new ServerRequestCreator($psr17Factory, $psr17Factory, $psr17Factory, $psr17Factory);

$players = new PlayerStore($database);
$accounts = new AccountService($players);
$session = new PlayerSession();
$squadrons = new SquadronStore($database);
$pilotGenerator = new PilotGenerator();
$founder = new SquadronFounder($database, $squadrons, $pilotGenerator);
$bases = new BaseStore($database);
$clocks = new GameClockStore($database);
$baseFounder = new BaseFounder($bases, $clocks);
$missions = new MissionStore($database);
$hangarStore = new HangarStore($database);
$events = new EventLog($database);
$warehouse = new Warehouse($database, $bases);
$mechanics = new Mechanics($bases, $hangarStore);
$workshop = new Workshop($database, $bases, $clocks, $mechanics);
$headquarters = new Headquarters($database, $bases, $missions, $squadrons, $clocks, $hangarStore, $events, new MissionGenerator(), new WeatherForecast(), new MissionResolver());
$hangar = new Hangar($database, $bases, $hangarStore, $missions, $squadrons, $clocks, $mechanics, $events);
$roster = new Roster($database, $bases, $missions, $squadrons, $clocks, $pilotGenerator);
$overview = new BaseOverview($bases, $warehouse, $workshop, $headquarters, $hangar, $roster, $squadrons, $events, $clocks);
$baseController = new BaseController($overview, $warehouse, $workshop, $headquarters, $hangar, $roster, $session);

$router = new Router();
$router->setStrategy(new JsonStrategy($psr17Factory));
$router->group('/api', function (RouteGroup $routes) use ($database, $accounts, $players, $session, $founder, $baseFounder, $baseController): void {
    $routes->get('/health', new HealthController($database));
    $routes->get('/terrain', new TerrainController(new TerrainGenerator()));
    $routes->get('/terrain/patch', new TerrainPatchController(new TilePatchGenerator()));
    $routes->post('/account', new AccountController($accounts, $founder, $baseFounder, $session));
    $routes->get('/base', [$baseController, 'show']);
    $routes->post('/base/purchase', [$baseController, 'buy']);
    $routes->post('/base/production', [$baseController, 'produce']);
    $routes->post('/base/missions/launch', [$baseController, 'launchMission']);
    $routes->post('/base/missions/return', [$baseController, 'receiveMission']);
    $routes->post('/base/hangar/repair', [$baseController, 'repairAircraft']);
    $routes->post('/base/pilots/rest', [$baseController, 'restPilot']);
    $routes->post('/base/pilots/recruit', [$baseController, 'recruitPilot']);
    $sessionController = new SessionController($accounts, $players, $session);
    $routes->get('/session', [$sessionController, 'show']);
    $routes->post('/session', [$sessionController, 'signIn']);
    $routes->delete('/session', [$sessionController, 'signOut']);
});

$response = $router->dispatch($requestCreator->fromGlobals());
(new SapiEmitter())->emit($response);
