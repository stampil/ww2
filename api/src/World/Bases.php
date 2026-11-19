<?php

declare(strict_types=1);

namespace Ww2\World;

use Ww2\Base\BaseError;
use Ww2\Base\BaseException;
use Ww2\Base\BaseFounder;
use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;

/**
 * The bases of the players: which ones a player holds, which sites are free to choose from, and the claiming of a site.
 */
final class Bases
{
    /** How many bases a player can hold, the first one included. */
    public const MAX_PER_PLAYER = 3;
    /** The bases of a player in the order they took them: those taken before the claims were kept come first, then by the time of the claim. */
    private const CLAIM_JOIN = 'LEFT JOIN base_claims ON base_claims.base_id = bases.id';
    private const CLAIM_ORDER = 'ORDER BY base_claims.claimed_at, bases.id';

    public function __construct(
        private readonly Database $database,
        private readonly Instances $instances,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
    ) {
    }

    /**
     * @return list<int> the bases the player holds, the first they took first
     */
    public function idsOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT bases.id AS id FROM bases ' . self::CLAIM_JOIN . ' WHERE bases.player_id = :player_id ' . self::CLAIM_ORDER,
            ['player_id' => $playerId],
        );
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = (int) $row['id'];
        }

        return $ids;
    }

    /**
     * @return int|null the first base the player holds, or null when they hold none
     */
    public function idOf(int $playerId): ?int
    {
        return $this->idsOf($playerId)[0] ?? null;
    }

    /**
     * @return int|null the base the player looks at: the one they chose if they still hold it, else the first they took, or null when they hold none
     */
    public function currentOf(int $playerId, ?int $chosenBaseId): ?int
    {
        $ids = $this->idsOf($playerId);
        if ($chosenBaseId !== null && in_array($chosenBaseId, $ids, true)) {
            return $chosenBaseId;
        }

        return $ids[0] ?? null;
    }

    /**
     * @throws BaseException when the player does not hold the base
     */
    public function assertHeldBy(int $playerId, int $baseId): void
    {
        if (!in_array($baseId, $this->idsOf($playerId), true)) {
            throw new BaseException(BaseError::UnknownBase);
        }
    }

    /**
     * The bases held by the player who holds this one, each with its site, the first they took first.
     *
     * @return list<array{id: int, site: string}>
     */
    public function heldWith(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT bases.id AS id, bases.site AS site FROM bases ' . self::CLAIM_JOIN
                . ' WHERE bases.player_id = (SELECT player_id FROM bases WHERE id = :base_id) ' . self::CLAIM_ORDER,
            ['base_id' => $baseId],
        );
        $held = [];
        foreach ($rows as $row) {
            $held[] = ['id' => (int) $row['id'], 'site' => (string) $row['site']];
        }

        return $held;
    }

    /**
     * Gives a base back: nobody holds it any more. Its game is erased by the caller.
     */
    public function release(int $baseId): void
    {
        $this->database->execute('UPDATE bases SET player_id = NULL WHERE id = :base_id', ['base_id' => $baseId]);
        $this->database->execute('DELETE FROM base_claims WHERE base_id = :base_id', ['base_id' => $baseId]);
    }

    public function siteOf(int $baseId): Site
    {
        $rows = $this->database->fetchAll('SELECT site FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return Site::from((string) $rows[0]['site']);
    }

    /**
     * The sites a new player can choose from: those of the oldest instance that has a free base, else all of a new instance.
     *
     * @return list<array{site: string, free: bool, clan: string, holder: string|null}>
     */
    public function sitesToChoose(): array
    {
        $instanceId = $this->instances->joinableId();
        if ($instanceId === null) {
            $states = [];
            foreach (Site::cases() as $site) {
                $states[] = $this->siteState($site, null);
            }

            return $states;
        }

        return $this->sitesOfInstance($instanceId);
    }

    /**
     * The sites of the instance a base stands in, each free or held by a player, with the side it belongs to.
     *
     * @return list<array{site: string, free: bool, clan: string, holder: string|null}>
     */
    public function sitesAround(int $baseId): array
    {
        return $this->sitesOfInstance($this->instanceOf($baseId));
    }

    /**
     * Gives the player a free base on the site. The first one is in the oldest instance that has room, or in a new instance, and starts with
     * a squadron and stocks; the next ones are in the instance of the first, and start empty.
     *
     * @return int the id of the base
     * @throws BaseException when the player holds as many bases as they can, or the site is taken
     */
    public function claim(int $playerId, Site $site): int
    {
        return $this->database->transaction(function () use ($playerId, $site): int {
            $heldIds = $this->idsOf($playerId);
            if (count($heldIds) >= self::MAX_PER_PLAYER) {
                throw new BaseException(BaseError::TooManyBases);
            }
            $instanceId = $heldIds === [] ? ($this->instances->joinableId() ?? $this->instances->create()) : $this->instanceOf($heldIds[0]);
            $rows = $this->database->fetchAll(
                'SELECT id FROM bases WHERE instance_id = :instance_id AND site = :site AND player_id IS NULL FOR UPDATE',
                ['instance_id' => $instanceId, 'site' => $site->value],
            );
            if ($rows === []) {
                throw new BaseException(BaseError::SiteTaken);
            }
            $baseId = (int) $rows[0]['id'];
            $this->database->execute('UPDATE bases SET player_id = :player_id WHERE id = :base_id', ['player_id' => $playerId, 'base_id' => $baseId]);
            $this->database->execute('INSERT INTO base_claims (base_id, claimed_at) VALUES (:base_id, NOW(6))', ['base_id' => $baseId]);
            if ($heldIds === []) {
                $this->squadronFounder->found($baseId);
                $this->baseFounder->found($baseId);
            } else {
                $this->baseFounder->foundEmpty($baseId);
            }

            return $baseId;
        });
    }

    private function instanceOf(int $baseId): int
    {
        $rows = $this->database->fetchAll('SELECT instance_id FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return (int) $rows[0]['instance_id'];
    }

    /**
     * @return list<array{site: string, free: bool, clan: string, holder: string|null}>
     */
    private function sitesOfInstance(int $instanceId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT bases.site AS site, players.nickname AS holder FROM bases LEFT JOIN players ON players.id = bases.player_id WHERE bases.instance_id = :instance_id ORDER BY bases.id',
            ['instance_id' => $instanceId],
        );
        $states = [];
        foreach ($rows as $row) {
            $states[] = $this->siteState(Site::from((string) $row['site']), $row['holder'] === null ? null : (string) $row['holder']);
        }

        return $states;
    }

    /**
     * @return array{site: string, free: bool, clan: string, holder: string|null}
     */
    private function siteState(Site $site, ?string $holder): array
    {
        return ['site' => $site->value, 'free' => $holder === null, 'clan' => $site->clan()->value, 'holder' => $holder];
    }
}
