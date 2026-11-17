<?php

declare(strict_types=1);

namespace Ww2\Account;

/**
 * Remembers who is signed in, in a PHP session whose cookie the browser sends back.
 */
final class PlayerSession
{
    private const PLAYER_KEY = 'player_id';
    private const LIFETIME_SECONDS = 604800;

    public function playerId(): ?int
    {
        $this->start();

        return isset($_SESSION[self::PLAYER_KEY]) ? (int) $_SESSION[self::PLAYER_KEY] : null;
    }

    public function signIn(int $playerId): void
    {
        $this->start();
        session_regenerate_id(true);
        $_SESSION[self::PLAYER_KEY] = $playerId;
    }

    public function signOut(): void
    {
        $this->start();
        $_SESSION = [];
        session_destroy();
    }

    private function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        ini_set('session.gc_maxlifetime', (string) self::LIFETIME_SECONDS);
        session_set_cookie_params([
            'lifetime' => self::LIFETIME_SECONDS,
            'path' => '/',
            'secure' => !empty($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}
