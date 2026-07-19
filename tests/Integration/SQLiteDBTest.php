<?php

use Brain\Monkey\Functions;
use IconBase\Config;
use IconBase\Services\SQLiteDB;
use Tests\Helpers\InMemoryDB;

/*
 * Covers the runtime SQLite generation pipeline added to SQLiteDB: the plugin ships
 * backend/data/ib.json (source of truth) and builds the SQLite db from it into the writable
 * uploads dir, version-gated by Config::DATA_VERSION. These tests exercise the private build
 * steps directly (schema/import/fts), then the full generation flow end-to-end.
 */

/** Invoke a private SQLiteDB method on a constructor-less instance. */
function sqliteDb(string $method, array $args)
{
    $instance = (new \ReflectionClass(SQLiteDB::class))->newInstanceWithoutConstructor();
    $ref      = new \ReflectionMethod(SQLiteDB::class, $method);
    $ref->setAccessible(true);

    return $ref->invokeArgs($instance, $args);
}

/** A fresh, empty in-memory connection (no schema). */
function freshPdo(): \PDO
{
    return new \PDO('sqlite::memory:', null, null, [
        \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
    ]);
}

/** A minimal, valid dataset mirroring the shape of backend/data/ib.json. */
function sampleDataset(): array
{
    return [
        'version'   => '1.0.0',
        'icon_type' => [
            ['id' => 1, 'type' => 'outlined'],
            ['id' => 2, 'type' => 'filled'],
        ],
        'library' => [
            ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design', 'meta' => '{"w":1024}'],
            ['id' => 2, 'slug' => 'boxicons', 'name' => 'Boxicons'], // no meta -> NULL
        ],
        'icons' => [
            ['id' => 1, 'name' => 'arrow left', 'type_id' => 1, 'tags' => 'arrow,left', 'library_id' => 1, 'filename' => 'antd-arrow-left.svg'],
            ['id' => 2, 'name' => 'home', 'type_id' => 2, 'tags' => null, 'library_id' => 2, 'filename' => 'bx-home.svg'],
            ['id' => 3, 'name' => 'star', 'library_id' => 2, 'filename' => 'bx-star.svg'], // no type_id / tags -> NULL
        ],
    ];
}

function writeSource(string $path, $data): void
{
    file_put_contents($path, is_string($data) ? $data : json_encode($data));
}

function rrmdir(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }

    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $path = $dir . DIRECTORY_SEPARATOR . $item;
        is_dir($path) ? rrmdir($path) : unlink($path);
    }

    rmdir($dir);
}

describe('createSchema', function () {
    beforeEach(function () {
        $this->pdo = freshPdo();
        sqliteDb('createSchema', [$this->pdo]);
    });

    test('creates the icon_type, library and icons tables', function () {
        $tables = $this->pdo
            ->query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            ->fetchAll(\PDO::FETCH_COLUMN);

        expect($tables)->toContain('icon_type', 'library', 'icons');
    });

    test('creates a unique index on icons.filename', function () {
        $indexes = $this->pdo
            ->query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='icons'")
            ->fetchAll(\PDO::FETCH_COLUMN);

        expect($indexes)->toContain('icons_filename_unique');
    });

    test('declares foreign keys from icons to icon_type and library', function () {
        $fks = $this->pdo->query('PRAGMA foreign_key_list(icons)')->fetchAll();

        $referenced = array_column($fks, 'table');

        expect($fks)->toHaveCount(2);
        expect($referenced)->toContain('icon_type', 'library');
    });

    test('rejects a duplicate filename', function () {
        $this->pdo->exec("INSERT INTO icons (name, library_id, filename) VALUES ('a', 1, 'dup.svg')");

        expect(fn () => $this->pdo->exec("INSERT INTO icons (name, library_id, filename) VALUES ('b', 1, 'dup.svg')"))
            ->toThrow(\PDOException::class);
    });

    test('rejects a duplicate icon type', function () {
        $this->pdo->exec("INSERT INTO icon_type (type) VALUES ('outlined')");

        expect(fn () => $this->pdo->exec("INSERT INTO icon_type (type) VALUES ('outlined')"))
            ->toThrow(\PDOException::class);
    });

    test('rejects a duplicate library slug', function () {
        $this->pdo->exec("INSERT INTO library (slug, name) VALUES ('antd', 'Ant Design')");

        expect(fn () => $this->pdo->exec("INSERT INTO library (slug, name) VALUES ('antd', 'Ant Design 2')"))
            ->toThrow(\PDOException::class);
    });

    test('rejects an icon with a NULL filename', function () {
        expect(fn () => $this->pdo->exec("INSERT INTO icons (name, library_id, filename) VALUES ('a', 1, NULL)"))
            ->toThrow(\PDOException::class);
    });
});

