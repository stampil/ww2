<?php

declare(strict_types=1);

namespace Ww2\World;

use Ww2\Base\BaseError;
use Ww2\Base\BaseException;
use Ww2\Base\BaseFounder;
use Ww2\Base\BattleStore;
use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;

/**
 * The bases of the players: which ones a player holds, which sites are free, the first base a player chooses, and the camps they take afterwards by landing on them.
 */
final class Bases
{
    /** How many bases a player can hold, the first one included. */
    public const MAX_PER_PLAYER = 3;
    /** The bases of a player in the order they took them: those taken before the claims were kept come first, then by the time of the claim. */
    private const CLAIM_JOIN = 'LEFT JOIN base_claims ON base_claims.base_id = bases.id';
    private const CLAIM_ORDER = 'ORDER BY base_claims.claimed_at, bases.id';
    /** How long after a raid that hurt it a camp is shown as under attack. */
    private const UNDER_ATTACK_SECONDS = 600;

    public function __construct(
        private readonly Database $database,
        private readonly Instances $instances,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
        private readonly BattleStore $battles,
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
     * The other bases of the world of a base that its player can give to: their own, and those held by allies of the same side.
     *
     * @return list<array{id: int, site: string, holder: string, kinship: Kinship}>
     */
    public function recipientsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT bases.id AS id, bases.site AS site, bases.player_id AS player_id, players.nickname AS holder FROM bases
             JOIN players ON players.id = bases.player_id
             WHERE bases.instance_id = (SELECT instance_id FROM bases WHERE id = :base_id) ORDER BY bases.id',
            ['base_id' => $baseId],
        );
        $giver = null;
        foreach ($rows as $row) {
            if ((int) $row['id'] === $baseId) {
                $giver = $row;
            }
        }
        $recipients = [];
        $clans = [];
        foreach ($rows as $row) {
            if ($giver === null || (int) $row['id'] === $baseId) {
                continue;
            }
            $site = Site::from((string) $row['site']);
            $clans[(int) $row['player_id']] ??= $this->clanOfPlayer((int) $row['player_id']);
            $clans[(int) $giver['player_id']] ??= $this->clanOfPlayer((int) $giver['player_id']);
            if ($row['player_id'] === $giver['player_id']) {
                $kinship = Kinship::Own;
            } elseif ($clans[(int) $row['player_id']] === $clans[(int) $giver['player_id']]) {
                $kinship = Kinship::Ally;
            } else {
                continue;
            }
            $recipients[] = ['id' => (int) $row['id'], 'site' => $site->value, 'holder' => (string) $row['holder'], 'kinship' => $kinship];
        }

