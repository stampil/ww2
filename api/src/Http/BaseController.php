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
use Ww2\Base\Hangar;
use Ww2\Base\Headquarters;
use Ww2\Base\Roster;
use Ww2\Base\SparePart;
use Ww2\Base\Stock;
use Ww2\Base\Upgrade;
use Ww2\Base\Upgrades;
use Ww2\Base\Warehouse;
use Ww2\Base\Workshop;
use Ww2\Mission\Dogfight\Maneuver;
use Ww2\World\Bases;

/**
 * Shows the base of the player who is signed in (the first they hold), and takes their orders: buy a stock, make a spare part,
 * send a mission out, answer its alerts and receive its squadron back, inspect and repair an aircraft, rest a pilot, recruit a pilot, buy an upgrade.
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

        return $this->overview->of($baseId);
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
        $baseId = $this->ownBaseId();
        $this->battle->startOver($baseId);

        return $this->overview->of($baseId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base yet, or the battle is not over
     */
    public function restartBattle(): array
    {
        $baseId = $this->ownBaseId();
        $this->carryOut(fn () => $this->battle->restart($baseId));

        return $this->overview->of($baseId);
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
        $playerId = $this->session->playerId();
        if ($playerId === null) {
            throw new UnauthorizedException('signInRequired');
        }

        return $this->bases->idOf($playerId) ?? throw new ConflictException(BaseError::NoBase->value);
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
