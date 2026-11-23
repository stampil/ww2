<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Builds a destroyed building again, with materials from the stores of the camp, at once.
 */
final class Rebuilding
{
    public const MATERIAL_COST = 100;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly CampStore $camps,
    ) {
    }

    /**
     * @throws BaseException when the building stands, or the materials run short
     */
    public function rebuild(int $baseId, Building $building): void
    {
        $this->database->transaction(function () use ($baseId, $building): void {
            $resources = $this->bases->lockResources($baseId);
            if (!in_array($building, $this->camps->destroyedOf($baseId), true)) {
                throw new BaseException(BaseError::BuildingStanding);
            }
            if ($resources->materials < self::MATERIAL_COST) {
                throw new BaseException(BaseError::InsufficientMaterials);
            }
            $this->bases->spendMaterials($baseId, self::MATERIAL_COST);
            $this->camps->rebuild($baseId, $building);
        });
    }
}
