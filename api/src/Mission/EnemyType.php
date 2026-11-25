<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\World\Clan;

/**
 * The enemy aircraft a pilot can meet in a mini-game; the value is the name of the type for the front.
 */
enum EnemyType: string
{
    case Bf109 = 'bf109';
    case VichyD520 = 'vichyD520';
    case FrenchD520 = 'frenchD520';
    case He111 = 'he111';
    case Ju87 = 'ju87';
    case Amiot143 = 'amiot143';
    case Leo451 = 'leo451';

    public function isFighter(): bool
    {
        return $this === self::Bf109 || $this === self::VichyD520 || $this === self::FrenchD520;
    }

    /**
     * The enemy of an alert: among those that a side meets in that kind of alert, the one the number of the alert picks.
     */
    public static function of(Clan $clan, AlertKind $kind, int $alertId): self
    {
        $enemies = self::metBy($clan, $kind);

        return $enemies[$alertId % count($enemies)];
    }

    /**
     * Fighters in the cockpit, bombers on the grid: the Allies meet the Germans and Vichy in the air and the German bombers on the grid, the Axe the French.
     *
     * @return non-empty-list<self>
     */
    private static function metBy(Clan $clan, AlertKind $kind): array
    {
        if ($kind === AlertKind::Dogfight) {
            return $clan === Clan::French ? [self::He111, self::Ju87] : [self::Amiot143, self::Leo451];
        }

        return $clan === Clan::French ? [self::Bf109, self::VichyD520] : [self::FrenchD520];
    }
}
