<?php

declare(strict_types=1);

namespace Ww2\Http;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Ww2\Database\Migrator;

/**
 * Brings the database up to date before a request is answered, so that a new version needs no command line on the host.
 */
final class MigrationMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly Migrator $migrator)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $this->migrator->migrate();

        return $handler->handle($request);
    }
}
