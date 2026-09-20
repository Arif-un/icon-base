<?php

use IconIndexa\Dotenv;

/**
 * Writes an .env-style fixture to a temp file and returns its path.
 */
function writeEnvFixture(string $contents): string
{
    $path = tempnam(sys_get_temp_dir(), 'ib_env_');
    file_put_contents($path, $contents);

    return $path;
}

beforeEach(function () {
    // Isolate each test from prior $_ENV writes (values are prefixed with ICON_INDEXA_).
    foreach (array_keys($_ENV) as $key) {
        if (strpos($key, 'ICON_INDEXA_') === 0) {
            unset($_ENV[$key]);
        }
    }
});

describe('Dotenv::load', function () {
    test('returns false when the file does not exist', function () {
        expect(Dotenv::load('/no/such/file/.env'))->toBeFalse();
    });

    test('loads a key and prefixes it with the var prefix', function () {
        $path = writeEnvFixture("DEV=hello\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('hello');
        unlink($path);
    });

    test('casts a numeric value to int', function () {
        $path = writeEnvFixture("PORT=3000\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_PORT'])->toBe(3000);
        unlink($path);
    });

    test('casts a float value to float', function () {
        $path = writeEnvFixture("RATIO=1.5\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_RATIO'])->toBe(1.5);
        unlink($path);
    });

    test('casts true/false (any case) to boolean', function () {
        $path = writeEnvFixture("A=true\nB=False\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_A'])->toBeTrue();
        expect($_ENV['ICON_INDEXA_B'])->toBeFalse();
        unlink($path);
    });

    test('skips lines that contain no equals sign', function () {
        $path = writeEnvFixture("# a bare comment line\nDEV=x\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('x');
        unlink($path);
    });

    test('strips inline comments from a value', function () {
        $path = writeEnvFixture("DEV=value # trailing comment\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('value');
        unlink($path);
    });

    test('keeps a # that is part of the value (no preceding whitespace)', function () {
        // A '#' only starts a comment at line start or after whitespace, so a hex color / URL
        // fragment in the value survives instead of being truncated.
        $path = writeEnvFixture("DEV=ab#cd\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('ab#cd');
        unlink($path);
    });

    test('skips a line that becomes empty after the comment is stripped', function () {
        // Leading "#=" -> has '=', but comment strip at position 0 empties the line.
        $path = writeEnvFixture("#=ignored\nDEV=kept\n");

        Dotenv::load($path);

        expect($_ENV)->not->toHaveKey('ICON_INDEXA_');
        expect($_ENV['ICON_INDEXA_DEV'])->toBe('kept');
        unlink($path);
    });

    test('does not overwrite a value already present in $_ENV', function () {
        $_ENV['ICON_INDEXA_DEV'] = 'original';
        $path = writeEnvFixture("DEV=replacement\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('original');
        unlink($path);
    });

    test('splits only on the first equals sign', function () {
        $path = writeEnvFixture("URL=a=b=c\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_URL'])->toBe('a=b=c');
        unlink($path);
    });

    test('preserves a spaced # inside a quoted value instead of truncating it as a comment', function () {
        // A '#' after whitespace normally starts a comment, but not inside quotes: KEY="a # b" is a
        // legitimate value, not "a" plus a comment.
        $path = writeEnvFixture("DEV=\"a # b\"\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('"a # b"');
        unlink($path);
    });

    test('keeps a spaced # after an escaped quote inside a double-quoted value', function () {
        // An escaped quote (\") must NOT close the double-quoted value, so the following spaced '#'
        // stays part of the value instead of being mistaken for a comment start. Without escape
        // handling the \" toggles the quote state off and the value truncates to '"a \'.
        $path = writeEnvFixture('DEV="a \\" # b"' . "\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('"a \\" # b"');
        unlink($path);
    });

    test('still strips an unquoted trailing comment after a value', function () {
        $path = writeEnvFixture("DEV=value # trailing comment\n");

        Dotenv::load($path);

        expect($_ENV['ICON_INDEXA_DEV'])->toBe('value');
        unlink($path);
    });
});
