<?php

declare(strict_types=1);

namespace Ww2\Account;

use RuntimeException;

/**
 * Raised when an account request breaks a rule of the game.
 */
final class AccountException extends RuntimeException
{
    public function __construct(public readonly AccountError $error)
    {
        parent::__construct($error->value);
    }
}
