<?php

declare(strict_types=1);

namespace Ww2\Account;

/**
 * Remembers who is signed in, and which of their bases they are looking at, in a PHP session whose cookie the browser sends back.
 */
final class PlayerSession
{
    private const PLAYER_KEY = 'player_id';
    private const BASE_KEY = 'base_id';
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
        unset($_SESSION[self::BASE_KEY]);
    }

    /**
     * @return int|null the base the player chose to look at, who may no longer hold it
     */
    public function selectedBaseId(): ?int
    {
        $this->start();

        return isset($_SESSION[self::BASE_KEY]) ? (int) $_SESSION[self::BASE_KEY] : null;
    }

    public function selectBase(int $baseId): void
    {
        $this->start();
        $_SESSION[self::BASE_KEY] = $baseId;
    }

    public function forgetSelectedBase(): void
    {
        $this->start();
        unset($_SESSION[self::BASE_KEY]);
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
