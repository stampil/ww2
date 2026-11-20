<?php

declare(strict_types=1);

namespace Ww2\World;

use RuntimeException;

/**
 * Where each camp stands on the map of France, in pixels of its picture, in the file that the front reads too, and so how long an aircraft takes to fly from one camp to another.
 */
final class SitePlaces
{
    /** How long the flight takes, one way, between the two camps that stand farthest apart. */
    public const END_TO_END_SECONDS = 900;

    private readonly float $farthestDistance;

    /**
     * @param array<string, array{x: int, y: int}> $places by the name of the site
     */
    private function __construct(private readonly array $places)
    {
        $farthest = 0.0;
        foreach (Site::cases() as $first) {
            foreach (Site::cases() as $second) {
                $farthest = max($farthest, $this->distance($first, $second));
            }
        }
        $this->farthestDistance = $farthest;
    }

    /**
     * @throws RuntimeException when the file cannot be read
     */
    public static function fromFile(string $file): self
    {
        $contents = file_get_contents($file);
        if ($contents === false) {
            throw new RuntimeException('Cannot read the places of the camps in ' . $file);
        }

        return new self(json_decode($contents, true, flags: JSON_THROW_ON_ERROR));
    }

    /**
     * @return int the game seconds a flight from one camp to the other takes, in proportion to the distance between them on the map
     */
    public function flightSeconds(Site $from, Site $to): int
    {
        return (int) round(self::END_TO_END_SECONDS * $this->distance($from, $to) / $this->farthestDistance);
    }

    private function distance(Site $first, Site $second): float
    {
        return hypot(
            $this->places[$first->value]['x'] - $this->places[$second->value]['x'],
            $this->places[$first->value]['y'] - $this->places[$second->value]['y'],
        );
    }
}
