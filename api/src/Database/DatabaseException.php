<?php

declare(strict_types=1);

namespace Ww2\Database;

use RuntimeException;

/**
 * Raised when the database cannot answer: unreachable server, refused access, invalid query.
 */
final class DatabaseException extends RuntimeException
{
}