        return $recipients;
    }

    /**
     * Where an aircraft of a base can be stationed: the bases a gift can go to, and the free camps of the world, which an aircraft takes by landing on one first.
     *
     * @return list<array{id: int, site: string, holder: string|null, kinship: Kinship}>
     */
    public function destinationsOf(int $baseId): array
    {
        $destinations = $this->recipientsOf($baseId);
        $rows = $this->database->fetchAll(
            'SELECT id, site FROM bases WHERE instance_id = (SELECT instance_id FROM bases WHERE id = :base_id) AND player_id IS NULL',
            ['base_id' => $baseId],
        );
        foreach ($rows as $row) {
            $destinations[] = ['id' => (int) $row['id'], 'site' => (string) $row['site'], 'holder' => null, 'kinship' => Kinship::Free];
        }
        usort($destinations, static fn (array $first, array $second): int => $first['id'] <=> $second['id']);

        return $destinations;
    }

    /**
     * @return Kinship|null how the other base stands to the base, or null when the player cannot give to it
     */
    public function kinshipTo(int $fromBaseId, int $toBaseId): ?Kinship
    {
        foreach ($this->recipientsOf($fromBaseId) as $recipient) {
            if ($recipient['id'] === $toBaseId) {
                return $recipient['kinship'];
            }
        }

        return null;
    }

    /**
     * @return int|null the player who holds the base, or null when it is free
     */
    public function holderIdOf(int $baseId): ?int
    {
        $rows = $this->database->fetchAll('SELECT player_id FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return $rows[0]['player_id'] === null ? null : (int) $rows[0]['player_id'];
    }

    /**
     * Like holderIdOf, and holds the base until the end of the transaction so that no one else takes or gives it meanwhile.
     */
    public function lockedHolderIdOf(int $baseId): ?int
    {
        $rows = $this->database->fetchAll('SELECT player_id FROM bases WHERE id = :base_id FOR UPDATE', ['base_id' => $baseId]);

        return $rows[0]['player_id'] === null ? null : (int) $rows[0]['player_id'];
    }

    /**
     * @return list<array{id: int, holderId: int|null}> the bases of an instance, with the player who holds each, if any
     */
    public function campsOf(int $instanceId): array
    {
        $rows = $this->database->fetchAll('SELECT id, player_id FROM bases WHERE instance_id = :instance_id ORDER BY id', ['instance_id' => $instanceId]);
        $camps = [];
        foreach ($rows as $row) {
            $camps[] = ['id' => (int) $row['id'], 'holderId' => $row['player_id'] === null ? null : (int) $row['player_id']];
        }

        return $camps;
    }

    /**
     * The side of a player: the side of the site of the first base they took.
     */
    public function clanOfPlayer(int $playerId): Clan
    {
        return $this->siteOf($this->idOf($playerId))->clan();
    }

    /**
     * Gives a free base to a player, who holds it from now. The caller holds the base and has checked that the player may have it.
     */
    public function assign(int $baseId, int $playerId): void
    {
        $this->database->execute('UPDATE bases SET player_id = :player_id WHERE id = :base_id', ['player_id' => $playerId, 'base_id' => $baseId]);
        $this->database->execute('INSERT INTO base_claims (base_id, claimed_at) VALUES (:base_id, NOW(6))', ['base_id' => $baseId]);
    }

    /**
     * @return int|null how many seconds ago the player took the first of the bases they hold, or null when it was taken before the claims were kept
     */
    public function secondsSinceFirstClaim(int $playerId): ?int
    {
        $rows = $this->database->fetchAll(
            'SELECT TIMESTAMPDIFF(SECOND, base_claims.claimed_at, NOW(6)) AS seconds FROM bases ' . self::CLAIM_JOIN . ' WHERE bases.player_id = :player_id ' . self::CLAIM_ORDER . ' LIMIT 1',
            ['player_id' => $playerId],
        );

        return $rows === [] || $rows[0]['seconds'] === null ? null : (int) $rows[0]['seconds'];
    }

    public function holderNameOf(int $baseId): string
    {
        $rows = $this->database->fetchAll('SELECT players.nickname AS nickname FROM bases JOIN players ON players.id = bases.player_id WHERE bases.id = :base_id', ['base_id' => $baseId]);

        return (string) $rows[0]['nickname'];
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
     * @return list<array{site: string, free: bool, clan: string, holder: string|null, resources: array<string, int>|null, aircraft: int, attacked: bool}>
     */
    public function sitesToChoose(): array
    {
        $instanceId = $this->instances->joinableId();
        if ($instanceId === null) {
            return array_map(fn (Site $site): array => $this->siteState($site, null, null, null, 0, false), Site::cases());
        }

        return $this->sitesAroundInstance($instanceId);
    }

    /**
     * The sites of the instance a base stands in, each free or held by a player, with the side of its holder, what its stores hold and how many aircraft stand there.
     *
     * @return list<array{site: string, free: bool, clan: string, holder: string|null, resources: array<string, int>|null, aircraft: int, attacked: bool}>
     */
    public function sitesAround(int $baseId): array
    {
        return $this->sitesAroundInstance($this->instanceOf($baseId));
    }

    /**
     * Gives a new player the base on the site they choose, which is free, in the oldest instance that has room or in a new one, with a squadron and stocks; what the camp held is erased.
     * The next bases of a player are taken by landing an aircraft on them.
     *
     * @return int the id of the base
     * @throws BaseException when the player already holds a base, or the site is not free
     */
    public function claim(int $playerId, Site $site): int
    {
        return $this->database->transaction(function () use ($playerId, $site): int {
            if ($this->idsOf($playerId) !== []) {
                throw new BaseException(BaseError::LandingRequired);
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
            $this->battles->eraseGameOf($baseId);
            $this->assign($baseId, $playerId);
            $this->squadronFounder->found($baseId);
            $this->baseFounder->found($baseId);

            return $baseId;
        });
    }

    public function instanceOf(int $baseId): int
    {
        $rows = $this->database->fetchAll('SELECT instance_id FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return (int) $rows[0]['instance_id'];
    }

    /**
     * The aircraft standing at a camp are its own that are not away, and the ones of other bases landed there and not recalled.
     *
     * @return list<array{site: string, free: bool, clan: string, holder: string|null, resources: array<string, int>|null, aircraft: int, attacked: bool}>
     */
    private function sitesAroundInstance(int $instanceId): array
    {
        $gameSeconds = 'TIMESTAMPDIFF(SECOND, instances.started_at, NOW())';
        $rows = $this->database->fetchAll(
            'SELECT bases.site AS site, bases.player_id AS player_id, players.nickname AS holder,
                    base_resources.supplies, base_resources.fuel, base_resources.ammunition, base_resources.materials,
                    (SELECT COUNT(*) FROM aircraft WHERE aircraft.base_id = bases.id)
                    - (SELECT COUNT(*) FROM stationings AS leaving WHERE leaving.origin_base_id = bases.id AND (leaving.returns_game_second IS NULL OR leaving.returns_game_second > ' . $gameSeconds . '))
                    + (SELECT COUNT(*) FROM stationings AS arrived WHERE arrived.destination_base_id = bases.id AND arrived.returns_game_second IS NULL AND arrived.lands_game_second <= ' . $gameSeconds . ') AS aircraft,
                    (SELECT COUNT(*) FROM camp_raids WHERE camp_raids.base_id = bases.id AND camp_raids.game_second + ' . self::UNDER_ATTACK_SECONDS . ' > ' . $gameSeconds . ') AS recent_raids
             FROM bases JOIN instances ON instances.id = bases.instance_id LEFT JOIN players ON players.id = bases.player_id LEFT JOIN base_resources ON base_resources.base_id = bases.id
             WHERE bases.instance_id = :instance_id ORDER BY bases.id',
            ['instance_id' => $instanceId],
        );
        $states = [];
        foreach ($rows as $row) {
            $resources = $row['supplies'] === null
                ? null
                : ['supplies' => (int) $row['supplies'], 'fuel' => (int) $row['fuel'], 'ammunition' => (int) $row['ammunition'], 'materials' => (int) $row['materials']];
            $states[] = $this->siteState(Site::from((string) $row['site']), $row['player_id'] === null ? null : (int) $row['player_id'], $row['holder'] === null ? null : (string) $row['holder'], $resources, (int) $row['aircraft'], (int) $row['recent_raids'] > 0);
        }

        return $states;
    }

    /**
     * @param int|null $holderId the player who holds the site, whose side it has; a free site shows the side its first base would give
     * @param array<string, int>|null $resources what the stores of the camp hold, null while it has none
     * @param int $aircraft how many aircraft stand at the camp
     * @param bool $isUnderAttack whether a raid hurt the camp a few minutes ago
     * @return array{site: string, free: bool, clan: string, holder: string|null, resources: array<string, int>|null, aircraft: int, attacked: bool}
     */
    private function siteState(Site $site, ?int $holderId, ?string $holder, ?array $resources, int $aircraft, bool $isUnderAttack): array
    {
        $clan = $holderId === null ? $site->clan() : $this->clanOfPlayer($holderId);

        return ['site' => $site->value, 'free' => $holderId === null, 'clan' => $clan->value, 'holder' => $holder, 'resources' => $resources, 'aircraft' => $aircraft, 'attacked' => $isUnderAttack];
    }
}
