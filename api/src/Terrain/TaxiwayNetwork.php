<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * The links between neighbouring cells of the grid that a taxiway crosses, kept the same from both cells.
 */
final class TaxiwayNetwork
{
    /** @var array<string, array<int, Side>> the linked sides of each cell, by the value of the side */
    private array $linkedSides = [];

    public function link(int $row, int $column, Side $side): void
    {
        $this->open($row, $column, $side);
        $this->open($row + $side->rowStep(), $column + $side->columnStep(), $side->opposite());
    }

    public function crosses(int $row, int $column): bool
    {
        return isset($this->linkedSides[$this->key($row, $column)]);
    }

    public function isLinked(int $row, int $column, Side $side): bool
    {
        return isset($this->linkedSides[$this->key($row, $column)][$side->value]);
    }

    private function open(int $row, int $column, Side $side): void
    {
        $this->linkedSides[$this->key($row, $column)][$side->value] = $side;
    }

    private function key(int $row, int $column): string
    {
        return $row . ',' . $column;
    }
}
