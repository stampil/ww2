<?php

declare(strict_types=1);

namespace Ww2\Http;

use JsonException;
use League\Route\Http\Exception\BadRequestException;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Reads the text fields of a JSON request.
 */
final class JsonRequestBody
{
    /**
     * @return array<string, string> the fields asked for, all present as text
     * @throws BadRequestException when the body is not a JSON object with these fields as text
     */
    public static function texts(ServerRequestInterface $request, string ...$fields): array
    {
        try {
            $body = json_decode((string) $request->getBody(), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new BadRequestException('invalidBody');
        }

        $texts = [];
        foreach ($fields as $field) {
            if (!is_array($body) || !isset($body[$field]) || !is_string($body[$field])) {
                throw new BadRequestException('invalidBody');
            }
            $texts[$field] = $body[$field];
        }

        return $texts;
    }
}
