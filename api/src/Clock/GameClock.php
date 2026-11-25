<?php

declare(strict_types=1);

namespace Ww2\Clock;

use DateTimeImmutable;
use DateTimeZone;

/**
 * The game time of an instance: the seconds gone by since it was created, which never stops. The month, the day and the hour of the game are the real ones in Paris, whatever the clock of the server;
 * the year is 1940 on the day the instance was created, one more each 1 January, and 1940 again after 1944.
 */
final readonly class GameClock
{
    private const FIRST_YEAR = 1940;
    private const YEARS = 5;
    private const LAST_DAY_OF_COMMON_FEBRUARY = 28;
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
        $now = $this->parisTime($this->startEpoch + $this->gameSeconds);

        return ['gameTime' => $this->gameDateOf($now) . $now->format(self::TIME_FORMAT)];
    }

    /**
     * @param int $epoch a moment of the life of the instance, in seconds since 1970
     * @return string the day of the game that the moment falls on, like 1941-03-02
     */
    public function dateOf(int $epoch): string
    {
        return $this->gameDateOf($this->parisTime($epoch));
    }

    private function gameDateOf(DateTimeImmutable $moment): string
    {
        $yearsSinceStart = (int) $moment->format('Y') - (int) $this->parisTime($this->startEpoch)->format('Y');
        $year = self::FIRST_YEAR + $yearsSinceStart % self::YEARS;
        $month = (int) $moment->format('n');
        $day = (int) $moment->format('j');
        // The 29 February of a real leap year has no day in a year of the game that is not one.
        if (!checkdate($month, $day, $year)) {
            $day = self::LAST_DAY_OF_COMMON_FEBRUARY;
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    private function parisTime(int $epoch): DateTimeImmutable
    {
        return (new DateTimeImmutable('@' . $epoch))->setTimezone(new DateTimeZone(self::TIME_ZONE));
    }
}
