<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\ConflictException;
use League\Route\Http\Exception\UnprocessableEntityException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Account\AccountError;
use Ww2\Account\AccountException;
use Ww2\Account\AccountService;
use Ww2\Account\PlayerSession;
use Ww2\Squadron\SquadronFounder;

/**
 * Creates an account, gives its player a squadron to start with, and signs them in.
 */
final class AccountController
{
    public function __construct(
        private readonly AccountService $accounts,
        private readonly SquadronFounder $founder,
        private readonly PlayerSession $session,
    ) {
    }

    /**
     * @return array{player: array{id: int, nickname: string}}
     */
    public function __invoke(ServerRequestInterface $request): array
    {
        $fields = JsonRequestBody::texts($request, 'nickname', 'password');
        try {
            $player = $this->accounts->register($fields['nickname'], $fields['password']);
        } catch (AccountException $exception) {
            throw match ($exception->error) {
                AccountError::NicknameTaken => new ConflictException($exception->error->value),
                default => new UnprocessableEntityException($exception->error->value),
            };
        }
        $this->founder->found($player->id);
        $this->session->signIn($player->id);

        return ['player' => $player->toArray()];
    }
}
