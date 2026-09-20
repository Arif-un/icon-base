<?php

namespace IconIndexa\Services;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;

/**
 * Per-user onboarding state for the welcome wizard, the admin tour and the block editor guide.
 *
 * State lives in user meta (ICON_INDEXA_onboarding) rather than an option so that each
 * administrator is onboarded once, instead of only whoever happens to log in first.
 *
 * Shared by Views\Head (which localizes the initial state into the page) and
 * HTTP\Controllers\OnboardingController (which persists dismissals), so the shape is
 * defined in exactly one place.
 */
class Onboarding
{
    public const META_KEY = 'onboarding';

    /**
     * Flags the frontend is allowed to set. Anything else in a request payload is ignored.
     */
    private const FLAGS = ['wizard', 'adminTour', 'editorGuide'];

    /**
     * The writable flag names, so callers do not restate the list.
     */
    public static function flags()
    {
        return self::FLAGS;
    }

    /**
     * Everything unseen, stamped with the current onboarding revision.
     */
    public static function defaultState()
    {
        return [
            'version'     => Config::ONBOARDING_VERSION,
            'wizard'      => false,
            'adminTour'   => false,
            'editorGuide' => false,
        ];
    }

    /**
     * Stored state for the current user, normalised and version-gated.
     *
     * A stored revision older than Config::ONBOARDING_VERSION is treated as never seen, which
     * is what lets a release re-introduce the wizard.
     */
    public static function stateForCurrentUser()
    {
        $stored = Config::getUserMeta(self::META_KEY, 0, []);

        if (!\is_array($stored)) {
            return self::defaultState();
        }

        $version = isset($stored['version']) ? absint($stored['version']) : 0;

        if ($version < Config::ONBOARDING_VERSION) {
            return self::defaultState();
        }

        $state            = self::defaultState();
        $state['version'] = $version;

        foreach (self::FLAGS as $flag) {
            $state[$flag] = !empty($stored[$flag]);
        }

        return $state;
    }

    /**
     * Merge the given flags into the current user's state and persist it.
     *
     * Only keys in self::FLAGS are honoured and every value is cast to bool, so a caller
     * cannot write arbitrary data into user meta.
     *
     * @param array $flags
     */
    public static function markSeen($flags)
    {
        $state = self::stateForCurrentUser();

        foreach (self::FLAGS as $flag) {
            if (\is_array($flags) && \array_key_exists($flag, $flags)) {
                $state[$flag] = (bool) $flags[$flag];
            }
        }

        $state['version'] = Config::ONBOARDING_VERSION;

        Config::updateUserMeta(self::META_KEY, $state);

        return $state;
    }
}
