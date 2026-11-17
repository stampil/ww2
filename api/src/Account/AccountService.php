<?php

declare(strict_types=1);

namespace Ww2\Account;

/**
 * The rules of the accounts: who may take which nickname, which password is accepted, who is who.
 */
final class AccountService
{
    private const MIN_NICKNAME_LENGTH = 3;
    private const MAX_NICKNAME_LENGTH = 32;
    private const MIN_PASSWORD_LENGTH = 8;
    private const BCRYPT_MAX_PASSWORD_BYTES = 72;

    public function __construct(private readonly PlayerStore $players, private readonly SignInAttempts $signInAttempts)
    {
    }

    /**
     * @throws AccountException when the nickname or the password is refused, or the nickname is taken
     */
    public function register(string $nickname, string $password): Player
    {
        if (!$this->isValidNickname($nickname)) {
            throw new AccountException(AccountError::InvalidNickname);
        }
        if (!$this->isValidPassword($password)) {
            throw new AccountException(AccountError::InvalidPassword);
        }
        if ($this->players->findCredentials($nickname) !== null) {
            throw new AccountException(AccountError::NicknameTaken);
        }
        $this->players->add($nickname, password_hash($password, PASSWORD_DEFAULT));

        return $this->players->findCredentials($nickname)->player;
    }

    /**
     * @throws AccountException when the nickname is unknown or the password is wrong, or the nickname is shut after too many wrong passwords
     */
    public function authenticate(string $nickname, string $password): Player
    {
        if (!$this->isValidNickname($nickname)) {
            throw new AccountException(AccountError::WrongCredentials);
        }
        if ($this->signInAttempts->isShut($nickname)) {
            throw new AccountException(AccountError::TooManyAttempts);
        }
        $credentials = $this->players->findCredentials($nickname);
        if ($credentials === null || !password_verify($password, $credentials->passwordHash)) {
            $this->signInAttempts->recordFailure($nickname);
            throw new AccountException(AccountError::WrongCredentials);
        }
        $this->signInAttempts->forget($nickname);

        return $credentials->player;
    }

    private function isValidNickname(string $nickname): bool
    {
        $pattern = sprintf('/^[\p{L}\p{N}_-]{%d,%d}$/u', self::MIN_NICKNAME_LENGTH, self::MAX_NICKNAME_LENGTH);

        return preg_match($pattern, $nickname) === 1;
    }

    private function isValidPassword(string $password): bool
    {
        return mb_strlen($password) >= self::MIN_PASSWORD_LENGTH && strlen($password) <= self::BCRYPT_MAX_PASSWORD_BYTES;
    }
}
