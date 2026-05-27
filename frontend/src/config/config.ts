type GetServerVariableType = <K extends keyof typeof SERVER_VARIABLES>(
  key: K,
  fallback?: (typeof SERVER_VARIABLES)[K],
) => (typeof SERVER_VARIABLES)[K];

const getServerVariable: GetServerVariableType = (key, fallback) => {
  if (!(key in SERVER_VARIABLES) || !SERVER_VARIABLES[key]) {
    if (import.meta.env.MODE !== "test") {
      console.error("🚥 Missing server variable:", key);
    }

    if (fallback) return fallback;
  }

  return SERVER_VARIABLES[key];
};

interface ConfigType {
  AJAX_URL: string;
  API_URL: { base: string; separator: string };
  DATE_FORMAT: string;
  FREE_VERSION: string;
  IS_DEV: boolean;
  KEY?: string;
  NONCE: string;
  PLUGIN_ADMIN_URL: string;
  PLUGIN_SLUG: string;
  PRODUCT_NAME: string;
  REDIRECT_URI: string;
  REST_NONCE: string;
  ROOT_URL: string;
  ROUTE_PREFIX: string;
  SITE_BASE_URL: string;
  SITE_URL: string;
  TIME_FORMAT: string;
}

const config = {
  AJAX_URL: getServerVariable("ajaxURL", "http://wp-starter-kit.site/wp-admin/admin-ajax.php"),
  API_URL: getServerVariable("apiURL", {
    base: "http://wp-starter-kit.test/wp-json/WP Starter Kit/v1",
    separator: "?",
  }),
  DATE_FORMAT: getServerVariable("dateFormat", "F j, Y"),
  FREE_VERSION: getServerVariable("version"),
  IS_DEV: import.meta.env.DEV,
  KEY: getServerVariable("key"),
  NONCE: getServerVariable("nonce", ""),
  PLUGIN_ADMIN_URL: getServerVariable("pluginAdminURL"),
  PLUGIN_SLUG: getServerVariable("pluginSlug", "wp-starter-kit"),
  PRODUCT_NAME: "wp-starter-kit",
  REDIRECT_URI: getServerVariable("redirectUri"),
  REST_NONCE: getServerVariable("restNonce", ""),
  ROOT_URL: getServerVariable("rootURL", "http://.local"),
  ROUTE_PREFIX: getServerVariable("routePrefix", "WP_STARTER_KIT_"),
  SITE_BASE_URL: getServerVariable("siteBaseURL"),
  SITE_URL: getServerVariable("siteURL"),
  TIME_FORMAT: getServerVariable("timeFormat", "g:i a"),
} as const satisfies ConfigType;

export default config;
