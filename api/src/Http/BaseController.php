<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use League\Route\Http\Exception\ConflictException;
use League\Route\Http\Exception\UnauthorizedException;
use League\Route\Http\Exception\UnprocessableEntityException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Account\PlayerSession;
use Ww2\Base\Alerts;
use Ww2\Base\BaseError;
use Ww2\Base\BaseException;
use Ww2\Base\BaseOverview;
use Ww2\Base\Battle;
use Ww2\Base\Cargo;
use Ww2\Base\EventLog;
use Ww2\Base\Gifts;
use Ww2\Base\Hangar;
use Ww2\Base\Headquarters;
use Ww2\Base\Holdings;
use Ww2\Base\Roster;
use Ww2\Base\SparePart;
use Ww2\Base\Stationings;
use Ww2\Base\Stock;
use Ww2\Base\Upgrade;
use Ww2\Base\Upgrades;
use Ww2\Base\Warehouse;
use Ww2\Base\Workshop;
use Ww2\Mission\Dogfight\DogfightOutcome;
use Ww2\Mission\Dogfight\Maneuver;
use Ww2\World\Bases;

/**
 * Shows the base of the player who is signed in (the one they look at, the first they took until they choose another), and takes their orders: buy a stock, make a spare part,
 * send a mission out, answer its alerts and receive its squadron back, inspect and repair an aircraft, rest a pilot, recruit a pilot, buy an upgrade, give a pilot or an aircraft to another base, stationing an aircraft at another base and recalling it, send a supply flight to a base of the player or of an ally.
 * Once the battle is over the orders are refused, except the one that starts a new battle and the one that starts the game over.
 */
