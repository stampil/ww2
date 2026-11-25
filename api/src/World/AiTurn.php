<?php

declare(strict_types=1);

namespace Ww2\World;

use Ww2\Base\BaseFounder;
use Ww2\Base\BattleStore;
use Ww2\Clock\ParisCalendar;
use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;

/**
 * The turn of the AI, played once for each day of Paris that an instance sees, by the first request of the day: the camps of the AI that are islands inside the other side go back to nobody,
 * then the AI of each side takes free camps, those nearest to its own first. A day nobody played in is not played later: the first request after it plays one turn.
 */
final class AiTurn
{
    /** How many free camps the AI of each side takes in a turn. */
    private const CAMPS_TAKEN_PER_SIDE = 2;

    public function __construct(
        private readonly Database $database,
        private readonly Bases $bases,
        private readonly AiCamps $aiCamps,
        private readonly SitePlaces $places,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
        private readonly BattleStore $battles,
    ) {
    }

    /**
     * Plays the turn of the day if it has not been played: one query when it has. The instance is locked while it is played, so that only one request does it. The caller holds no transaction.
     */
    public function resolveIfDue(int $instanceId): void
    {
        $days = $this->days($instanceId);
        if ($days['today'] <= $days['last']) {
            return;
        }
        $this->database->transaction(function () use ($instanceId): void {
            $this->database->fetchAll('SELECT id FROM instances WHERE id = :id FOR UPDATE', ['id' => $instanceId]);
            $days = $this->days($instanceId);
            if ($days['today'] <= $days['last']) {
                return;
            }
            $this->resolve($instanceId);
            $this->database->execute(
                'INSERT INTO instance_turns (instance_id, last_day) VALUES (:instance_id, :last_day) ON DUPLICATE KEY UPDATE last_day = :updated_day',
                ['instance_id' => $instanceId, 'last_day' => $days['today'], 'updated_day' => $days['today']],
            );
        });
    }

    /**
     * @return array{today: int, last: int} the days of Paris since the instance started, and the day of the last turn played: the first day, which is never played, until one has been
     */
    private function days(int $instanceId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT UNIX_TIMESTAMP(instances.started_at) AS started_epoch, UNIX_TIMESTAMP() AS now_epoch, instance_turns.last_day AS last_day
             FROM instances LEFT JOIN instance_turns ON instance_turns.instance_id = instances.id WHERE instances.id = :instance_id',
            ['instance_id' => $instanceId],
        );

