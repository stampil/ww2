<?php

declare(strict_types=1);

namespace Ww2\Account;

/**
 * Why an account request is refused; the value is the code the front turns into a message.
 */
enum AccountError: string
{
    case InvalidNickname = 'invalidNickname';
    case InvalidPassword = 'invalidPassword';
    case NicknameTaken = 'nicknameTaken';
    case WrongCredentials = 'wrongCredentials';
}
