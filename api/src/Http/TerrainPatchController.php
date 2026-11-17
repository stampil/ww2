<?php

declare(strict_types=1);

namespace Ww2\Http;

use League\Route\Http\Exception\BadRequestException;
use Psr\Http\Message\ServerRequestInterface;
use Ww2\Terrain\TilePatchGenerator;

/**
 * Gives the front a square of tiles drawn at random from a seed, to test how tiles look side by side.
 */
final class TerrainPatchController
{
    public function __construct(private readonly TilePatchGenerator $generator)
    {
    }

    /**
     * @return array<string, mixed>
     * @throws BadRequestException when the seed is missing or is not an integer
     */
    public function __invoke(ServerRequestInterface $request): array
    {
        return $this->generator->generate(SeedParameter::read($request))->toArray();
    }
}