        return [
            'today' => ParisCalendar::daysBetween((int) $rows[0]['started_epoch'], (int) $rows[0]['now_epoch']),
            'last' => $rows[0]['last_day'] === null ? 0 : (int) $rows[0]['last_day'],
        ];
    }

    private function resolve(int $instanceId): void
    {
        $aiHolderIds = $this->aiCamps->holdersOf($instanceId);
        if ($aiHolderIds === []) {
            return;
        }
        $camps = $this->campsOf($instanceId);
        $camps = $this->freeIslands($camps, $aiHolderIds);
        $this->takeFreeCamps($camps, $aiHolderIds);
    }

    /**
     * @return array<int, array{site: Site, holderId: int|null}> the camps of an instance, by the id of the base
     */
    private function campsOf(int $instanceId): array
    {
        $rows = $this->database->fetchAll('SELECT id, site, player_id FROM bases WHERE instance_id = :instance_id ORDER BY id', ['instance_id' => $instanceId]);
        $camps = [];
        foreach ($rows as $row) {
            $camps[(int) $row['id']] = ['site' => Site::from((string) $row['site']), 'holderId' => $row['player_id'] === null ? null : (int) $row['player_id']];
        }

        return $camps;
    }

    /**
     * Gives back the camps of the AI that are islands: each is judged on the camps as they stand at the start of the turn, so that the order they are taken in does not matter.
     *
     * @param array<int, array{site: Site, holderId: int|null}> $camps
     * @param array<string, int> $aiHolderIds the player of the AI of each side, by the name of the side
     * @return array<int, array{site: Site, holderId: int|null}> the camps once the islands are free
     */
    private function freeIslands(array $camps, array $aiHolderIds): array
    {
        $sides = $this->sidesOfHolders($camps);
        $islandIds = [];
        foreach ($camps as $campId => $camp) {
            if ($camp['holderId'] !== null && in_array($camp['holderId'], $aiHolderIds, true) && $this->isIsland($campId, $camps, $sides)) {
                $islandIds[] = $campId;
            }
        }
        foreach ($islandIds as $campId) {
            if ($this->bases->lockedHolderIdOf($campId) === $camps[$campId]['holderId']) {
                $this->bases->release($campId);
                $camps[$campId]['holderId'] = null;
            }
        }

        return $camps;
    }

    /**
     * @param array<int, array{site: Site, holderId: int|null}> $camps
     * @return array<int, Clan> the side of each player who holds a camp, by the id of the player
     */
    private function sidesOfHolders(array $camps): array
    {
        $sides = [];
        foreach ($camps as $camp) {
            if ($camp['holderId'] !== null && !array_key_exists($camp['holderId'], $sides)) {
                $sides[$camp['holderId']] = $this->bases->clanOfPlayer($camp['holderId']);
            }
        }

        return $sides;
    }

    /**
     * Whether a camp is nearer to a camp of the other side than to any other camp of its own side: a bubble in the land of the other side. Free camps count for neither side.
     *
     * @param array<int, array{site: Site, holderId: int|null}> $camps
     * @param array<int, Clan> $sides
     */
    private function isIsland(int $campId, array $camps, array $sides): bool
    {
        $site = $camps[$campId]['site'];
        $side = $sides[$camps[$campId]['holderId']];
        $nearestOwn = INF;
        $nearestOther = INF;
        foreach ($camps as $otherId => $other) {
            if ($otherId === $campId || $other['holderId'] === null) {
                continue;
            }
            $distance = $this->places->distanceShare($site, $other['site']);
            if ($sides[$other['holderId']] === $side) {
                $nearestOwn = min($nearestOwn, $distance);
            } else {
                $nearestOther = min($nearestOther, $distance);
            }
        }

        return $nearestOther < $nearestOwn;
    }

    /**
     * The AI of each side takes free camps in turn, one each time round, the nearest to a camp it holds, new ones included; an AI with no camp takes none.
     *
     * @param array<int, array{site: Site, holderId: int|null}> $camps
     * @param array<string, int> $aiHolderIds the player of the AI of each side, by the name of the side
     */
    private function takeFreeCamps(array $camps, array $aiHolderIds): void
    {
        for ($round = 0; $round < self::CAMPS_TAKEN_PER_SIDE; $round += 1) {
            foreach ($aiHolderIds as $aiHolderId) {
                $campId = $this->nearestFreeCamp($camps, $aiHolderId);
                if ($campId !== null && $this->take($campId, $aiHolderId)) {
                    $camps[$campId]['holderId'] = $aiHolderId;
                }
            }
        }
    }

    /**
     * @param array<int, array{site: Site, holderId: int|null}> $camps
     * @return int|null the free camp nearest to a camp that the AI holds, the first of them on a tie, or null when there is none or the AI holds no camp
     */
    private function nearestFreeCamp(array $camps, int $aiHolderId): ?int
    {
        $nearestId = null;
        $nearestDistance = INF;
        foreach ($camps as $freeId => $free) {
            if ($free['holderId'] !== null) {
                continue;
            }
            foreach ($camps as $own) {
                if ($own['holderId'] !== $aiHolderId) {
                    continue;
                }
                $distance = $this->places->distanceShare($free['site'], $own['site']);
                if ($distance < $nearestDistance) {
                    $nearestDistance = $distance;
                    $nearestId = $freeId;
                }
            }
        }

        return $nearestId;
    }

    /**
     * Gives a free camp to the AI, with a squadron and stocks like the camps it starts with; what the camp held is erased, as when a player chooses it.
     *
     * @return bool whether the camp was still free and is now the AI's
     */
    private function take(int $campId, int $aiHolderId): bool
    {
        if ($this->bases->lockedHolderIdOf($campId) !== null) {
            return false;
        }
        $this->battles->eraseGameOf($campId);
        $this->bases->assign($campId, $aiHolderId);
        $this->squadronFounder->found($campId);
        $this->baseFounder->found($campId);

        return true;
    }
}
