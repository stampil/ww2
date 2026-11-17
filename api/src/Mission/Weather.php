<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * The weather over the airfields at a given time; for now only the wind, in kilometres per hour.
 */
final readonly class Weather
{
    public function __construct(public int $windSpeed)
    {
    }

    /**
     * @return array{windSpeed: int}
     */
    public function toArray(): array
    {
        return ['windSpeed' => $this->windSpeed];
    }
}
