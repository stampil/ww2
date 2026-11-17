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
use Ww2\Base\SparePart;
use Ww2\Base\Stock;
use Ww2\Base\Warehouse;
use Ww2\Base\Workshop;

/**
 * Shows the base of the player who is signed in, and takes their orders: buy a stock, make a spare part.
 */
final class BaseController
{
    public function __construct(
        private readonly BaseStore $bases,
        private readonly Warehouse $warehouse,
        private readonly Workshop $workshop,
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
                BaseError::InvalidQuantity => new UnprocessableEntityException($exception->error->value),
                default => new ConflictException($exception->error->value),
            };
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function overview(int $playerId): array
    {
        return [
            'resources' => $this->bases->resourcesOf($playerId)->toArray(),
            'buildings' => array_map(static fn (Building $building): string => $building->value, Building::cases()),
            'warehouse' => $this->warehouse->describe(),
            'workshop' => $this->workshop->describe($playerId),
        ];
    }
}
