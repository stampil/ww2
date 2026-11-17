<?php

declare(strict_types=1);

namespace Ww2\Http;

use JsonException;
use League\Route\Http\Exception\BadRequestException;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Reads the fields of a JSON request, each of the type that was asked for.
 */
final class JsonRequestBody
{
    /**
     * @return array<string, string> the fields asked for, all present as text
     * @throws BadRequestException when the body is not a JSON object with these fields as text
     */
    public static function texts(ServerRequestInterface $request, string ...$fields): array
    {
        return self::typed($request, $fields, is_string(...));
    }

    /**
     * @return array<string, int> the fields asked for, all present as whole numbers
     * @throws BadRequestException when the body is not a JSON object with these fields as whole numbers
     */
    public static function integers(ServerRequestInterface $request, string ...$fields): array
    {
        return self::typed($request, $fields, is_int(...));
    }

    /**
     * @return array<string, bool> the fields asked for, all present as true or false
     * @throws BadRequestException when the body is not a JSON object with these fields as true or false
     */
    public static function booleans(ServerRequestInterface $request, string ...$fields): array
    {
        return self::typed($request, $fields, is_bool(...));
    }

    /**
     * @param list<string> $fields
     * @param callable(mixed): bool $hasType
     * @return array<string, mixed>
     */
    private static function typed(ServerRequestInterface $request, array $fields, callable $hasType): array
    {
        try {
            $body = json_decode((string) $request->getBody(), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new BadRequestException('invalidBody');
        }

        $values = [];
        foreach ($fields as $field) {
            if (!is_array($body) || !array_key_exists($field, $body) || !$hasType($body[$field])) {
                throw new BadRequestException('invalidBody');
            }
            $values[$field] = $body[$field];
        }

        return $values;
    }
}
