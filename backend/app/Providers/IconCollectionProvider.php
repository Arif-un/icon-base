<?php

namespace IconIndexa\Providers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Hooks\Hooks;
use IconIndexa\Models\Icons;
use IconIndexa\Models\Library;

/**
 * Bridges the bundled icon libraries into the WordPress 7.1 public Icons API so
 * they appear in the core Icon block picker. No-op on WordPress < 7.1.
 */
final class IconCollectionProvider
{
    public function __construct()
    {
        // Priority 20 so it runs after core registers its own default icons on init.
        Hooks::addAction('init', [$this, 'register'], 20);
    }

    public function register(): void
    {
        if (!\function_exists('wp_register_icon_collection') || !\function_exists('wp_register_icon')) {
            return;
        }

        $libraries = [];

        foreach (Library::getAll() as $lib) {
            $slug = sanitize_key($lib['slug']);
            $libraries[(int) $lib['id']] = [
                'slug' => $slug,
                'dir'  => str_pad((string) $lib['id'], 3, '0', STR_PAD_LEFT) . '-' . $lib['slug'],
            ];

            wp_register_icon_collection(
                $slug,
                [
                    'label'       => $lib['name'],
                    'description' => sprintf(
                        /* translators: %s: icon library name. */
                        __('Icons from the %s library, provided by Icon Indexa.', 'icon-indexa'),
                        $lib['name']
                    ),
                ]
            );
        }

        $iconsDir = Config::get('ROOT_DIR') . 'icons' . DIRECTORY_SEPARATOR;

        // ponytail: O(n) wp_register_icon() calls on every init (~4.6k icons). SVG files are
        // read lazily by core via file_path, so the cost here is only array building + one
        // SQLite scan. If this ever profiles hot, gate to editor/REST contexts or memoize the
        // built list in a transient keyed by Config::DATA_VERSION.
        foreach (Icons::allForRegistry() as $icon) {
            $lib = $libraries[(int) $icon['library_id']] ?? null;

            if ($lib === null) {
                continue;
            }

            $iconSlug = sanitize_title(pathinfo($icon['filename'], PATHINFO_FILENAME));

            wp_register_icon(
                $lib['slug'] . '/' . $iconSlug,
                [
                    'label'     => $icon['name'],
                    'file_path' => $iconsDir . $lib['dir'] . DIRECTORY_SEPARATOR . $icon['filename'],
                ]
            );
        }
    }
}
