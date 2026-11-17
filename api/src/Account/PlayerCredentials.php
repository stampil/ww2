<?php

declare(strict_types=1);

namespace Ww2\Account;

/**
 * A player with the hash of their password, to check a sign-in.
 */
final readonly class PlayerCredentials
{
    public function __construct(public Player $player, public string $passwordHash)
    {
    }
}
