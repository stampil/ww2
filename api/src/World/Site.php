<?php

declare(strict_types=1);

namespace Ww2\World;

/**
 * The places where a base can stand, in the order they are laid out in each instance; the value is the name of the site for the front.
 * Names of towns: the map will place them.
 */
enum Site: string
{
    case Lille = 'lille';
    case Reims = 'reims';
    case Metz = 'metz';
    case Nancy = 'nancy';
    case Dijon = 'dijon';
    case Orleans = 'orleans';
}
