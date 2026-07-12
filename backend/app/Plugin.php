<?php

namespace IconBase;

// Prevent direct script access
if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Deps\BitApps\WPKit\Hooks\Hooks;
use IconBase\Deps\BitApps\WPKit\Http\RequestType;
use IconBase\Deps\BitApps\WPKit\Migration\MigrationHelper;
use IconBase\Deps\BitApps\WPKit\Utils\Capabilities;
use IconBase\HTTP\Middleware\AdminCheckerMiddleware;
use IconBase\HTTP\Middleware\NonceCheckerMiddleware;
use IconBase\Providers\HookProvider;
use IconBase\Providers\InstallerProvider;
use IconBase\Views\BlockProvider;
use IconBase\Views\HtmlTagModifier;
use IconBase\Views\Layout;
use IconBase\Views\PluginPageActions;

final class Plugin
{
    private static $_instance;

    private $_registeredMiddleware = [];

    public function __construct()
    {
        $this->registerInstaller();

        Hooks::addAction('plugins_loaded', [$this, 'loaded']);
    }

    public function registerInstaller()
    {
        $installerProvider = new InstallerProvider();
        $installerProvider->register();
    }

    public function loaded()
    {
        Hooks::doAction(Config::withPrefix('loaded'));

        Hooks::addAction('init', [$this, 'registerProviders'], 8);

        Hooks::addFilter('plugin_action_links_' . Config::get('BASENAME'), [new PluginPageActions(), 'renderActionLinks']);

        $this->maybeMigrateDB();
    }

    public function middlewares()
    {
        return [
            'nonce'   => NonceCheckerMiddleware::class,
            'isAdmin' => AdminCheckerMiddleware::class,
        ];
    }

    public function getMiddleware($name)
    {
        if (isset($this->_registeredMiddleware[$name])) {
            return $this->_registeredMiddleware[$name];
        }

        $middlewares = $this->middlewares();

        if (isset($middlewares[$name]) && class_exists($middlewares[$name]) && method_exists($middlewares[$name], 'handle')) {
            $this->_registeredMiddleware[$name] = new $middlewares[$name]();
        } else {
            return false;
        }

        return $this->_registeredMiddleware[$name];
    }

    public function registerProviders()
    {
        if (RequestType::is('admin')) {
            new Layout();
            new HtmlTagModifier();
        }

        new BlockProvider();
        new HookProvider();
    }

    public static function maybeMigrateDB()
    {
        if (!Capabilities::check('manage_options')) {
            return;
        }

        if (version_compare(Config::getOption('db_version'), Config::DB_VERSION, '<')) {
            MigrationHelper::migrate(InstallerProvider::migration());
        }
    }

    public static function instance()
    {
        return self::$_instance;
    }

    public static function load()
    {
        if (self::$_instance !== null) {
            return false;
        }

        self::$_instance = new self();

        return true;
    }
}
