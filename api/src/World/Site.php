<?php

declare(strict_types=1);

namespace Ww2\World;

/**
 * The camps of the world, the same in every instance, in the order they are laid out; the value is the name of the site for the front.
 * Each is an airfield of 1940, ten in France and ten in Germany; the 1940 units named in the notes of the project were read on Wikipedia.
 */
enum Site: string
{
    case Lille = 'lille';
    case Reims = 'reims';
    case Metz = 'metz';
    case Nancy = 'nancy';
    case Dijon = 'dijon';
    case Orleans = 'orleans';
    case Villacoublay = 'villacoublay';
    case SaintDizier = 'saintdizier';
    case Luxeuil = 'luxeuil';
    case Avord = 'avord';
    case Essen = 'essen';
    case Koeln = 'koeln';
    case Mainz = 'mainz';
    case Frankfurt = 'frankfurt';
    case Mannheim = 'mannheim';
    case BadenOos = 'badenoos';
    case Stuttgart = 'stuttgart';
    case Lechfeld = 'lechfeld';
    case Muenchen = 'muenchen';
    case Bonn = 'bonn';

    /** The side a player takes by choosing this site for their first camp. */
    public function clan(): Clan
    {
        return match ($this) {
            self::Lille, self::Reims, self::Metz, self::Nancy, self::Dijon, self::Orleans, self::Villacoublay, self::SaintDizier, self::Luxeuil, self::Avord => Clan::French,
            self::Essen, self::Koeln, self::Bonn, self::Mainz, self::Frankfurt, self::Mannheim, self::BadenOos, self::Stuttgart, self::Lechfeld, self::Muenchen => Clan::Axe,
        };
    }
}