describe('importJson', function () {
    beforeEach(function () {
        $this->pdo    = freshPdo();
        sqliteDb('createSchema', [$this->pdo]);
        $this->source = tempnam(sys_get_temp_dir(), 'ibsrc');
    });

    afterEach(function () {
        @unlink($this->source);
    });

    test('imports all rows preserving ids from the JSON', function () {
        writeSource($this->source, sampleDataset());

        sqliteDb('importJson', [$this->pdo, $this->source]);

        expect((int) $this->pdo->query('SELECT COUNT(*) FROM icon_type')->fetchColumn())->toBe(2);
        expect((int) $this->pdo->query('SELECT COUNT(*) FROM library')->fetchColumn())->toBe(2);
        expect((int) $this->pdo->query('SELECT COUNT(*) FROM icons')->fetchColumn())->toBe(3);

        $icon = $this->pdo->query('SELECT * FROM icons WHERE id = 1')->fetch();
        expect($icon['name'])->toBe('arrow left');
        expect($icon['filename'])->toBe('antd-arrow-left.svg');
    });

    test('stores missing optional columns as NULL', function () {
        writeSource($this->source, sampleDataset());

        sqliteDb('importJson', [$this->pdo, $this->source]);

        $star = $this->pdo->query('SELECT * FROM icons WHERE id = 3')->fetch();
        expect($star['type_id'])->toBeNull();
        expect($star['tags'])->toBeNull();

        $boxicons = $this->pdo->query('SELECT * FROM library WHERE id = 2')->fetch();
        expect($boxicons['meta'])->toBeNull();
    });

    test('tolerates missing top-level sections', function () {
        writeSource($this->source, [
            'icons' => [
                ['id' => 1, 'name' => 'lonely', 'library_id' => 1, 'filename' => 'lonely.svg'],
            ],
        ]);

        sqliteDb('importJson', [$this->pdo, $this->source]);

        expect((int) $this->pdo->query('SELECT COUNT(*) FROM icon_type')->fetchColumn())->toBe(0);
        expect((int) $this->pdo->query('SELECT COUNT(*) FROM library')->fetchColumn())->toBe(0);
        expect((int) $this->pdo->query('SELECT COUNT(*) FROM icons')->fetchColumn())->toBe(1);
    });

    test('imports an empty dataset without error', function () {
        writeSource($this->source, ['icon_type' => [], 'library' => [], 'icons' => []]);

        sqliteDb('importJson', [$this->pdo, $this->source]);

        expect((int) $this->pdo->query('SELECT COUNT(*) FROM icons')->fetchColumn())->toBe(0);
    });

    test('throws on malformed JSON', function () {
        writeSource($this->source, '{not valid json');

        expect(fn () => sqliteDb('importJson', [$this->pdo, $this->source]))
            ->toThrow(\RuntimeException::class, 'icon dataset JSON is invalid.');
    });

    test('throws when JSON does not decode to an object', function (string $json) {
        writeSource($this->source, $json);

        expect(fn () => sqliteDb('importJson', [$this->pdo, $this->source]))
            ->toThrow(\RuntimeException::class, 'icon dataset JSON is invalid.');
    })->with([
        'null'   => ['null'],
        'scalar' => ['42'],
        'string' => ['"just a string"'],
    ]);
});

