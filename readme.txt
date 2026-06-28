=== Icon Base: SVG Icon Library, Instant Search & Gutenberg Icon Block ===
Contributors:      arif25897
Tags:              icons, svg, icon library, gutenberg block, icon picker
Requires at least: 5.0
Tested up to:      6.8
Requires PHP:      7.4
Stable tag:        1.0.0
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
* **Add your own icons** — create, update, and remove custom icon entries from the admin app
* **Modern React-based icon browser** for fast preview and selection
* **Translation ready** with full text domain support
* **Privacy friendly** — no icon data is sent to or fetched from any external service

=== Bundled icon libraries ===

* **Ant Design Icons** (830 icons) — filled, outlined, and two-tone styles.
* **Boxicons** (3,768 icons) — regular, solid, and logo variants.

=== Stay connected ===

* [View live demo](DEMO_URL_HERE)
* [View on GitHub](GITHUB_URL_HERE)
* [Visit plugin project page](PROJECT_URL_HERE)

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

= Can I add my own icons? =

Yes. The admin app lets you add, update, and delete your own custom icon entries.

= Why is my icon not changing color? =

The icon block includes controls for the icon's color and background. However, if your SVG icon has hard-coded color or fill values, the plugin will respect those instead of any applied custom colors.

= Is Icon Base translation ready? =

Yes. The plugin uses a text domain and is fully ready for localization.

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
