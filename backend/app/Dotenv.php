<?php

namespace IconIndexa;

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

            $line = self::stripInlineComment($line);

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

    /**
     * Cut an inline '#' comment from a line. A '#' only starts a comment at line start or after
     * whitespace AND when it is not inside single/double quotes, so a value that legitimately
     * contains '#' - a hex color (KEY=#fff), a URL fragment (KEY=http://x#frag) or a quoted value
     * with a spaced '#' (KEY="a # b") - is preserved rather than truncated. A backslash escapes the
     * next char inside a double-quoted value so an escaped quote (KEY="a \" # b") does not
     * prematurely close the quote and expose the following '#' as a comment start.
     */
    private static function stripInlineComment(string $line): string
    {
        $inSingle = false;
        $inDouble = false;
        $len = \strlen($line);

        for ($i = 0; $i < $len; $i++) {
            $ch = $line[$i];
            if ($ch === '\\' && $inDouble && $i + 1 < $len) {
                $i++; // skip the escaped char (e.g. \") so it can't toggle quote state
                continue;
            }
            if ($ch === '"' && ! $inSingle) {
                $inDouble = ! $inDouble;
            } elseif ($ch === "'" && ! $inDouble) {
                $inSingle = ! $inSingle;
            } elseif ($ch === '#' && ! $inSingle && ! $inDouble && ($i === 0 || ctype_space($line[$i - 1]))) {
                return substr($line, 0, $i);
            }
        }

        return $line;
    }
}
