=== Icon Base ===
Contributors:      mrknuckles, arif25897
Tags:              icons, svg, icon library, gutenberg block, icon picker
Requires at least: 5.9
Tested up to:      7.0
Requires PHP:      7.4
Stable tag:        0.1.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Add 4,500+ self-hosted SVG icons to WordPress with instant full-text search and a powerful Gutenberg icon block.

== Description ==

Icon Base bundles thousands of crisp, scalable SVG icons directly inside WordPress, so you never have to hunt for, upload, or self-host icon files again.

Browse multiple popular icon sets, search across every icon by name or tag in milliseconds, and drop any icon straight into the block editor with a single, easy-to-use block. Every icon ships with the plugin and is served from your own site — nothing is fetched from a third-party CDN.



=== Key features ===

* **4,500+ bundled SVG icons** from popular icon sets, ready to use out of the box
* **Instant full-text search** powered by a local SQLite FTS5 index — search every icon by name or tag, even across thousands of entries
* **Self-hosted, no external requests** — every SVG is served from your own site, nothing fetched from a third-party CDN
* **Powerful Gutenberg icon block** with link, rotation (full 360°), horizontal/vertical flip, alignment, color, gradient, background, border, padding, margin, and hover effects
* **Inline SVG output** so icons scale cleanly, inherit color, and stay sharp on any screen
* **Library and style filters** to quickly narrow results by icon set and variant
* **Add your own icon** — add custom icon by pasting SVG code directly, or by choosing an SVG from the WordPress Media Library
* **Modern React-based icon browser** for fast preview and selection
* **Translation ready** with full text domain support
* **Privacy friendly** — no icon data is sent to or fetched from any external service

=== Bundled icon libraries ===

* **Ant Design Icons** (830 icons) — filled, outlined, and two-tone styles.
* **Boxicons** (3,768 icons) — regular, solid, and logo variants.

=== Contribute & stay connected ===

Icon Base is open source and community driven. Contributions, bug reports, and new icon sets are always welcome.

* [View on GitHub](https://github.com/Arif-un/icon-base) — source code, fork, and star the project
* [Report a bug or request a feature](https://github.com/Arif-un/icon-base/issues)
* [Send a pull request](https://github.com/Arif-un/icon-base/pulls)

== Installation ==

= Automated installation =

1. In your WordPress dashboard go to **Plugins &rarr; Add New**.
2. Search for **Icon Base**.
3. Click **Install Now**, then **Activate**.

= Manual installation =

1. Download the plugin and make sure the folder is zipped, then upload it via **Plugins &rarr; Add New &rarr; Upload Plugin**. Alternatively, upload the `icon-base` folder to the `/wp-content/plugins/` directory.
2. Activate **Icon Base** through the **Plugins** screen in WordPress.
3. Open the **Icon Base** menu item to start browsing icons, or search for the "Icon Base" block within the Block Editor (Gutenberg).

= Requirements =

* WordPress 5.0 or higher
* PHP 7.4 or higher
* The PHP SQLite (PDO) extension enabled

== Frequently Asked Questions ==

= What is Icon Base? =

Icon Base is a WordPress plugin that bundles thousands of SVG icons with a fast search interface and a Gutenberg block, so you can find and use icons without ever leaving WordPress.

= Which icon libraries are included? =

Ant Design Icons (830 icons) and Boxicons (3,768 icons), covering filled, outlined, two-tone, regular, solid, and logo styles — more than 4,500 icons in total.

= Are icons loaded from an external CDN? =

No. Every SVG is bundled with the plugin and served from your own site. No external requests are made to display icons.

= How does the icon search work? =

Icons are indexed in a local SQLite database using FTS5 full-text search. You can search by icon name or tags and filter by library and style, with results returned in milliseconds even across thousands of icons.

= Do I need to configure a database? =

No. Icon Base uses a self-contained SQLite database file that ships inside the plugin. It only requires the PHP PDO SQLite extension, which is enabled on most hosts.

= Can I add my own icon? =

Yes. You can add your own custom icon in two ways: paste the SVG code directly, or select an SVG from the WordPress Media Library.

= Why is my icon not changing color? =

The icon block includes controls for the icon's color and background. However, if your SVG icon has hard-coded color or fill values, the plugin will respect those instead of any applied custom colors.

= Is Icon Base translation ready? =

Yes. The plugin uses a text domain and is fully ready for localization.

= Is it safe to add my own SVG icons? =

Yes. Every SVG you paste or import from the Media Library is sanitized before it is used. Scripts, event handlers, and unsafe markup are stripped, and SVGs that embed a raster bitmap (PNG/JPEG) or that have no usable vector content are rejected with a clear message. Link URLs on icons are restricted to safe protocols (http, https, mailto, tel, and same-page anchors).

= Where is my data stored? What happens when I uninstall? =

Icon Base stores its data in a self-contained SQLite database that ships inside the plugin, plus a small set of WordPress options. No content is written outside your own site. Custom icons you add are stored locally. Removing the plugin cleans up its data on uninstall.

= Does the plugin make any external or third-party requests? =

No. Icon Base is fully self-hosted. No icon data, usage data, or telemetry is sent to any external service, and no assets are fetched from a third-party CDN.

= Is the bundled SQLite database protected from direct download? =

Yes, on Apache and IIS. The plugin ships `.htaccess` (Apache) and `web.config` (IIS) rules plus an `index.php` guard that block direct web access to the database directory (`backend/data/`).

Nginx does not read `.htaccess`, so if you run Nginx add the following to your server block to deny direct access to the data directory:

`location ~* /wp-content/plugins/icon-base/backend/data/ { deny all; }`

The database is only ever read server-side by PHP, so blocking direct HTTP access has no effect on plugin functionality.

== Privacy ==

Icon Base does not collect, store, or transmit any personal data. It makes no external HTTP requests and includes no tracking, analytics, or telemetry. All icons and search indexes are bundled with the plugin and served entirely from your own site.

== Screenshots ==

1. The Icon Base library browser with instant full-text search across thousands of icons.
2. Filtering icons by library and style to quickly find the icon you need.
3. Inserting and configuring an icon with the Gutenberg icon block.
4. Icon block controls including color, gradient, rotation, alignment, border, and spacing.
5. Adding and managing your own custom icons from the admin app.
6. Icon preview and detail view.

== Changelog ==

= 1.0.0 =

* Initial release 🎉
* Bundled Ant Design (830) and Boxicons (3,768) icon libraries — 4,500+ SVG icons.
* SQLite FTS5 full-text icon search by name and tag.
* Library and style filters with pagination.
* Gutenberg icon block with link, 360° rotation, flip, alignment, color, gradient, background, border, padding, margin, stroke width, and hover effects.
* Self-hosted inline SVG output with no external requests.
* Custom icon add, update, and delete support.
* Translation ready.

== Upgrade Notice ==

= 1.0.0 =
Initial release of Icon Base.
</content>
</invoke>
