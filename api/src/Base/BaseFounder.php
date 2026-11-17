<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * Gives a new player a base to start with: the starting airfield, some supplies and stocks, and no command points yet.
 */
final class BaseFounder
{
    private const STARTING_TERRAIN_PLAN = 'start';
    private const STARTING_SUPPLIES = 1000;
    private const STARTING_FUEL = 400;
    private const STARTING_AMMUNITION = 400;
    private const STARTING_MATERIALS = 200;
    private const STARTING_COMMAND_POINTS = 0;

    public function __construct(private readonly BaseStore $bases)
    {
    }

    public function found(int $playerId): void
    {
        $this->bases->add($playerId, new BaseResources(
            self::STARTING_SUPPLIES,
            self::STARTING_FUEL,
            self::STARTING_AMMUNITION,
            self::STARTING_MATERIALS,
            self::STARTING_COMMAND_POINTS,
        ), self::STARTING_TERRAIN_PLAN);
    }
}
