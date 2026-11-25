<?php

declare(strict_types=1);

namespace Ww2\World;

use Random\Randomizer;
use Ww2\Database\Database;

/**
 * The camps that the AI holds in a new instance: a share of the camps of each side, held half by the AI of each side, so that the AI of a side holds camps of its own and camps it has taken from the other.
 * The AI of a side is a player of the instance that no one can sign in as; its camps are the ones that the players of the other side can raid and take.
 */
final class AiCamps
{
    /** How much of the camps of each side the AI holds when an instance starts. */
    private const SHARE_PERCENT = 35;
    private const PERCENT = 100;
    /** A nickname that nobody can register, since a nickname has no space; the number is the instance. */
    private const NICKNAMES = [Clan::French->value => 'IA Alliés', Clan::Axe->value => 'IA Axe'];
    /** Not the hash of any password: nobody signs in as the AI. */
    private const NO_PASSWORD = '!';

    /** @var array<int, Clan|null> the side of each player asked about during this request, null for a person: it never changes */
    private array $clans = [];

    public function __construct(private readonly Database $database, private readonly Randomizer $random = new Randomizer())
    {
    }

    /**
     * The sites the AI holds in a new instance, drawn at random among the sites of each side, with the side that holds each: the first, the third, and so on for the Allies, the others for the Axe.
     *
     * @return list<array{site: Site, clan: Clan}>
     */
    public function draw(): array
    {
        $sides = Clan::cases();
        $holds = [];
        foreach ($sides as $nativeClan) {
            $sites = [];
            foreach (Site::cases() as $site) {
                if ($site->clan() === $nativeClan) {
                    $sites[] = $site;
                }
            }
            $count = (int) round(count($sites) * self::SHARE_PERCENT / self::PERCENT);
            foreach (array_slice($this->random->shuffleArray($sites), 0, $count) as $index => $site) {
                $holds[] = ['site' => $site, 'clan' => $sides[$index % count($sides)]];
            }
        }

        return $holds;
    }

    /**
     * Makes the two players that hold the camps of the AI in an instance, one for each side.
     *
     * @return array<string, int> the id of the player of each side, by the name of the side
     */
    public function createHolders(int $instanceId): array
    {
        $holders = [];
        foreach (Clan::cases() as $clan) {
            $this->database->execute(
                'INSERT INTO players (nickname, password_hash) VALUES (:nickname, :password_hash)',
                ['nickname' => self::NICKNAMES[$clan->value] . ' ' . $instanceId, 'password_hash' => self::NO_PASSWORD],
            );
            $playerId = (int) $this->database->fetchAll('SELECT LAST_INSERT_ID() AS id')[0]['id'];
            $this->database->execute(
                'INSERT INTO ai_holders (player_id, instance_id, clan) VALUES (:player_id, :instance_id, :clan)',
                ['player_id' => $playerId, 'instance_id' => $instanceId, 'clan' => $clan->value],
            );
            $holders[$clan->value] = $playerId;
        }

        return $holders;
    }

    /**
     * @return array<string, int> the player of the AI of each side in an instance, by the name of the side, the Allies first; empty for an instance made before the AI
     */
    public function holdersOf(int $instanceId): array
    {
        $rows = $this->database->fetchAll('SELECT player_id, clan FROM ai_holders WHERE instance_id = :instance_id ORDER BY player_id', ['instance_id' => $instanceId]);
        $holderIds = [];
        foreach ($rows as $row) {
            $holderIds[(string) $row['clan']] = (int) $row['player_id'];
        }

        return $holderIds;
    }

    /**
     * @return Clan|null the side of the AI that this player is, or null when the player is a person
     */
    public function clanOf(int $playerId): ?Clan
    {
        if (!array_key_exists($playerId, $this->clans)) {
            $rows = $this->database->fetchAll('SELECT clan FROM ai_holders WHERE player_id = :player_id', ['player_id' => $playerId]);
            $this->clans[$playerId] = $rows === [] ? null : Clan::from((string) $rows[0]['clan']);
        }

        return $this->clans[$playerId];
    }
}
