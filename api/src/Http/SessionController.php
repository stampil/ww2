<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\UnauthorizedException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Account\AccountException;
use Ww2\Account\AccountService;
use Ww2\Account\PlayerSession;
use Ww2\Account\PlayerStore;

/**
 * Tells who is signed in, signs a player in with their password, and signs them out.
 */
final class SessionController
{
    public function __construct(
        private readonly AccountService $accounts,
        private readonly PlayerStore $players,
        private readonly PlayerSession $session,
    ) {
    }

    /**
     * @return array{player: array{id: int, nickname: string}|null}
     */
    public function show(): array
    {
        $playerId = $this->session->playerId();
        $player = $playerId === null ? null : $this->players->find($playerId);

        return ['player' => $player?->toArray()];
    }

    /**
     * @return array{player: array{id: int, nickname: string}}
     */
    public function signIn(ServerRequestInterface $request): array
    {
        $fields = JsonRequestBody::texts($request, 'nickname', 'password');
        try {
            $player = $this->accounts->authenticate($fields['nickname'], $fields['password']);
        } catch (AccountException $exception) {
            throw new UnauthorizedException($exception->error->value);
        }
        $this->session->signIn($player->id);

        return ['player' => $player->toArray()];
    }

    /**
     * @return array{player: null}
     */
    public function signOut(): array
    {
        $this->session->signOut();

        return ['player' => null];
    }
}
