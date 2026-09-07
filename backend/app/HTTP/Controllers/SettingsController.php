<?php

namespace IconIndexa\HTTP\Controllers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Http\Request\Request;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;

class SettingsController
{
    public function index()
    {
        return Response::success(self::current());
    }

    public function update(Request $request)
    {
        $settings = self::current();

        if ($request->has('showSidebarMenu')) {
            $settings['showSidebarMenu'] = filter_var($request->get('showSidebarMenu'), FILTER_VALIDATE_BOOLEAN);
        }

        Config::updateOption('settings', $settings);

        return Response::success($settings);
    }

    /**
     * Current settings with defaults applied. Missing option / missing key => sidebar menu shown.
     *
     * @return array<string, mixed>
     */
    public static function current(): array
    {
        $settings = Config::getOption('settings');

        if (!is_array($settings)) {
            $settings = [];
        }

        if (!array_key_exists('showSidebarMenu', $settings)) {
            $settings['showSidebarMenu'] = true;
        }

        $settings['showSidebarMenu'] = (bool) $settings['showSidebarMenu'];

        return $settings;
    }
}
