<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use League\Route\Http\Exception\ConflictException;
use League\Route\Http\Exception\UnauthorizedException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Account\PlayerSession;
use Ww2\Base\BaseException;
use Ww2\Base\BaseOverview;
use Ww2\World\Bases;
use Ww2\World\Site;

/**
 * Shows the player which sites they can choose a base on, and gives them the one they choose.
 */
final class WorldController
{
    public function __construct(
        private readonly Bases $bases,
        private readonly BaseOverview $overview,
        private readonly PlayerSession $session,
    ) {
    }

    /**
     * @return array{sites: list<array{site: string, free: bool}>}
     * @throws UnauthorizedException when nobody is signed in
     */
    public function sites(): array
    {
        $this->signedInPlayerId();

        return ['sites' => $this->bases->sitesToChoose()];
    }

    /**
     * @return array<string, mixed> the overview of the new base
     * @throws UnauthorizedException when nobody is signed in
     * @throws BadRequestException when the order is not understood
     * @throws ConflictException when the player holds a base already, or the site is taken
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
