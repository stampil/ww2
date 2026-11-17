<?php

declare(strict_types=1);

namespace Ww2\Mission\Dogfight;

/**
 * Where an aircraft is on the grid of the dogfight, and which way it points: 0 north, 1 east, 2 south, 3 west.
 * Its firing cone is the cells straight ahead: one at distance 1, three wide at distances 2 and 3.
 */
final readonly class Position
{
    private const HEADING_COUNT = 4;
    /** @var list<array{int, int}> the step of one cell ahead for each heading: north, east, south, west */
    private const AHEAD = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    /** @var array<int, int> how far to either side of the line ahead the cone reaches, by distance ahead */
    private const CONE_HALF_WIDTH = [1 => 0, 2 => 1, 3 => 1];
    private const ACCELERATE_CELLS = 2;
    private const LEFT = -1;
    private const RIGHT = 1;

    public function __construct(public int $x, public int $y, public int $heading)
    {
    }

    /**
     * @param array{x: int, y: int, heading: int} $fields
     */
    public static function fromArray(array $fields): self
    {
        return new self($fields['x'], $fields['y'], $fields['heading']);
    }

    /**
     * @return array{x: int, y: int, heading: int}
     */
    public function toArray(): array
    {
        return ['x' => $this->x, 'y' => $this->y, 'heading' => $this->heading];
    }

    public function after(Maneuver $maneuver): self
    {
        return match ($maneuver) {
            Maneuver::Accelerate => $this->ahead(self::ACCELERATE_CELLS),
            Maneuver::TurnLeft => $this->ahead(1)->turned(self::LEFT),
            Maneuver::TurnRight => $this->ahead(1)->turned(self::RIGHT),
            Maneuver::SlipLeft => $this->sideways(self::LEFT),
            Maneuver::SlipRight => $this->sideways(self::RIGHT),
        };
    }

    public function isOnCellOf(self $other): bool
    {
        return $this->x === $other->x && $this->y === $other->y;
    }

    public function isInside(int $arenaSize): bool
    {
        return $this->x >= 0 && $this->x < $arenaSize && $this->y >= 0 && $this->y < $arenaSize;
    }

    /**
     * Whether the target is in the firing cone of this aircraft.
     */
    public function aimsAt(self $target): bool
    {
        [$aheadX, $aheadY] = self::AHEAD[$this->heading];
        [$rightX, $rightY] = self::AHEAD[($this->heading + 1) % self::HEADING_COUNT];
        $deltaX = $target->x - $this->x;
        $deltaY = $target->y - $this->y;
        $distanceAhead = $deltaX * $aheadX + $deltaY * $aheadY;
        $distanceSide = abs($deltaX * $rightX + $deltaY * $rightY);

        return isset(self::CONE_HALF_WIDTH[$distanceAhead]) && $distanceSide <= self::CONE_HALF_WIDTH[$distanceAhead];
    }

    private function ahead(int $cells): self
    {
        [$aheadX, $aheadY] = self::AHEAD[$this->heading];

        return new self($this->x + $cells * $aheadX, $this->y + $cells * $aheadY, $this->heading);
    }

    private function sideways(int $side): self
    {
        [$rightX, $rightY] = self::AHEAD[($this->heading + 1) % self::HEADING_COUNT];

        return new self($this->x + $side * $rightX, $this->y + $side * $rightY, $this->heading);
    }

    private function turned(int $side): self
    {
        return new self($this->x, $this->y, ($this->heading + $side + self::HEADING_COUNT) % self::HEADING_COUNT);
    }
}
