<?php

namespace IconBase\src;

if (!defined('ABSPATH')) {
    exit;
}

use IconBase\Config;
use IconBase\Views\Body;

final class Menu
{
    private static function getMenuIcon()
    {
        // phpcs:ignore Generic.Files.LineLength.MaxExceeded -- SVG path data cannot be split
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 104"><path fill="black" d="M97.8721 3C99.5994 3 101 4.41527 101 6.16113V97.8389L100.996 98.001C100.912 99.6713 99.5455 101 97.8721 101H6.12793L5.9668 100.996C4.31424 100.911 3.00007 99.5302 3 97.8389V6.16113C3.00008 4.4698 4.31425 3.08853 5.9668 3.00391L6.12793 3H97.8721ZM52 44.0967C32.4133 44.0967 18.6387 58.6721 18.6387 74.1289V85.1934H36.3594C35.031 82.6808 34.2764 79.8115 34.2764 76.7637C34.2764 66.8701 42.2117 58.8497 52 58.8496C53.9287 58.8496 55.7851 59.1625 57.5234 59.7383C55.4707 60.9153 54.085 63.1434 54.085 65.6992C54.0852 69.4817 57.119 72.5486 60.8613 72.5488C63.8929 72.5488 66.4584 70.5357 67.3242 67.7607C68.8487 70.4061 69.7236 73.4816 69.7236 76.7637C69.7236 79.8114 68.9699 82.6809 67.6416 85.1934H85.3613V74.1289C85.3613 58.6721 71.5867 44.0967 52 44.0967ZM18.6387 40.5596C27.3865 32.9482 39.111 28.29 52 28.29C64.889 28.29 76.6135 32.9482 85.3613 40.5596V18.8066H18.6387V40.5596Z"/></svg>';

        // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Required for WP menu icon data URI
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    public static function getSideBarMenu(Body $body)
    {
        return [
            'Home' => [
                'type'       => 'menu',
                'title'      => Config::TITLE,
                'name'       => Config::TITLE,
                'capability' => 'manage_options',
                'slug'       => Config::SLUG,
                'callback'   => [$body, 'render'],
                'icon'       => self::getMenuIcon(),
                'position'   => '20',
            ],
        ];
    }
}
