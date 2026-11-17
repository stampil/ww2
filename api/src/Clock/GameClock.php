<?php

declare(strict_types=1);

namespace Ww2\Clock;

use DateTimeImmutable;
use DateTimeZone;

/**
 * The game time of an instance: the seconds gone by since the battle began. It never stops.
 */
final readonly class GameClock
{
    private const BATTLE_START = '1940-05-10 06:00:00';
    private const GAME_TIME_FORMAT = 'Y-m-d\TH:i:s';
    // The game date follows no real time zone, so UTC keeps daylight saving from shifting it.
    private const TIME_ZONE = 'UTC';

    public function __construct(public int $gameSeconds)
    {
    }

    /**
     * @return array{gameTime: string}
     */
    public function toArray(): array
    {
        $battleStart = new DateTimeImmutable(self::BATTLE_START, new DateTimeZone(self::TIME_ZONE));

        return ['gameTime' => $battleStart->modify('+' . $this->gameSeconds . ' seconds')->format(self::GAME_TIME_FORMAT)];
    }
}
