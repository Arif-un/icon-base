<?php

namespace IconIndexa\HTTP\Middleware;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Response;
use IconIndexa\Deps\BitApps\WPKit\Utils\Capabilities;

/**
 * Guards routes that any block author may call, not only administrators.
 *
 * The Icon block is enqueued for everyone who can edit posts, so a route the block depends
 * on cannot sit behind manage_options: an Author or Editor dismissing the welcome guide
 * would get an error, and because the once-per-session latch is module scoped the guide
 * would reopen for them every editor session.
 *
 * edit_posts is the floor for a write that only ever touches the caller's own user meta —
 * the nonce checked before this is already user-bound, so nothing here lets one user write
 * to another's state.
 */
class EditorCheckerMiddleware
{
    public function handle()
    {
        if (!Capabilities::check('edit_posts')) {
            return Response::error('You do not have permission to perform this action.');
        }

        return true;
    }
}
