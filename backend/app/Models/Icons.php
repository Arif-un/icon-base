<?php

namespace IconBase\Models;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Services\SQLiteDB;

// This plugin ships a bundled SQLite database for static icon data; $wpdb (MySQL-only) cannot be used here.
// phpcs:disable WordPress.DB.RestrictedClasses.mysql__PDO

class Icons
{
    public const TABLE = 'icons';

    public const MIN_SEARCH_LENGTH = 3;

    private const MIN_SCORE_THRESHOLD = 80;

    private const FUZZY_FALLBACK_LIMIT = 2000;

    public static function getPaginated(
        int $page = 1,
        int $perPage = 100,
        array $libraryIds = [],
        array $typeIds = []
    ): array {
        $pdo = SQLiteDB::instance()->pdo();

        $conditions = [];
        $binds = [];
        self::buildIdFilter($conditions, $binds, 'library_id', $libraryIds);
        self::buildIdFilter($conditions, $binds, 'type_id', $typeIds);

        $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';

        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::TABLE . $where);

        foreach ($binds as $key => $val) {
            $countStmt->bindValue($key, $val, \PDO::PARAM_INT);
        }

        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        $totalPages = (int) ceil($total / max($perPage, 1));
        $page = max(1, min($page, max(1, $totalPages)));
        $offset = ($page - 1) * $perPage;

        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::TABLE . $where . ' ORDER BY id ASC LIMIT :limit OFFSET :offset'
        );

        foreach ($binds as $key => $val) {
            $stmt->bindValue($key, $val, \PDO::PARAM_INT);
        }

        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items'       => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => $totalPages,
        ];
    }

    private static function buildIdFilter(array &$conditions, array &$binds, string $column, array $ids): void
    {
        if (empty($ids)) {
            return;
        }

        $paramBase = str_replace('.', '_', $column);
        $placeholders = [];

        foreach ($ids as $i => $id) {
            $key = ':' . $paramBase . '_' . $i;
            $placeholders[] = $key;
            $binds[$key] = (int) $id;
        }

        $conditions[] = $column . ' IN (' . implode(', ', $placeholders) . ')';
    }

    public static function search(
        string $query,
        int $page = 1,
        int $perPage = 100,
        array $libraryIds = [],
        array $typeIds = []
    ): array {
        $pdo = SQLiteDB::instance()->pdo();

        $ftsQuery = self::buildFtsQuery($query);

        if ($ftsQuery === '') {
            return self::getPaginated($page, $perPage, $libraryIds, $typeIds);
        }

        try {
            $candidates = self::ftsSearch($pdo, $ftsQuery, $libraryIds, $typeIds);
        } catch (\PDOException $e) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- intentional diagnostic logging
            error_log('icon-base FTS search failed: ' . $e->getMessage());
            $candidates = [];
        }

        if (empty($candidates)) {
            $candidates = self::fuzzyFallback($pdo, $query, $libraryIds, $typeIds);
        }

        $queryLower = mb_strtolower($query);
        $scored = [];

        foreach ($candidates as $row) {
            $nameScore = self::scoreField($queryLower, mb_strtolower($row['name']));
            $tagScore = 0;

            if (!empty($row['tags'])) {
                $tags = array_map('trim', explode(',', $row['tags']));

                foreach ($tags as $tag) {
                    $tagScore = max($tagScore, self::scoreField($queryLower, mb_strtolower($tag)));
                }
            }

            $score = ($nameScore * 2) + $tagScore;

            if ($score >= self::MIN_SCORE_THRESHOLD) {
                $row['_score'] = $score;
                $scored[] = $row;
            }
        }

        usort($scored, static fn ($a, $b) => $b['_score'] <=> $a['_score']);

        $candidates = \array_slice($scored, 0, 200);

        $total = \count($candidates);
        $totalPages = (int) ceil($total / max($perPage, 1));
        $page = max(1, min($page, max(1, $totalPages)));
        $offset = ($page - 1) * $perPage;

        $items = \array_slice($candidates, $offset, $perPage);

        foreach ($items as &$item) {
            unset($item['_score']);
        }

        unset($item);

        return [
            'items'       => $items,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => $totalPages,
        ];
    }

    private static function scoreField(string $query, string $field): float
    {
        if ($field === '') {
            return 0;
        }

        if (mb_strpos($field, $query) !== false) {
            return 100;
        }

        $best = self::scoreToken($query, $field);

        $words = preg_split('/\s+/', $field, -1, PREG_SPLIT_NO_EMPTY);

        if (\count($words) > 1) {
            foreach ($words as $word) {
                $best = max($best, self::scoreToken($query, $word));
            }
        }

        return $best;
    }

    private static function scoreToken(string $query, string $token): float
    {
        if ($token === $query) {
            return 100;
        }

        if (str_starts_with($token, $query)) {
            return 90;
        }

        $maxLen = max(\strlen($query), \strlen($token), 1);

        return (1 - levenshtein($query, $token) / $maxLen) * 80;
    }

    private static function buildFtsQuery(string $query): string
    {
        $clean = preg_replace('/[^a-zA-Z0-9\s\p{L}]/u', ' ', $query);
        $tokens = preg_split('/\s+/', trim($clean), -1, PREG_SPLIT_NO_EMPTY);

        if (empty($tokens)) {
            return '';
        }

        return implode(' ', array_map(static fn ($t) => '"' . $t . '"*', $tokens));
    }

    private static function ftsSearch(\PDO $pdo, string $ftsQuery, array $libraryIds, array $typeIds): array
    {
        $where = '';
        $binds = [];
        $conditions = [];

        self::buildIdFilter($conditions, $binds, 'i.library_id', $libraryIds);
        self::buildIdFilter($conditions, $binds, 'i.type_id', $typeIds);

        if ($conditions) {
            $where = ' AND ' . implode(' AND ', $conditions);
        }

        $sql = 'SELECT i.* FROM icons_fts
                JOIN ' . self::TABLE . ' i ON i.id = icons_fts.rowid
                WHERE icons_fts MATCH :fts_query' . $where . '
                ORDER BY bm25(icons_fts, 2.0, 1.0)
                LIMIT 500';

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':fts_query', $ftsQuery);

        foreach ($binds as $key => $val) {
            $stmt->bindValue($key, $val, \PDO::PARAM_INT);
        }

        $stmt->execute();

        return $stmt->fetchAll();
    }

    private static function fuzzyFallback(\PDO $pdo, string $query, array $libraryIds, array $typeIds): array
    {
        $conditions = [];
        $binds = [];
        self::buildIdFilter($conditions, $binds, 'library_id', $libraryIds);
        self::buildIdFilter($conditions, $binds, 'type_id', $typeIds);

        $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';

        $stmt = $pdo->prepare(
            'SELECT * FROM ' . self::TABLE . $where . ' ORDER BY name ASC LIMIT :fuzzy_limit'
        );

        foreach ($binds as $key => $val) {
            $stmt->bindValue($key, $val, \PDO::PARAM_INT);
        }

        $stmt->bindValue(':fuzzy_limit', self::FUZZY_FALLBACK_LIMIT, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public static function getById(int $id): ?array
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::TABLE . ' WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public static function create(array $data): int
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::TABLE . ' (slug, name) VALUES (:slug, :name)'
        );
        $stmt->execute([':slug' => $data['slug'], ':name' => $data['name']]);

        return (int) $pdo->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare(
            'UPDATE ' . self::TABLE . ' SET slug = :slug, name = :name WHERE id = :id'
        );
        $stmt->execute([':slug' => $data['slug'], ':name' => $data['name'], ':id' => $id]);

        return $stmt->rowCount() > 0;
    }

    public static function delete(int $id): bool
    {
        $pdo = SQLiteDB::instance()->pdo();
        $stmt = $pdo->prepare('DELETE FROM ' . self::TABLE . ' WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
