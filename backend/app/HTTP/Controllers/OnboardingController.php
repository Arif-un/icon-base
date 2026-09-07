<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Deps\BitApps\WPKit\Http\Request\Request;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;
use IconIndexa\Services\Onboarding;

class OnboardingController
{
    /**
     * Persist which onboarding surfaces the current user has seen or dismissed.
     *
     * Registered in backend/hooks/api.php behind nonce verification
     * (NonceCheckerMiddleware) and an edit_posts check (EditorCheckerMiddleware) rather
     * than the admin group: the block editor guide is shown to anyone who can edit posts,
     * and this only ever writes the calling user's own meta.
     */
    public function update(Request $request)
    {
        $flags = [];

        foreach (Onboarding::flags() as $flag) {
            $value = $request->get($flag);

            if ($value !== null) {
                $flags[$flag] = self::toBool($value);
            }
        }

        if (empty($flags)) {
            return Response::error(
                'At least one of ' . implode(', ', Onboarding::flags()) . ' is required'
            )->httpStatus(400);
        }

        return Response::success(Onboarding::markSeen($flags));
    }

    /**
     * A JSON body gives real booleans, but a form-encoded body gives "true"/"false"/"0"
     * strings, all of which are truthy under a plain cast.
     *
     * @param mixed $value
     */
    private static function toBool($value)
    {
        if (\is_string($value)) {
            return !\in_array(strtolower($value), ['', '0', 'false', 'null'], true);
        }

        return (bool) $value;
    }
}