describe('createFts', function () {
    test('populates the FTS index from already-imported content', function () {
        $pdo = freshPdo();
        sqliteDb('createSchema', [$pdo]);

        $source = tempnam(sys_get_temp_dir(), 'ibsrc');
        writeSource($source, sampleDataset());
        sqliteDb('importJson', [$pdo, $source]);

        // Content exists before the FTS index/triggers -> only the 'rebuild' backfill can index it.
        sqliteDb('createFts', [$pdo]);

        $hits = $pdo->query("SELECT name FROM icons_fts WHERE icons_fts MATCH '\"arrow\"*'")->fetchAll();

        expect($hits)->not->toBeEmpty();
        expect($hits[0]['name'])->toBe('arrow left');

        @unlink($source);
    });
});

describe('needsRebuild', function () {
    test('is true when the db file is missing', function () {
        $missing = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ib_missing_' . uniqid() . '.db';

        expect(sqliteDb('needsRebuild', [$missing]))->toBeTrue();
    });

    test('is true when the stored data version is older than the shipped one', function () {
        Functions\when('get_option')->justReturn('0.0.1');

        $existing = tempnam(sys_get_temp_dir(), 'ibdb');

        expect(sqliteDb('needsRebuild', [$existing]))->toBeTrue();

        @unlink($existing);
    });

    test('is false when the stored data version matches the shipped one', function () {
        Functions\when('get_option')->justReturn(Config::DATA_VERSION);

        $existing = tempnam(sys_get_temp_dir(), 'ibdb');

        expect(sqliteDb('needsRebuild', [$existing]))->toBeFalse();

        @unlink($existing);
    });

    test('is false when the stored data version is newer than the shipped one', function () {
        Functions\when('get_option')->justReturn('99.0.0');

        $existing = tempnam(sys_get_temp_dir(), 'ibdb');

        expect(sqliteDb('needsRebuild', [$existing]))->toBeFalse();

        @unlink($existing);
    });
});

describe('prepareDir', function () {
    beforeEach(function () {
        Functions\when('wp_mkdir_p')->alias(fn ($dir) => is_dir($dir) || mkdir($dir, 0777, true));
        $this->dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ib_dir_' . uniqid();
    });

    afterEach(function () {
        rrmdir($this->dir);
    });

    test('creates the directory with an index.php and a locked-down .htaccess', function () {
        sqliteDb('prepareDir', [$this->dir]);

        expect(is_dir($this->dir))->toBeTrue();
        expect(file_get_contents($this->dir . '/index.php'))->toContain('Silence is golden');

        $htaccess = file_get_contents($this->dir . '/.htaccess');
        expect($htaccess)->toContain('Require all denied');
        expect($htaccess)->toContain('Deny from all');
    });

    test('does not overwrite an existing index.php', function () {
        mkdir($this->dir, 0777, true);
        file_put_contents($this->dir . '/index.php', '<?php // custom');

        sqliteDb('prepareDir', [$this->dir]);

        expect(file_get_contents($this->dir . '/index.php'))->toBe('<?php // custom');
    });

    test('is idempotent', function () {
        sqliteDb('prepareDir', [$this->dir]);

        expect(fn () => sqliteDb('prepareDir', [$this->dir]))->not->toThrow(\Throwable::class);
    });
});

