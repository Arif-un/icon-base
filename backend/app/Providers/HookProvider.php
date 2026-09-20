<?php

namespace IconIndexa\Providers;

if (!defined('ABSPATH')) {
    exit;
}

use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Hooks\Hooks;
use IconIndexa\Deps\BitApps\WPKit\Http\RequestType;
use IconIndexa\Deps\BitApps\WPKit\Http\Router\Router;
use IconIndexa\Plugin;

class HookProvider
{
    private $_pluginBackend;

    public function __construct()
    {
        $this->_pluginBackend = Config::get('BASEDIR') . DIRECTORY_SEPARATOR;
        $this->loadAppAjaxHooks();
        Hooks::addAction('rest_api_init', [$this, 'loadAppApiHooks']);
        Hooks::addFilter('rest_endpoints', [$this, 'enforceRestPermission']);
    }

    /**
     * WP-level authorization backstop. The vendored APIRouter registers every route with
     * permission_callback => '__return_true', so today the only gate is the in-handler
     * nonce/isAdmin middleware. Force a real manage_options capability check on all of this
     * plugin's REST routes so WordPress rejects unauthenticated requests independently of the
     * middleware chain: a future route added without ->middleware(...) can no longer become a
     * silently-open endpoint. Nonce/CSRF enforcement stays with NonceCheckerMiddleware.
     *
     * @param array<string, array<int, array<string, mixed>>> $endpoints
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function enforceRestPermission(array $endpoints): array
    {
        $prefix = '/' . trim(Config::REST_NAMESPACE, '/') . '/';

        foreach ($endpoints as $route => $handlers) {
            if (strpos($route, $prefix) !== 0) {
                continue;
            }

            foreach ($handlers as $index => $handler) {
                if (is_array($handler) && array_key_exists('permission_callback', $handler)) {
                    $endpoints[$route][$index]['permission_callback'] = static fn (): bool => current_user_can('manage_options');
                }
            }
        }

        return $endpoints;
    }

    public function loadAppApiHooks()
    {
        if (
            is_readable($this->_pluginBackend . 'hooks' . DIRECTORY_SEPARATOR . 'api.php')
            && RequestType::is(RequestType::API)
        ) {
            $router = new Router(RequestType::API, Config::REST_NAMESPACE, 'v1');
            $router->setMiddlewares(Plugin::instance()->middlewares());
            include $this->_pluginBackend . 'hooks' . DIRECTORY_SEPARATOR . 'api.php';
            $router->register();
        }
    }

    protected function loadAppAjaxHooks()
    {
        if (
            RequestType::is(RequestType::AJAX)
            && is_readable($this->_pluginBackend . 'hooks' . DIRECTORY_SEPARATOR . 'ajax.php')
        ) {
            $router = new Router(RequestType::AJAX, Config::VAR_PREFIX, '');
            $router->setMiddlewares(Plugin::instance()->middlewares());
            include $this->_pluginBackend . 'hooks' . DIRECTORY_SEPARATOR . 'ajax.php';
            $router->register();
        }
    }
}
