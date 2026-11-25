<?php

declare(strict_types=1);

namespace Ww2\Clock;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Days as they are counted in Paris, whatever the time zone of the server.
 */
final class ParisCalendar
{
    private const TIME_ZONE = 'Europe/Paris';

    /**
     * @return int how many days of Paris, midnight to midnight, separate two moments given in seconds since 1970
     */
    public static function daysBetween(int $fromEpoch, int $toEpoch): int
    {
        $timeZone = new DateTimeZone(self::TIME_ZONE);
        $from = (new DateTimeImmutable('@' . $fromEpoch))->setTimezone($timeZone)->setTime(0, 0);
        $to = (new DateTimeImmutable('@' . $toEpoch))->setTimezone($timeZone)->setTime(0, 0);

        return (int) $from->diff($to)->days;
    }
}
