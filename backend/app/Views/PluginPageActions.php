<?php

namespace IconIndexa\Views;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;

class PluginPageActions
{
    public function getActionLinks()
    {
        return [
            [
                'url'   => admin_url('admin.php?page=' . Config::SLUG),
                'title' => __('Settings', 'icon-indexa'),
            ],
            [
                'url'   => 'https://github.com/Arif-un/icon-base/issues',
                'title' => __('Support', 'icon-indexa'),
            ],
        ];
    }

    public function renderActionLinks($links)
    {
        $actionLinks = [];
        foreach ($this->getActionLinks() as $link) {
            $actionLinks[] = '<a href="' . esc_url($link['url']) . '">' . esc_html($link['title']) . '</a>';
        }

        return array_merge($actionLinks, $links);
    }
}
