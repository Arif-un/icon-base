<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Response;

// Every data-layer read funnels through SQLiteDB::instance(), whose constructor does failure-prone
// I/O (mkdir, PDO open, full db rebuild from JSON) and can throw. Without this, one transient
// failure (missing pdo_sqlite, unwritable uploads, corrupt db, bad ib.json row) becomes a hard
// PHP fatal 500 instead of a handled error response. Wrap the read once, here, for all controllers.
class DbResponse
{
    /**
     * Run a data-layer read and return a success Response, converting any throwable into a
     * 500 error Response so the exception never escapes to a fatal.
     *
     * @param callable():mixed $read
     */
    public static function guard(callable $read): Response
    {
        try {
            return Response::success($read());
        } catch (\Throwable $e) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
            error_log('Icon Indexa: data request failed: ' . $e->getMessage());

            return Response::error(
                ['message' => 'The icon database is unavailable. See the server error log for details.'],
                500
            );
        }
    }
}
