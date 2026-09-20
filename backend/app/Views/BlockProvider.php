<?php

namespace IconIndexa\Views;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Hooks\Hooks;
use IconIndexa\Services\SvgSanitizer;

final class BlockProvider
{
    public const BLOCK_NAME = 'icon-shelf/icon';

    public function __construct()
    {
        Hooks::addAction('init', [$this, 'registerBlocks']);
        Hooks::addAction('enqueue_block_editor_assets', [$this, 'enqueueBlockEditorData']);
        // Defense in depth: the icon block is static, so the frontend echoes stored post_content
        // verbatim and never re-runs the JS sanitizers. Content authored via the Code Editor /
        // REST (only reachable by unfiltered_html users) could carry a stored-XSS SVG payload.
        // Sanitize this block's rendered output server-side with an SVG-safe wp_kses allowlist
        // (no script/on*/foreignObject/javascript:), keeping the block static so existing posts
        // still pass block validation. The block-specific dynamic filter fires only for this block,
        // so WordPress does the block-name scoping and no manual guard is needed.
        Hooks::addFilter('render_block_' . self::BLOCK_NAME, [$this, 'sanitizeIconBlockOutput']);
    }

    public function sanitizeIconBlockOutput($blockContent)
    {
        return SvgSanitizer::sanitize($blockContent);
    }

    public function registerBlocks()
    {
        $blockDir = Config::get('ROOT_DIR') . Config::ASSETS_FOLDER . '/blocks/icon';

        if (!file_exists($blockDir . '/block.json')) {
            return;
        }

        register_block_type($blockDir);
    }

    public function enqueueBlockEditorData()
    {
        $scriptHandle = 'icon-shelf-icon-editor-script';

        if (!wp_script_is($scriptHandle, 'registered')) {
            return;
        }

        wp_enqueue_media();

        $configData = Head::createConfigVariable();

        wp_add_inline_script(
            $scriptHandle,
            'window.' . Config::VAR_PREFIX . ' = ' . wp_json_encode($configData) . ';',
            'before'
        );
    }
}
