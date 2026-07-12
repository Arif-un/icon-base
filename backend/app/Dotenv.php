<?php

namespace IconBase;

if (! defined('ABSPATH')) {
    exit;
}

final class Dotenv
{
    public static function load($path = '')
    {
        if (! file_exists($path)) {
            return false;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            if (strpos($line, '=') === false) {
                continue;
            }

            $position = strpos($line, '#');

            if ($position !== false) {
                $line = substr($line, 0, $position);
            }

            if (empty($line)) {
                continue;
            }

            list($name, $value) = explode('=', trim($line), 2);

            $name = Config::VAR_PREFIX . trim($name);

            $value = trim($value);

            if (is_numeric($value)) {
                $value = $value + 0; // Converts to int or float
            } elseif (strtolower($value) == 'true' || strtolower($value) == 'false') {
                $value = strtolower($value) == 'true'; // Converts to boolean
            }

            if (! \array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
            }
        }
    }
}
