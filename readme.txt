=== Icon Base: SVG Icon Library, Search & Gutenberg Icon Block ===
Contributors: arif25897
Tags: icons, svg, icon library, gutenberg block, icon picker
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A fast SVG icon library for WordPress with full-text search, a Gutenberg icon block, and thousands of ready-to-use icons.

== Description ==

Icon Base bundles thousands of crisp, scalable SVG icons directly inside WordPress, so you never have to hunt for, upload, or self-host icon files again.

Browse multiple popular icon sets, search across every icon by name or tag in milliseconds, and drop any icon straight into the block editor.

= Why Icon Base =

* **Bundled icons, no external requests** — every SVG ships with the plugin and is served from your own site. Nothing is fetched from a third-party CDN.
* **Instant search** — a built-in SQLite full-text (FTS5) index searches every icon by name and tags, even across thousands of entries.
* **Gutenberg icon block** — insert and configure icons visually in the block editor.
* **Inline SVG output** — icons render as inline SVG, so they scale cleanly, inherit color, and stay sharp on any screen.
* **Lightweight admin app** — a modern React-based browser to find, preview, and pick icons.

= Bundled Icon Libraries =

* **Ant Design Icons** (830 icons) — filled, outlined, and two-tone styles.
* **Boxicons** (3,768 icons) — regular, solid, and logo variants.

= Features =

* **Full-text icon search** powered by SQLite FTS5 for fast name and tag matching.
* **Library and type filters** to narrow results by icon set and style.
* **Paginated icon browser** built for large icon sets.
* **Gutenberg block** to insert icons inside posts and pages.
* **Custom icons** — add, update, and remove your own icon entries via the admin app.
* **Self-hosted SVGs** — no calls to external services for icon delivery.
* **Translation ready** — full text domain support.

= Data & Privacy =

Icon Base serves all icons from files bundled inside the plugin. Icon metadata is stored in a local SQLite database that ships with the plugin. No icon data is sent to or fetched from any external service.

== Installation ==

= Automated Installation =

1. In your WordPress dashboard go to **Plugins → Add New**.
2. Search for **Icon Base**.
3. Click **Install Now**, then **Activate**.

= Manual Installation =

1. Upload the `icon-base` folder to the `/wp-content/plugins/` directory.
2. Go to **Plugins** in your WordPress dashboard and activate **Icon Base**.
3. Open the **Icon Base** menu item to start browsing icons.

= Requirements =

* WordPress 5.0 or higher
* PHP 7.4 or higher
* The PHP SQLite (PDO) extension enabled

== Frequently Asked Questions ==

= What is Icon Base? =

Icon Base is a WordPress plugin that bundles thousands of SVG icons with a fast search interface and a Gutenberg block, so you can find and use icons without leaving WordPress.

= Which icon libraries are included? =

Ant Design Icons (830 icons) and Boxicons (3,768 icons), covering filled, outlined, two-tone, solid, and logo styles.

= Are icons loaded from an external CDN? =

No. Every SVG is bundled with the plugin and served from your own site. No external requests are made to display icons.

= How does the icon search work? =

Icons are indexed in a local SQLite database using FTS5 full-text search. You can search by icon name or tags and filter by library and style.

= Do I need to configure a database? =

No. Icon Base uses a self-contained SQLite database file that lives inside the plugin. It requires the PHP PDO SQLite extension, which is enabled on most hosts.

= Can I add my own icons? =

Yes. The admin app lets you add, update, and delete custom icon entries.

= Is Icon Base translation ready? =

Yes. The plugin uses a text domain and is ready for localization.

== Screenshots ==

1. Icon Base library browser with instant search.
2. Filtering icons by library and style.
3. Inserting an icon with the Gutenberg block.
4. Icon preview and detail view.

== Changelog ==

= 1.0.0 =

* Initial release.
* Bundled Ant Design (830) and Boxicons (3,768) icon libraries.
* SQLite FTS5 full-text icon search.
* Library and style filters with pagination.
* Gutenberg icon block.
* Custom icon add, update, and delete support.

== Upgrade Notice ==

= 1.0.0 =
Initial release of Icon Base.
