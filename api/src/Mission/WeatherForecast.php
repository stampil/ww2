<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Engine\Xoshiro256StarStar;
use Random\Randomizer;

/**
 * Tells the weather at a game time. It changes every half hour and depends on nothing but the time, so every player sees the same.
 */
final class WeatherForecast
{
    private const PERIOD_SECONDS = 1800;
    private const MAX_WIND_SPEED = 60;

    public function at(int $gameSeconds): Weather
    {
        $random = new Randomizer(new Xoshiro256StarStar(intdiv($gameSeconds, self::PERIOD_SECONDS)));

        return new Weather($random->getInt(0, self::MAX_WIND_SPEED));
    }
}
