<?php

declare(strict_types=1);

namespace Ww2\World;

use Ww2\Base\BaseError;
use Ww2\Base\BaseException;
use Ww2\Base\BaseFounder;
use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;

/**
 * The bases of the players: which one a player holds, which sites are free to choose from, and the claiming of a site.
 */
final class Bases
{
    public function __construct(
        private readonly Database $database,
        private readonly Instances $instances,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
    ) {
    }

    /**
     * @return int|null the first base the player holds, or null when they hold none
     */
    public function idOf(int $playerId): ?int
    {
        $rows = $this->database->fetchAll('SELECT id FROM bases WHERE player_id = :player_id ORDER BY id LIMIT 1', ['player_id' => $playerId]);

        return $rows === [] ? null : (int) $rows[0]['id'];
    }

    public function siteOf(int $baseId): Site
    {
        $rows = $this->database->fetchAll('SELECT site FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return Site::from((string) $rows[0]['site']);
    }

    /**
     * The sites a new player can choose from: those of the oldest instance that has a free base, else all of a new instance.
     *
     * @return list<array{site: string, free: bool}>
     */
    public function sitesToChoose(): array
    {
        $instanceId = $this->instances->joinableId();
        if ($instanceId === null) {
            return array_map(static fn (Site $site): array => ['site' => $site->value, 'free' => true], Site::cases());
        }

        return $this->sitesOfInstance($instanceId);
    }

    /**
     * The sites of the instance a base stands in, each free or held by a player.
     *
     * @return list<array{site: string, free: bool}>
     */
    public function sitesAround(int $baseId): array
    {
        $rows = $this->database->fetchAll('SELECT instance_id FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return $this->sitesOfInstance((int) $rows[0]['instance_id']);
    }

    /**
     * Gives the player a free base on the site, in the oldest instance that has room, or in a new instance, and founds it.
     *
     * @return int the id of the base
     * @throws BaseException when the player holds a base already, or the site is taken
     */
    public function claim(int $playerId, Site $site): int
    {
        return $this->database->transaction(function () use ($playerId, $site): int {
            if ($this->idOf($playerId) !== null) {
                throw new BaseException(BaseError::AlreadyHasBase);
            }
            $instanceId = $this->instances->joinableId() ?? $this->instances->create();
            $rows = $this->database->fetchAll(
                'SELECT id FROM bases WHERE instance_id = :instance_id AND site = :site AND player_id IS NULL FOR UPDATE',
                ['instance_id' => $instanceId, 'site' => $site->value],
            );
            if ($rows === []) {
                throw new BaseException(BaseError::SiteTaken);
            }
            $baseId = (int) $rows[0]['id'];
            $this->database->execute('UPDATE bases SET player_id = :player_id WHERE id = :base_id', ['player_id' => $playerId, 'base_id' => $baseId]);
            $this->squadronFounder->found($baseId);
            $this->baseFounder->found($baseId);

            return $baseId;
        });
    }

    /**
     * @return list<array{site: string, free: bool}>
     */
    private function sitesOfInstance(int $instanceId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT site, player_id IS NULL AS free FROM bases WHERE instance_id = :instance_id ORDER BY id',
            ['instance_id' => $instanceId],
        );

        return array_map(static fn (array $row): array => ['site' => (string) $row['site'], 'free' => (bool) $row['free']], $rows);
    }
}
