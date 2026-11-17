<?php

declare(strict_types=1);

namespace Ww2\Base;

use RuntimeException;

/**
 * Raised when a request to the base breaks a rule of the game.
 */
final class BaseException extends RuntimeException
{
    public function __construct(public readonly BaseError $error)
    {
        parent::__construct($error->value);
    }
}
