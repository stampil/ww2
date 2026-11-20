<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * What an aircraft carries in its hold to another base: a quantity of each of the four resources.
 */
final readonly class Cargo
{
    public function __construct(
        public int $fuel,
        public int $ammunition,
        public int $materials,
        public int $supplies,
    ) {
    }

    public function of(Resource $resource): int
    {
        return match ($resource) {
            Resource::Fuel => $this->fuel,
            Resource::Ammunition => $this->ammunition,
            Resource::Materials => $this->materials,
            Resource::Supplies => $this->supplies,
        };
    }

    public function isEmpty(): bool
    {
        return $this->fuel === 0 && $this->ammunition === 0 && $this->materials === 0 && $this->supplies === 0;
    }
}