describe('rebuild (end-to-end via instance())', function () {
    beforeEach(function () {
        InMemoryDB::teardown();

        $this->base       = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'ib_e2e_' . uniqid();
        $this->uploads    = $this->base . DIRECTORY_SEPARATOR . 'uploads';
        $this->pluginRoot = $this->base . DIRECTORY_SEPARATOR . 'plugin' . DIRECTORY_SEPARATOR;
        $this->dataDir    = $this->pluginRoot . 'backend' . DIRECTORY_SEPARATOR . 'data';
        $this->source     = $this->dataDir . DIRECTORY_SEPARATOR . 'ib.json';
        $this->dbDir      = $this->uploads . DIRECTORY_SEPARATOR . 'icon-base';
        $this->dbPath     = $this->dbDir . DIRECTORY_SEPARATOR . 'ib.db';

        mkdir($this->uploads, 0777, true);
        mkdir($this->dataDir, 0777, true);
        writeSource($this->source, sampleDataset());

        $this->stored = [];
        $options       = &$this->stored;

        Functions\when('wp_upload_dir')->justReturn(['basedir' => $this->uploads, 'baseurl' => 'https://example.com/u']);
        Functions\when('plugin_dir_path')->justReturn($this->pluginRoot);
        Functions\when('wp_mkdir_p')->alias(fn ($dir) => is_dir($dir) || mkdir($dir, 0777, true));
        Functions\when('wp_delete_file')->alias(function ($path) {
            if (is_file($path)) {
                unlink($path);
            }
        });
        Functions\when('get_option')->alias(function ($name, $default = false) use (&$options) {
            return $options[$name] ?? $default;
        });
        Functions\when('update_option')->alias(function ($name, $value, $autoload = null) use (&$options) {
            $options[$name] = $value;

            return true;
        });
    });

    afterEach(function () {
        InMemoryDB::teardown();
        rrmdir($this->base);
    });

    test('generates the db in the uploads dir and records the data version', function () {
        $pdo = SQLiteDB::instance()->pdo();

        expect(is_file($this->dbPath))->toBeTrue();
        expect((int) $pdo->query('SELECT COUNT(*) FROM icons')->fetchColumn())->toBe(3);
        expect((int) $pdo->query('SELECT COUNT(*) FROM library')->fetchColumn())->toBe(2);
        expect((int) $pdo->query('SELECT COUNT(*) FROM icon_type')->fetchColumn())->toBe(2);
        expect($this->stored['ICON_BASE_data_version'])->toBe(Config::DATA_VERSION);
    });

    test('the generated db has a working FTS index', function () {
        $pdo = SQLiteDB::instance()->pdo();

        $hits = $pdo->query("SELECT name FROM icons_fts WHERE icons_fts MATCH '\"arrow\"*'")->fetchAll();

        expect($hits)->not->toBeEmpty();
    });

    test('leaves no temp build artifacts behind', function () {
        SQLiteDB::instance();

        $leftovers = glob($this->dbDir . DIRECTORY_SEPARATOR . '*.tmp');

        expect($leftovers)->toBeEmpty();
    });

    test('throws and records nothing when the dataset file is missing', function () {
        unlink($this->source);

        expect(fn () => SQLiteDB::instance())
            ->toThrow(\RuntimeException::class, 'icon dataset not found');

        expect($this->stored)->not->toHaveKey('ICON_BASE_data_version');
        expect(is_file($this->dbPath))->toBeFalse();
    });

    test('throws, records nothing and cleans up when the dataset JSON is invalid', function () {
        writeSource($this->source, 'not-json-at-all');

        expect(fn () => SQLiteDB::instance())
            ->toThrow(\RuntimeException::class, 'icon dataset JSON is invalid.');

        expect($this->stored)->not->toHaveKey('ICON_BASE_data_version');
        expect(is_file($this->dbPath))->toBeFalse();
        expect(glob($this->dbDir . DIRECTORY_SEPARATOR . '*.tmp'))->toBeEmpty();
    });

    test('does not rebuild when the stored version is already current', function () {
        SQLiteDB::instance();            // first build records the current version
        InMemoryDB::teardown();
        unlink($this->source);           // remove the source: a rebuild would now fail

        // Version is current and the db exists, so no rebuild is attempted despite the missing source.
        $pdo = SQLiteDB::instance()->pdo();

        expect((int) $pdo->query('SELECT COUNT(*) FROM icons')->fetchColumn())->toBe(3);
    });

    test('rebuilds when the stored version is older than the shipped one', function () {
        SQLiteDB::instance();            // build with the 3-icon dataset
        InMemoryDB::teardown();

        // Simulate a shipped dataset update: an older stored version and different source contents.
        $this->stored['ICON_BASE_data_version'] = '0.0.1';

        $smaller             = sampleDataset();
        $smaller['icons']    = [$smaller['icons'][0]];
        writeSource($this->source, $smaller);

        $pdo = SQLiteDB::instance()->pdo();

        expect((int) $pdo->query('SELECT COUNT(*) FROM icons')->fetchColumn())->toBe(1);
        expect($this->stored['ICON_BASE_data_version'])->toBe(Config::DATA_VERSION);
    });
});
