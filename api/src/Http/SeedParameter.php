<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Reads the seed of a terrain from the query of a request.
 */
final class SeedParameter
{
    /**
     * @throws BadRequestException when the seed is missing or is not an integer
     */
    public static function read(ServerRequestInterface $request): int
    {
        $seed = filter_var($request->getQueryParams()['seed'] ?? null, FILTER_VALIDATE_INT);
        if ($seed === false) {
            throw new BadRequestException('The seed must be an integer.');
        }

        return $seed;
    }
}
