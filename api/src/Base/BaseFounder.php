<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * Gives a new base what it starts with: some supplies and stocks, and no command points yet; a camp taken by landing on it has nothing, or what it kept.
 */
final class BaseFounder
{
    private const STARTING_SUPPLIES = 1000;
    private const STARTING_FUEL = 400;
    private const STARTING_AMMUNITION = 400;
    private const STARTING_MATERIALS = 200;
    private const STARTING_COMMAND_POINTS = 0;
    private const NOTHING = 0;

    public function __construct(private readonly BaseStore $bases)
    {
    }

    public function found(int $baseId): void
    {
        $this->bases->add($baseId, new BaseResources(
            self::STARTING_SUPPLIES,
            self::STARTING_FUEL,
            self::STARTING_AMMUNITION,
            self::STARTING_MATERIALS,
            self::STARTING_COMMAND_POINTS,
        ));
    }

    public function foundEmpty(int $baseId): void
    {
        $this->bases->addIfMissing($baseId, new BaseResources(self::NOTHING, self::NOTHING, self::NOTHING, self::NOTHING, self::NOTHING));
    }
}
