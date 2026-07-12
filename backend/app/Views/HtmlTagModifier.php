<?php

namespace IconBase\Views;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Config;
use IconBase\Deps\BitApps\WPKit\Hooks\Hooks;

final class HtmlTagModifier
{
    public function __construct()
    {
        Hooks::addFilter('style_loader_tag', [$this, 'updateLinkAttributes'], 0, 2);
        Hooks::addFilter('script_loader_tag', [$this, 'updateScriptAttributes'], 0, 1);
        Hooks::addFilter('script_loader_src', [$this, 'removeQueryParam'], 99999, 3);
    }

    public function updateScriptAttributes($html)
    {
        $slug          = Config::SLUG;
        $typeAttribute = 'type="module"';
        $keys          = ['-vite-client-helper-MODULE-js', '-vite-client-MODULE-js', '-index-MODULE-js'];

        if (Config::getEnv('DEV')) {
            foreach ($keys as $key) {
                $handle = 'id="' . $slug . $key . '"';
                if (strpos($html, $handle) !== false) {
                    $html = str_replace($handle, $handle . ' ' . $typeAttribute, $html);
                }
            }
        } else {
            $handle = 'id="' . $slug . '-index-MODULE-js"';
            if (strpos($html, $handle) !== false) {
                $html = str_replace($handle, $handle . ' ' . $typeAttribute, $html);
            }
        }

        return $html;
    }

    public function updateLinkAttributes($html, $handle)
    {
        $slug = Config::SLUG;

        if (strpos($handle, $slug) === false) {
            return $html;
        }

        if (strpos($handle, 'PRECONNECT') !== false) {
            $html = str_replace("rel='stylesheet'", 'rel="preconnect"', $html);
        }

        if (strpos($handle, 'PRELOAD') !== false) {
            $html = str_replace("rel='stylesheet'", 'rel="preload"', $html);
        }

        if (strpos($handle, 'CROSSORIGIN') !== false) {
            $id   = "id='{$handle}-css'";
            $html = str_replace($id, $id . ' crossorigin', $html);
        }

        return $html;
    }

    public function removeQueryParam($src, $handle)
    {
        if (Config::SLUG . '-index-MODULE' === $handle) {
            $src = strtok($src, '?');
        }

        return $src;
    }
}
