<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * Why a request to the base is refused; the value is the code the front turns into a message.
 */
enum BaseError: string
{
    case InvalidQuantity = 'invalidQuantity';
    case InsufficientSupplies = 'insufficientSupplies';
    case WarehouseFull = 'warehouseFull';
    case InsufficientMaterials = 'insufficientMaterials';
    case WorkshopBusy = 'workshopBusy';
    case NoMechanicFree = 'noMechanicFree';
    case UnknownMission = 'unknownMission';
    case InvalidCrew = 'invalidCrew';
    case CrewBusy = 'crewBusy';
    case AircraftNotSuited = 'aircraftNotSuited';
    case InvalidLoad = 'invalidLoad';
    case InsufficientFuel = 'insufficientFuel';
    case InsufficientAmmunition = 'insufficientAmmunition';
    case StillInFlight = 'stillInFlight';
    case UnknownAircraft = 'unknownAircraft';
    case AircraftGrounded = 'aircraftGrounded';
    case AircraftUnderRepair = 'aircraftUnderRepair';
    case NothingToRepair = 'nothingToRepair';
    case UnknownAlert = 'unknownAlert';
    case AlertNotDue = 'alertNotDue';
    case AlertNotStarted = 'alertNotStarted';
    case AlertDone = 'alertDone';
    case AlertWrongKind = 'alertWrongKind';
    case NotInspected = 'notInspected';
    case NothingToInspect = 'nothingToInspect';
    case AircraftUnderInspection = 'aircraftUnderInspection';
    case MissingSparePart = 'missingSparePart';
    case UnknownPilot = 'unknownPilot';
    case PilotResting = 'pilotResting';
    case NothingToRest = 'nothingToRest';
    case TooManyPilots = 'tooManyPilots';
    case UpgradeAtMaximum = 'upgradeAtMaximum';
    case InsufficientCommandPoints = 'insufficientCommandPoints';
    case BattleOver = 'battleOver';
    case BattleOngoing = 'battleOngoing';
    case NoBase = 'noBase';
    case TooManyBases = 'tooManyBases';
    case UnknownBase = 'unknownBase';
    case InvalidRecipient = 'invalidRecipient';
    case OwnBasesOnly = 'ownBasesOnly';
    case RecipientWarehouseFull = 'recipientWarehouseFull';
    case HangarFull = 'hangarFull';
    case SiteTaken = 'siteTaken';
}
