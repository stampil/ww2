<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use League\Route\Http\Exception\ConflictException;
use League\Route\Http\Exception\UnauthorizedException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Account\PlayerSession;
use Ww2\Base\BaseError;
use Ww2\Base\BaseException;
use Ww2\Base\BaseOverview;
use Ww2\Base\Holdings;
use Ww2\World\Bases;
use Ww2\World\Site;

/**
 * Shows the player which sites they can choose their first base on, and gives them the one they choose, with a squadron;
 * shows who holds the sites of their own world.
 */
final class WorldController
{
    public function __construct(
        private readonly Bases $bases,
        private readonly BaseOverview $overview,
        private readonly PlayerSession $session,
        private readonly Holdings $holdings,
    ) {
    }

    /**
     * @return array{sites: list<array{site: string, free: bool, clan: string, holder: string|null, resources: array<string, int>|null}>}
     * @throws UnauthorizedException when nobody is signed in
     */
    public function sites(): array
    {
        $this->signedInPlayerId();

        return ['sites' => $this->bases->sitesToChoose()];
    }

    /**
     * @return array{sites: list<array{site: string, free: bool, clan: string, holder: string|null, resources: array<string, int>|null}>}
     * @throws UnauthorizedException when nobody is signed in
     * @throws ConflictException when the player holds no base
     */
    public function map(): array
    {
        $playerId = $this->signedInPlayerId();
        $this->holdings->settleFor($playerId);
        $baseId = $this->bases->currentOf($playerId, $this->session->selectedBaseId()) ?? throw new ConflictException(BaseError::NoBase->value);

        return ['sites' => $this->bases->sitesAround($baseId)];
    }

    /**
     * @return array<string, mixed> the overview of the new base, which the player now looks at
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     * @throws ConflictException when the player already holds a base, or the site is taken
     */
    public function claim(ServerRequestInterface $request): array
    {
        $playerId = $this->signedInPlayerId();
        $site = Site::tryFrom(JsonRequestBody::texts($request, 'site')['site']) ?? throw new BadRequestException('invalidBody');
        try {
            $baseId = $this->bases->claim($playerId, $site);
        } catch (BaseException $exception) {
            throw new ConflictException($exception->error->value);
        }
        $this->session->selectBase($baseId);

        return $this->overview->of($baseId);
    }

    private function signedInPlayerId(): int
    {
        $playerId = $this->session->playerId();
        if ($playerId === null) {
            throw new UnauthorizedException('signInRequired');
        }

        return $playerId;
    }
}
