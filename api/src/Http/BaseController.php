<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use League\Route\Http\Exception\ConflictException;
use League\Route\Http\Exception\UnauthorizedException;
use League\Route\Http\Exception\UnprocessableEntityException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Account\PlayerSession;
use Ww2\Base\BaseError;
use Ww2\Base\BaseException;
use Ww2\Base\BaseOverview;
use Ww2\Base\Hangar;
use Ww2\Base\Headquarters;
use Ww2\Base\Roster;
use Ww2\Base\SparePart;
use Ww2\Base\Stock;
use Ww2\Base\Warehouse;
use Ww2\Base\Workshop;

/**
 * Shows the base of the player who is signed in, and takes their orders: buy a stock, make a spare part,
 * send a mission out and receive its squadron back, repair an aircraft, rest a pilot, recruit a pilot.
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
        private readonly PlayerSession $session,
    ) {
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     */
    public function show(): array
    {
        return $this->overview->of($this->signedInPlayerId());
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function buy(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $stock = Stock::tryFrom(JsonRequestBody::texts($request, 'resource')['resource'])
            ?? throw new BadRequestException('invalidBody');
        $quantity = JsonRequestBody::integers($request, 'quantity')['quantity'];
        $this->carryOut(fn () => $this->warehouse->buy($playerId, $stock, $quantity));

        return $this->overview->of($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function produce(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $part = SparePart::tryFrom(JsonRequestBody::texts($request, 'part')['part'])
            ?? throw new BadRequestException('invalidBody');
        $withMechanic = JsonRequestBody::booleans($request, 'withMechanic')['withMechanic'];
        $this->carryOut(fn () => $this->workshop->start($playerId, $part, $withMechanic));

        return $this->overview->of($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function launchMission(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $numbers = JsonRequestBody::integers($request, 'missionId', 'fuel', 'ammunition');
        $crews = JsonRequestBody::integerLists($request, 'pilotIds', 'aircraftIds');
        $this->carryOut(fn () => $this->headquarters->launch(
            $playerId,
            $numbers['missionId'],
            $crews['pilotIds'],
            $crews['aircraftIds'],
            $numbers['fuel'],
            $numbers['ammunition'],
        ));

        return $this->overview->of($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function receiveMission(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $missionId = JsonRequestBody::integers($request, 'missionId')['missionId'];
        $this->carryOut(fn () => $this->headquarters->receive($playerId, $missionId));

        return $this->overview->of($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function repairAircraft(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $aircraftId = JsonRequestBody::integers($request, 'aircraftId')['aircraftId'];
        $this->carryOut(fn () => $this->hangar->repair($playerId, $aircraftId));

        return $this->overview->of($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function restPilot(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $pilotId = JsonRequestBody::integers($request, 'pilotId')['pilotId'];
        $this->carryOut(fn () => $this->roster->rest($playerId, $pilotId));

        return $this->overview->of($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     */
    public function recruitPilot(): array
    {
        $playerId = $this->signedInPlayerId();
        $this->carryOut(fn () => $this->roster->recruit($playerId));

        return $this->overview->of($playerId);
    }

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
