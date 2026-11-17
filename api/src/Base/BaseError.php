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
}
