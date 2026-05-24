<?php

namespace IconBase\Views;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Config;

class PluginPageActions
{
    public function getActionLinks()
    {
        return [
            [
                'url'   => admin_url('admin.php?page=' . Config::SLUG),
                'title' => __('Settings', 'wp-starter-kit'),
            ],
            [
                'url'   => 'https://johndoe.com/support',
                'title' => __('Support', 'wp-starter-kit'),
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
