<?php

namespace IconBase;

use WP_CLI;

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

    public static function setEnv($key, $flag)
    {
        $envFilePath = realpath(__DIR__ . DIRECTORY_SEPARATOR . '../../.env');

        $lines = file($envFilePath, FILE_IGNORE_NEW_LINES);

        $value = $flag ? 'true' : 'false';

        $pattern = "/^{$key}\s*=\s*(.*)/m";

        $envKeyValue = "{$key} = {$value}";

        $found = false;

        foreach ($lines as &$line) {
            if (preg_match($pattern, $line)) {
                $line  = $envKeyValue;
                $found = true;

                break;
            }
        }

        unset($line);

        if (! $found) {
            $lines[] = $envKeyValue;
        }

        $envData = implode("\n", $lines);

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- CLI-only dev writer for plugin-local .env.
        $isContentUpdated = file_put_contents($envFilePath, $envData);

        if ($isContentUpdated === false) {
            WP_CLI::error(\sprintf('Error writing to the file %s!', $isContentUpdated));

            exit;
        }

        return $isContentUpdated;
    }
}
