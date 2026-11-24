<?php

declare(strict_types=1);

namespace Ww2\Clock;

use DateTimeImmutable;
use DateTimeZone;

/**
 * The game time of an instance: the seconds gone by since the battle began, which never stops. The battle began on 10 May 1940
 * on the day the instance was created, and the hour of the game is the real hour in Paris, whatever the clock of the server: the date follows the battle and starts it again.
 */
final readonly class GameClock
{
    private const BATTLE_DAY = '1940-05-10';
    // The battle of France lasts from 10 May to 24 June 1940, and the calendar of the game starts again after it.
    private const BATTLE_DAYS = 46;
    private const DATE_FORMAT = 'Y-m-d';
    private const TIME_FORMAT = '\TH:i:s';
    private const TIME_ZONE = 'Europe/Paris';

    /**
     * @param int $startEpoch the moment the instance was created, in seconds since 1 January 1970 UTC
     */
    public function __construct(public int $gameSeconds, private int $startEpoch)
    {
    }

    /**
     * @return array{gameTime: string}
     */
    public function toArray(): array
    {
        $timeZone = new DateTimeZone(self::TIME_ZONE);
        $start = (new DateTimeImmutable('@' . $this->startEpoch))->setTimezone($timeZone);
        $now = (new DateTimeImmutable('@' . ($this->startEpoch + $this->gameSeconds)))->setTimezone($timeZone);
        $daysSinceStart = $start->setTime(0, 0)->diff($now->setTime(0, 0))->days;
        $gameDay = (new DateTimeImmutable(self::BATTLE_DAY, $timeZone))->modify('+' . ($daysSinceStart % self::BATTLE_DAYS) . ' days');

        return ['gameTime' => $gameDay->format(self::DATE_FORMAT) . $now->format(self::TIME_FORMAT)];
    }
}
