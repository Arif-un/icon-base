# Icon Base — WordPress Plugin

A WordPress plugin with a React frontend, PHP backend, and built-in REST/AJAX routing.

**Repository:** [https://github.com/Arif-un/icon-base](https://github.com/Arif-un/icon-base)

---

## Requirements

- PHP 7.4+
- Node.js >= 20
- pnpm >= 9
- Composer

---

## Setup

### Option A — Docker (wp-env) `recommended`

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac/Windows) or Docker Engine (Linux).

```bash
composer install
pnpm install
pnpm env:start    # spins up WordPress + activates plugin
pnpm dev:free     # start Vite dev server with HMR
```

| Service | URL |
|---------|-----|
| WordPress | http://localhost:8888 |
| WP Admin | http://localhost:8888/wp-admin — `admin / password` |
| phpMyAdmin | http://localhost:8889 |

**wp-env commands:**

```bash
pnpm env:stop                  # stop containers
pnpm env:shell                 # bash inside container
pnpm env:wp -- plugin list     # run any WP-CLI command
pnpm env:logs                  # tail logs
pnpm env:clean                 # reset database
pnpm env:destroy               # remove containers + volumes
```

---

### Option B — Existing WordPress install

Place this repo inside `wp-content/plugins/icon-base/`, then:

```bash
composer install
pnpm install
pnpm dev:free
```

Go to **WordPress Admin → Plugins** and activate **Icon Base**.

---

## Development

```bash
pnpm dev:free     # Vite dev server with HMR (free build)
pnpm dev:pro      # Vite dev server with HMR (pro build)
```

Configure `.env`:

```bash
cp .env.example .env
```

Minimum required:

```env
PLUGIN_SLUG = icon-base
DEV          = true
DEV_URL      = http://localhost:3000/wp-content/plugins/icon-base/frontend
```

Build for production:

```bash
pnpm build        # builds both free + pro
pnpm build:free   # free only
pnpm build:pro    # pro only
```

---

## CLI Commands

```bash
php wp-kit make:controller ExampleController  # backend/app/HTTP/Controllers/<Name>.php
php wp-kit make:model Tag                     # backend/app/Models/<Name>.php
php wp-kit make:migration AppConnections      # backend/db/Migrations/<Name>TableMigration.php

php wp-kit --help                             # list all commands
```

Generators are **strict positional** — name required, must be PascalCase, will not overwrite existing files. `make:migration` auto-registers the class in `InstallerProvider::migration()` and `drop()`.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── Config.php              # plugin constants & config helpers
│   │   ├── Plugin.php              # plugin bootstrap
│   │   ├── Dotenv.php              # .env loader
│   │   ├── HTTP/
│   │   │   ├── Controllers/        # make:controller output
│   │   │   └── Middleware/         # nonce & admin checkers
│   │   ├── Models/                 # make:model output
│   │   ├── Providers/              # HookProvider, InstallerProvider
│   │   ├── Views/                  # Layout, Head, Body, HtmlTagModifier
│   │   └── src/Menu.php            # sidebar menu definition
│   ├── db/Migrations/              # make:migration output
│   ├── hooks/
│   │   ├── api.php                 # REST API routes
│   │   └── ajax.php                # AJAX routes
│   └── bootstrap.php               # autoload + plugin boot
├── frontend/
│   └── src/
│       ├── main.tsx                # React entry point
│       ├── config/config.ts        # server variable bindings
│       ├── common/helpers/         # i18n, request, tryCatch
│       └── resource/               # CSS, images
├── wp-kit                          # PHP CLI tool
├── icon-base.php                   # WordPress plugin header
└── composer.json
```

---

## REST Routes

Defined in `backend/hooks/api.php`:

```php
use IconBase\Deps\BitApps\WPKit\Http\Router\Router;

$router->get('/hello', function () {
    return ['message' => 'Hello from Icon Base'];
});

$router->post('/data', [Controllers\DataController::class, 'store'])
       ->middleware('nonce', 'isAdmin');
```

---

## AJAX Routes

Defined in `backend/hooks/ajax.php`:

```php
$router->post('get_settings', [Controllers\SettingsController::class, 'index']);
```

---

## Database Migrations

```bash
php wp-kit make:migration AppConnections
```

Produces `backend/db/Migrations/IconBaseAppConnectionsTableMigration.php` with up/down skeleton. Auto-registered in `InstallerProvider` — runs on activation, rolls back on uninstall.

---

## Code Quality

```bash
pnpm lint           # ESLint fix
pnpm lint:css       # Stylelint fix
composer lint       # PHP-CS-Fixer + PHPCS
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright E2E tests
```

---

## Tech Stack

| Layer    | Tools |
|----------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Ant Design, Jotai, TanStack Query |
| Backend  | PHP 7.4+, WPKit, Imposter (namespace isolation) |
| Testing  | Vitest, Playwright |
| Quality  | ESLint, Stylelint, PHPCS, PHP-CS-Fixer |

---

## Contributing & Community

Icon Base is open source and built for the community — contributions of all kinds are welcome.

**Repository:** [https://github.com/Arif-un/icon-base](https://github.com/Arif-un/icon-base)

Ways to get involved:

- 🐛 **Report a bug** or request a feature via [GitHub Issues](https://github.com/Arif-un/icon-base/issues)
- 🔧 **Send a pull request** — fork the repo, create a branch, and open a [PR](https://github.com/Arif-un/icon-base/pulls). Run `pnpm lint`, `composer lint`, and `pnpm test` before submitting.
- 🎨 **Add icon libraries** — help expand the bundled icon sets.
- 💬 **Ask questions & share ideas** in [GitHub Discussions](https://github.com/Arif-un/icon-base/discussions).
- ⭐ **Star the repo** to help others discover the project.

If this plugin is useful to you, a star and a shared review go a long way.

---

## License

GPL-2.0-or-later
