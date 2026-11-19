<?php

declare(strict_types=1);

namespace Ww2\World;

/**
 * The two sides of the war: the Allies, which the code still calls the French because the first camps were French (the French, the Belgians), and the Axe, which is the Germans, the Italians and Vichy.
 * The players of one side are allies; the value is the name of the side for the front.
 */
enum Clan: string
{
    case French = 'french';
    case Axe = 'axe';
}
