<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\UnauthorizedException;
use Ww2\Account\PlayerSession;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;
use Ww2\Squadron\SquadronStore;

/**
 * Shows the pilots and the aircraft of the player who is signed in.
 */
final class SquadronController
{
    public function __construct(private readonly SquadronStore $squadrons, private readonly PlayerSession $session)
    {
    }

    /**
     * @return array{pilots: list<array<string, int|string>>, aircraft: list<array<string, mixed>>}
     * @throws UnauthorizedException when nobody is signed in
     */
    public function __invoke(): array
    {
        $playerId = $this->session->playerId();
        if ($playerId === null) {
            throw new UnauthorizedException('signInRequired');
        }

        return [
            'pilots' => array_map(static fn (Pilot $pilot): array => $pilot->toArray(), $this->squadrons->pilotsOf($playerId)),
            'aircraft' => array_map(static fn (Aircraft $aircraft): array => $aircraft->toArray(), $this->squadrons->aircraftOf($playerId)),
        ];
    }
}
