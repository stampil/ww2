<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Keeps what raids do to a camp: its defense, which rises back by itself, the raids that hurt it, and its buildings that are destroyed until they are rebuilt.
 */
final class CampStore
{
    public const DEFENSE_MAX = 100;
    /** How long a camp takes to regain one point of defense. */
    private const GAME_SECONDS_PER_POINT = 120;

    public function __construct(private readonly Database $database)
    {
    }

    /**
     * @return int the defense of the camp now: what was left after the last raid, plus what it has regained since
     */
    public function defenseOf(int $baseId, int $gameSeconds): int
    {
        $rows = $this->database->fetchAll('SELECT defense, updated_game_second FROM camp_defenses WHERE base_id = :base_id', ['base_id' => $baseId]);
        if ($rows === []) {
            return self::DEFENSE_MAX;
        }
        $regained = intdiv($gameSeconds - (int) $rows[0]['updated_game_second'], self::GAME_SECONDS_PER_POINT);

        return min(self::DEFENSE_MAX, (int) $rows[0]['defense'] + $regained);
    }

    public function setDefense(int $baseId, int $defense, int $gameSeconds): void
    {
        $this->database->execute(
            'INSERT INTO camp_defenses (base_id, defense, updated_game_second) VALUES (:base_id, :defense, :game_second)
             ON DUPLICATE KEY UPDATE defense = :new_defense, updated_game_second = :new_game_second',
            ['base_id' => $baseId, 'defense' => $defense, 'game_second' => $gameSeconds, 'new_defense' => $defense, 'new_game_second' => $gameSeconds],
        );
    }

    public function recordRaid(int $baseId, int $gameSeconds): void
    {
        $this->database->execute('INSERT INTO camp_raids (base_id, game_second) VALUES (:base_id, :game_second)', ['base_id' => $baseId, 'game_second' => $gameSeconds]);
    }

    /**
     * @return int how many raids hurt the camp from this game second on
     */
    public function raidsSince(int $baseId, int $sinceGameSecond): int
    {
        $rows = $this->database->fetchAll(
            'SELECT COUNT(*) AS total FROM camp_raids WHERE base_id = :base_id AND game_second >= :since',
            ['base_id' => $baseId, 'since' => $sinceGameSecond],
        );

        return (int) $rows[0]['total'];
    }

    /**
     * @return list<Building> the buildings of the camp that are destroyed
     */
    public function destroyedOf(int $baseId): array
    {
        $rows = $this->database->fetchAll('SELECT building FROM destroyed_buildings WHERE base_id = :base_id ORDER BY building', ['base_id' => $baseId]);

        return array_map(static fn (array $row): Building => Building::from((string) $row['building']), $rows);
    }

    public function destroy(int $baseId, Building $building): void
    {
        $this->database->execute(
            'INSERT INTO destroyed_buildings (base_id, building) VALUES (:base_id, :building) ON DUPLICATE KEY UPDATE building = building',
            ['base_id' => $baseId, 'building' => $building->value],
        );
    }

    /**
     * @return bool whether the building was destroyed, and stands again
     */
    public function rebuild(int $baseId, Building $building): bool
    {
        return $this->database->execute('DELETE FROM destroyed_buildings WHERE base_id = :base_id AND building = :building', ['base_id' => $baseId, 'building' => $building->value]) > 0;
    }

    /**
     * @throws BaseException when the building is destroyed
     */
    public function assertStanding(int $baseId, Building $building): void
    {
        if (in_array($building, $this->destroyedOf($baseId), true)) {
            throw new BaseException(BaseError::BuildingDestroyed);
        }
    }
}
