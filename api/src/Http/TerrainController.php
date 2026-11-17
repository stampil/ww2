<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Terrain\TerrainGenerator;

/**
 * Gives the front the terrain of a seed: the same seed always gives the same terrain.
 */
final class TerrainController
{
    public function __construct(private readonly TerrainGenerator $generator)
    {
    }

    /**
     * @return array<string, mixed>
     * @throws BadRequestException when the seed is missing or is not an integer
     */
    public function __invoke(ServerRequestInterface $request): array
    {
        $seed = filter_var($request->getQueryParams()['seed'] ?? null, FILTER_VALIDATE_INT);
        if ($seed === false) {
            throw new BadRequestException('The seed must be an integer.');
        }

        return $this->generator->generate($seed)->toArray();
    }
}
