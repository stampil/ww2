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
use Ww2\Base\BaseStore;
use Ww2\Base\Building;
use Ww2\Base\Headquarters;
use Ww2\Base\SparePart;
use Ww2\Base\Stock;
use Ww2\Base\Warehouse;
use Ww2\Base\Workshop;
use Ww2\Clock\GameClockStore;

/**
 * Shows the base of the player who is signed in, and takes their orders: buy a stock, make a spare part, pause or resume the clock,
 * send a mission out and receive its squadron back.
 */
final class BaseController
{
    public function __construct(
        private readonly BaseStore $bases,
        private readonly Warehouse $warehouse,
        private readonly Workshop $workshop,
        private readonly Headquarters $headquarters,
        private readonly GameClockStore $clocks,
        private readonly PlayerSession $session,
    ) {
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     */
    public function show(): array
    {
        return $this->overview($this->signedInPlayerId());
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

        return $this->overview($playerId);
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

        return $this->overview($playerId);
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

        return $this->overview($playerId);
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

        return $this->overview($playerId);
    }

    /**
     * @return array<string, mixed>
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     */
    public function setPaused(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $paused = JsonRequestBody::booleans($request, 'paused')['paused'];
        if ($paused) {
            $this->clocks->pause($playerId);
        } else {
            $this->clocks->resume($playerId);
        }

        return $this->overview($playerId);
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

    /**
     * @return array<string, mixed>
     */
    private function overview(int $playerId): array
    {
        $clock = $this->clocks->of($playerId);

        return [
            'terrainPlan' => $this->bases->terrainPlanOf($playerId),
            'resources' => $this->bases->resourcesOf($playerId)->toArray(),
            'buildings' => array_map(static fn (Building $building): string => $building->value, Building::cases()),
            'warehouse' => $this->warehouse->describe(),
            'clock' => $clock->toArray(),
            'workshop' => $this->workshop->describe($playerId, $clock),
            'headquarters' => $this->headquarters->describe($playerId, $clock),
        ];
    }
}
