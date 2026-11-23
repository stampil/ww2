<?php

declare(strict_types=1);

namespace Ww2\Clock;

use DateTimeImmutable;
use DateTimeZone;

/**
 * The game time of an instance: the seconds gone by since the battle began, which never stops. The battle began on 10 May 1940
 * at the hour of the server when the instance was created, so the hour of the game is the real hour of the server, and the date follows the battle and starts it again.
 */
final readonly class GameClock
{
    private const BATTLE_DAY = '1940-05-10';
    // The battle of France lasts from 10 May to 24 June 1940, and the calendar of the game starts again after it.
    private const BATTLE_DAYS = 46;
    private const SECONDS_PER_DAY = 86400;
    private const GAME_TIME_FORMAT = 'Y-m-d\TH:i:s';
    // The game date follows no real time zone, so UTC keeps daylight saving from shifting it.
    private const TIME_ZONE = 'UTC';

    /**
     * @param int $startSecondOfDay the seconds since midnight, by the clock of the server, at which the instance was created
     */
    public function __construct(public int $gameSeconds, private int $startSecondOfDay)
    {
    }

    /**
     * @return array{gameTime: string}
     */
    public function toArray(): array
    {
        $battleDay = new DateTimeImmutable(self::BATTLE_DAY, new DateTimeZone(self::TIME_ZONE));
        $elapsedSeconds = ($this->startSecondOfDay + $this->gameSeconds) % (self::BATTLE_DAYS * self::SECONDS_PER_DAY);

        return ['gameTime' => $battleDay->modify('+' . $elapsedSeconds . ' seconds')->format(self::GAME_TIME_FORMAT)];
    }
}
