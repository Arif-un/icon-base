<?php

namespace IconIndexa\Views;

if (!defined('ABSPATH')) {
    exit;
}


use IconIndexa\Config;

class Body
{
    public function render()
    {
        // Dev-only fallback: React attaches a shadow root to this div on mount, which hides
        // any light-DOM children. If the Vite dev server is down, main.tsx never loads, the
        // shadow never attaches, and this notice stays visible instead of a blank page.
        $fallback = Config::isDevMode() ? self::devServerNotice() : '';

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static markup with escaped values built in devServerNotice().
        echo '<div id="wp-starter-kit-root">' . $fallback . '</div>';
    }

    private static function devServerNotice(): string
    {
        $devUrl = Config::getEnv('DEV_URL') ?: 'the Vite dev server';

        return '<div style="max-width:640px;margin:40px auto;padding:24px;border:1px solid #dc3232;'
            . 'border-radius:8px;font-family:system-ui,sans-serif;color:#1d2327;background:#fff;">'
            . '<h2 style="margin-top:0;color:#dc3232;">' . esc_html__('Dev server not running', 'icon-indexa') . '</h2>'
            . '<p>' . esc_html__('This page is blank because the app assets are served from Vite in dev mode and the dev server is unreachable.', 'icon-indexa') . '</p>'
            . '<p>' . esc_html__('Start it, then reload:', 'icon-indexa') . '</p>'
            . '<pre style="background:#f0f0f1;padding:12px;border-radius:4px;overflow:auto;">pnpm dev</pre>'
            . '<p style="color:#646970;font-size:13px;">' . esc_html(sprintf(
                /* translators: %s: Vite dev server URL. */
                __('Expected at %s. To run the built assets instead, unset ICON_INDEXA_DEV in your .env.', 'icon-indexa'),
                $devUrl
            )) . '</p>'
            . '</div>';
    }
}
