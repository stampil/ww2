<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * Where the runway lies: always straight, east and west, on one row.
 */
final readonly class Runway
{
    public function __construct(public int $row, public int $firstColumn, public int $length)
    {
    }

    public function lastColumn(): int
    {
        return $this->firstColumn + $this->length - 1;
    }

    public function covers(int $row, int $column): bool
    {
        return $row === $this->row && $column >= $this->firstColumn && $column <= $this->lastColumn();
    }

    /**
     * @return array{row: int, firstColumn: int, length: int}
     */
    public function toArray(): array
    {
        return ['row' => $this->row, 'firstColumn' => $this->firstColumn, 'length' => $this->length];
    }
}
