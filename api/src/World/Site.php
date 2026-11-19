<?php

declare(strict_types=1);

namespace Ww2\World;

/**
 * The camps of the world, the same in every instance, in the order they are laid out; the value is the name of the site for the front.
 * Each is an airfield of 1940, twenty-four on the side of the Allies (France and Belgium) and sixteen on the Axe's (Germany and Italy); what Wikipedia says of each is in the notes of the project.
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
    case Salon = 'salon';
    case MontDeMarsan = 'montdemarsan';
    case Caen = 'caen';
    case Bordeaux = 'bordeaux';
    case Toulouse = 'toulouse';
    case Cambrai = 'cambrai';
    case Tours = 'tours';
    case Melun = 'melun';
    case LeBourget = 'lebourget';
    case Orange = 'orange';
    case Cazaux = 'cazaux';
    case Chartres = 'chartres';
    case Lanveoc = 'lanveoc';
    case Evere = 'evere';
    case Fuerstenfeldbruck = 'fuerstenfeldbruck';
    case Memmingen = 'memmingen';
    case Illesheim = 'illesheim';
    case Pferdsfeld = 'pferdsfeld';
    case Pisa = 'pisa';
    case Turin = 'turin';

    /** The side a player takes by choosing this site for their first camp. */
    public function clan(): Clan
    {
        return match ($this) {
            self::Lille, self::Reims, self::Metz, self::Nancy, self::Dijon,
            self::Orleans, self::Villacoublay, self::SaintDizier, self::Luxeuil, self::Avord,
            self::Salon, self::MontDeMarsan, self::Caen, self::Bordeaux, self::Toulouse,
            self::Cambrai, self::Tours, self::Melun, self::LeBourget, self::Orange,
            self::Cazaux, self::Chartres, self::Lanveoc, self::Evere => Clan::French,
            self::Essen, self::Koeln, self::Bonn, self::Mainz, self::Frankfurt,
            self::Mannheim, self::BadenOos, self::Stuttgart, self::Lechfeld, self::Muenchen,
            self::Fuerstenfeldbruck, self::Memmingen, self::Illesheim, self::Pferdsfeld, self::Pisa,
            self::Turin => Clan::Axe,
        };
    }
}
