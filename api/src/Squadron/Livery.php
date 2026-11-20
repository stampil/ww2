<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * The paint an aircraft wears, each livery being the paint of one type of aircraft; the value is the name of the livery for the front.
 * The French, German and Vichy liveries are those of the D.520, the Luftwaffe one is that of the Bf 109.
 */
enum Livery: string
{
    case French = 'french';
    case German = 'german';
    case Vichy = 'vichy';
    case Luftwaffe = 'luftwaffe';
}
