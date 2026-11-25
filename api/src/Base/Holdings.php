<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\SquadronFounder;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;

/**
 * Who holds the camps of a world as aircraft come and go: a free camp goes to the player whose aircraft landed on it first, and a camp stays its holder's while one of their aircraft stands on it.
 * Without one it goes to an ally whose aircraft stands there, else it is free again with what it holds. The first base of a player is theirs until the battle is over.
 */
final class Holdings
{
    public function __construct(
        private readonly Database $database,
        private readonly Bases $bases,
        private readonly BaseFounder $baseFounder,
        private readonly SquadronStore $squadrons,
        private readonly StationingStore $stationings,
        private readonly GameClockStore $clocks,
        private readonly EventLog $events,
        private readonly Garrison $garrison,
        private readonly MissionStore $missions,
        private readonly SquadronFounder $squadronFounder,
    ) {
    }

    /**
     * Takes a camp from its holder by force, for the player whose aircraft has landed on it: the aircraft on the camp are lost and its missions with them, those of the holder that are away go home,
     * and the camp keeps its stores, its pilots and its buildings, which are the new holder's. The caller holds the transaction.
     */
    public function seize(int $campId, int $captorId, Stationing $landing, int $gameSeconds): void
    {
        $holderId = $this->bases->lockedHolderIdOf($campId);
        foreach ($this->garrison->atCamp($campId, $gameSeconds) as $aircraftId) {
            $this->squadrons->removeAircraft($aircraftId);
        }
        $this->squadrons->clearWrecks($campId);
        $this->missions->removeAllOf($campId);
        $this->stationings->sendGuestsHome($campId);
        if ($holderId !== null) {
            $this->giveUp($campId, $holderId, ['capturedBy' => $this->bases->holderNameOf($landing->originBaseId)]);
        }
        $this->bases->assign($campId, $captorId);
        $this->baseFounder->foundEmpty($campId);
        $this->squadronFounder->foundMechanics($campId);
        $this->stationings->add($landing);
        $this->events->record($landing->originBaseId, ['kind' => 'campTaken', 'site' => $this->bases->siteOf($campId)->value]);
    }

    /**
     * Settles the camps of the world of a player, as they stand now. Nothing to do for a player who holds no base yet.
     */
    public function settleFor(int $playerId): void
    {
        $baseId = $this->bases->idOf($playerId);
        if ($baseId === null) {
            return;
        }
        $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
        $instanceId = $this->bases->instanceOf($baseId);
        $this->bases->populateIfBare($instanceId);
        foreach ($this->bases->campsOf($instanceId) as $camp) {
            $this->settleCamp($camp['id'], $camp['holderId'], $gameSeconds);
        }
    }

    private function settleCamp(int $campId, ?int $holderId, int $gameSeconds): void
    {
        $nextHolderId = $this->nextHolderOf($campId, $holderId, $gameSeconds);
        if ($nextHolderId === $holderId) {
            return;
        }
        $this->database->transaction(function () use ($campId, $holderId, $nextHolderId, $gameSeconds): void {
            if ($this->bases->lockedHolderIdOf($campId) !== $holderId) {
                return;
            }
            if ($nextHolderId !== null) {
                // Two camps taken at once by the same player are settled one after the other, so that the limit holds.
                $this->bases->lockedHolderIdOf($this->bases->idOf($nextHolderId));
            }
            if ($this->nextHolderOf($campId, $holderId, $gameSeconds) !== $nextHolderId) {
                return;
            }
            if ($holderId !== null) {
                $this->giveUp($campId, $holderId);
            }
            if ($nextHolderId !== null) {
                $this->bases->assign($campId, $nextHolderId);
                $this->baseFounder->foundEmpty($campId);
                $this->squadronFounder->foundMechanics($campId);
                $this->events->record($this->bases->idOf($nextHolderId), ['kind' => 'campTaken', 'site' => $this->bases->siteOf($campId)->value]);
            }
        });
    }

    /**
     * @return int|null the player who should hold the camp now: its holder while one of their aircraft is on it, else the player whose aircraft landed there first, who is an ally of the holder, or any player for a free camp
     */
    private function nextHolderOf(int $campId, ?int $holderId, int $gameSeconds): ?int
    {
        if ($holderId !== null && ($this->bases->idOf($holderId) === $campId || $this->hasOwnAircraftOn($campId, $gameSeconds))) {
            return $holderId;
        }
        $ownerIds = [];
        foreach ($this->stationings->landedAt($campId, $gameSeconds) as $stationing) {
            $ownerIds[] = $this->bases->holderIdOf($stationing->originBaseId);
        }
        if ($holderId !== null && in_array($holderId, $ownerIds, true)) {
            return $holderId;
        }
        foreach ($ownerIds as $ownerId) {
            if ($ownerId !== null && $this->canTake($ownerId, $holderId)) {
                return $ownerId;
            }
        }

        return null;
    }

    /**
     * @param int|null $holderId the player who holds the camp now, if any: only an ally of theirs can take it from them
     */
    private function canTake(int $playerId, ?int $holderId): bool
    {
        if (count($this->bases->idsOf($playerId)) >= Bases::MAX_PER_PLAYER) {
            return false;
        }

        return $holderId === null || $this->bases->clanOfPlayer($playerId) === $this->bases->clanOfPlayer($holderId);
    }

    /**
     * Whether an aircraft of the camp is on it: in its hangar, or out on a mission that will bring it back; one stationed elsewhere, or recalled, is not.
     */
    private function hasOwnAircraftOn(int $campId, int $gameSeconds): bool
    {
        $awayIds = [];
        foreach ($this->stationings->involving($campId) as $stationing) {
            $isHome = $stationing->returnsGameSecond !== null && $stationing->returnsGameSecond <= $gameSeconds;
            if ($stationing->originBaseId === $campId && !$isHome) {
                $awayIds[] = $stationing->aircraftId;
            }
        }
        foreach ($this->squadrons->aircraftOf($campId) as $aircraft) {
            if (!in_array($aircraft->id, $awayIds, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Lets a camp go: its aircraft that are away, and their pilots, belong to the first base of the player from now, and the camp is free. Its pilots at home, stores and buildings stay with it.
     *
     * @param array<string, mixed> $details what the journal says besides that the camp is lost
     */
    private function giveUp(int $campId, int $holderId, array $details = []): void
    {
        $homeId = $this->bases->idOf($holderId);
        foreach ($this->stationings->involving($campId) as $stationing) {
            if ($stationing->originBaseId === $campId) {
                $this->squadrons->moveAircraft($stationing->aircraftId, $homeId);
                $this->squadrons->movePilot($stationing->pilotId, $homeId);
                $this->stationings->rehome($stationing->aircraftId, $homeId);
            }
        }
        $this->bases->release($campId);
        $this->events->record($homeId, ['kind' => 'campLost', 'site' => $this->bases->siteOf($campId)->value] + $details);
    }
}
