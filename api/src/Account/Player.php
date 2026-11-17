<?php

declare(strict_types=1);

namespace Ww2\Account;

/**
 * A player, as the game shows them: never with the password.
 */
final readonly class Player
{
    public function __construct(public int $id, public string $nickname)
    {
    }

    /**
     * @return array{id: int, nickname: string}
     */
    public function toArray(): array
    {
        return ['id' => $this->id, 'nickname' => $this->nickname];
    }
}