final class BaseController
{
    public function __construct(
        private readonly BaseOverview $overview,
        private readonly Warehouse $warehouse,
        private readonly Workshop $workshop,
        private readonly Headquarters $headquarters,
        private readonly Hangar $hangar,
        private readonly Roster $roster,
        private readonly Upgrades $upgrades,
        private readonly Battle $battle,
        private readonly Alerts $alerts,
        private readonly Bases $bases,
        private readonly PlayerSession $session,
        private readonly Gifts $gifts,
        private readonly Stationings $stationings,
        private readonly Holdings $holdings,
        private readonly EventLog $events,
    ) {
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet
     */
    public function show(): array
    {
        return $this->overview->of($this->ownBaseId());
    }

    /**
     * @return array{pages: list<array<string, mixed>>} the pages of the journal of the base the player looks at, the oldest first
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet
     */
    public function journal(): array
    {
        return ['pages' => $this->events->pages($this->ownBaseId())];
    }

    /**
     * @return array<string, mixed> the overview of the base the player now looks at
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     * @throws ConflictException when the player does not hold the base
     */
    public function selectBase(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $this->holdings->settleFor($playerId);
        $baseId = JsonRequestBody::integers($request, 'baseId')['baseId'];
        $this->carryOut(fn () => $this->bases->assertHeldBy($playerId, $baseId));
        $this->session->selectBase($baseId);

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function buy(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $stock = Stock::tryFrom(JsonRequestBody::texts($request, 'resource')['resource'])
            ?? throw new BadRequestException('invalidBody');
        $quantity = JsonRequestBody::integers($request, 'quantity')['quantity'];
        $this->carryOut(fn () => $this->warehouse->buy($baseId, $stock, $quantity));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function produce(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $part = SparePart::tryFrom(JsonRequestBody::texts($request, 'part')['part'])
            ?? throw new BadRequestException('invalidBody');
        $withMechanic = JsonRequestBody::booleans($request, 'withMechanic')['withMechanic'];
        $this->carryOut(fn () => $this->workshop->start($baseId, $part, $withMechanic));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function givePilot(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $numbers = JsonRequestBody::integers($request, 'recipientBaseId', 'pilotId');
        $this->carryOut(fn () => $this->gifts->givePilot($baseId, $numbers['recipientBaseId'], $numbers['pilotId']));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function giveAircraft(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $numbers = JsonRequestBody::integers($request, 'recipientBaseId', 'aircraftId');
        $this->carryOut(fn () => $this->gifts->giveAircraft($baseId, $numbers['recipientBaseId'], $numbers['aircraftId']));

        return $this->overviewAfterOrder();
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function sendStationing(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $numbers = JsonRequestBody::integers($request, 'destinationBaseId', 'pilotId', 'aircraftId', 'fuel', 'ammunition');
        $this->carryOut(fn () => $this->stationings->send($baseId, $numbers['destinationBaseId'], $numbers['pilotId'], $numbers['aircraftId'], $numbers['fuel'], $numbers['ammunition']));

        return $this->overviewAfterOrder();
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function sendSupply(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $numbers = JsonRequestBody::integers($request, 'destinationBaseId', 'pilotId', 'aircraftId', 'fuel', 'ammunition', 'materials', 'supplies');
        $cargo = new Cargo($numbers['fuel'], $numbers['ammunition'], $numbers['materials'], $numbers['supplies']);
        $this->carryOut(fn () => $this->stationings->supply($baseId, $numbers['destinationBaseId'], $numbers['pilotId'], $numbers['aircraftId'], $cargo));

        return $this->overviewAfterOrder();
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function recallStationing(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $aircraftId = JsonRequestBody::integers($request, 'aircraftId')['aircraftId'];
        $this->carryOut(fn () => $this->stationings->recall($baseId, $aircraftId));

        return $this->overviewAfterOrder();
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function launchMission(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $numbers = JsonRequestBody::integers($request, 'missionId', 'fuel', 'ammunition');
        $crews = JsonRequestBody::integerLists($request, 'pilotIds', 'aircraftIds');
        $this->carryOut(fn () => $this->headquarters->launch(
            $baseId,
            $numbers['missionId'],
            $crews['pilotIds'],
            $crews['aircraftIds'],
            $numbers['fuel'],
            $numbers['ammunition'],
        ));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function receiveMission(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $missionId = JsonRequestBody::integers($request, 'missionId')['missionId'];
        $this->carryOut(fn () => $this->headquarters->receive($baseId, $missionId));

        return $this->overviewAfterOrder();
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function startAlert(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $alertId = JsonRequestBody::integers($request, 'alertId')['alertId'];
        $this->carryOut(fn () => $this->alerts->start($baseId, $alertId));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function playAlert(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $alertId = JsonRequestBody::integers($request, 'alertId')['alertId'];
        $maneuver = Maneuver::tryFrom(JsonRequestBody::texts($request, 'maneuver')['maneuver']) ?? throw new BadRequestException('invalidBody');
        $this->carryOut(fn () => $this->alerts->play($baseId, $alertId, $maneuver));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function finishAlert(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $alertId = JsonRequestBody::integers($request, 'alertId')['alertId'];
        $outcome = DogfightOutcome::tryFrom(JsonRequestBody::texts($request, 'outcome')['outcome']) ?? throw new BadRequestException('invalidBody');
        $this->carryOut(fn () => $this->alerts->finish($baseId, $alertId, $outcome));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function inspectAircraft(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $aircraftId = JsonRequestBody::integers($request, 'aircraftId')['aircraftId'];
        $this->carryOut(fn () => $this->hangar->inspect($baseId, $aircraftId));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function repairAircraft(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $aircraftId = JsonRequestBody::integers($request, 'aircraftId')['aircraftId'];
        $this->carryOut(fn () => $this->hangar->repair($baseId, $aircraftId));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function restPilot(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $pilotId = JsonRequestBody::integers($request, 'pilotId')['pilotId'];
        $this->carryOut(fn () => $this->roster->rest($baseId, $pilotId));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     */
    public function recruitPilot(): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $this->carryOut(fn () => $this->roster->recruit($baseId));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function buyUpgrade(ServerRequestInterface $request): array
    {
        $baseId = $this->ongoingBattleBaseId();
        $upgrade = Upgrade::tryFrom(JsonRequestBody::texts($request, 'upgrade')['upgrade']) ?? throw new BadRequestException('invalidBody');
        $this->carryOut(fn () => $this->upgrades->buy($baseId, $upgrade));

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet
     */
    public function resetBase(): array
    {
        $baseId = $this->firstBaseId();
        $this->battle->startOver($baseId);
        $this->session->forgetSelectedBase();

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet, or the battle is not over
     */
    public function restartBattle(): array
    {
        $baseId = $this->firstBaseId();
        $this->carryOut(fn () => $this->battle->restart($baseId));
        $this->session->forgetSelectedBase();

        return $this->overview->of($baseId);
    }

    /**
     * The overview after an order that can let a camp go: the base is looked up again, as the one the order was given on may no longer be the player's.
     *
     * @return array<string, mixed>
     */
    private function overviewAfterOrder(): array
    {
        return $this->overview->of($this->ownBaseId());
    }

    /**
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet, or the battle is over
     */
    private function ongoingBattleBaseId(): int
    {
        $baseId = $this->ownBaseId();
        $this->carryOut(fn () => $this->battle->assertOngoing($baseId));

        return $baseId;
    }

    /**
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet
     */
    private function ownBaseId(): int
    {
        $playerId = $this->signedInPlayerId();
        $this->holdings->settleFor($playerId);

        return $this->bases->currentOf($playerId, $this->session->selectedBaseId()) ?? throw new ConflictException(BaseError::NoBase->value);
    }

    /**
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet
     */
    private function firstBaseId(): int
    {
        return $this->bases->idOf($this->signedInPlayerId()) ?? throw new ConflictException(BaseError::NoBase->value);
    }

    /**
     * @throws UnauthorizedException when nobody is signed in
     */
    private function signedInPlayerId(): int
    {
        $playerId = $this->session->playerId();
        if ($playerId === null) {
            throw new UnauthorizedException('signInRequired');
        }

        return $playerId;
    }

    /**
     * @param callable(): void $order
     */
    private function carryOut(callable $order): void
    {
        try {
            $order();
        } catch (BaseException $exception) {
            throw match ($exception->error) {
                BaseError::InvalidQuantity,
                BaseError::InvalidCrew,
                BaseError::AircraftNotSuited,
                BaseError::InvalidLoad => new UnprocessableEntityException($exception->error->value),
                default => new ConflictException($exception->error->value),
            };
        }
    }
}
