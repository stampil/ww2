<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Squadron\Aircraft;

/**
 * An aircraft of another base standing on a camp after landing there: the camp flies it on its missions unless it is grounded, while its own base keeps its inspections and repairs.
 */
final readonly class LandedAircraft
{
    public function __construct(public Aircraft $aircraft, public int $originBaseId, public bool $isGrounded)
    {
    }
}
