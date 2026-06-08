<?php

namespace IconBase\HTTP\Controllers;

if (!\defined('ABSPATH')) {
    exit;
}

use IconBase\Deps\BitApps\WPKit\Http\Request\Request;
use IconBase\Deps\BitApps\WPKit\Http\Response;
use IconBase\Models\Icons;

class IconController
{
    public function index(Request $request)
    {
        $page = absint($request->get('page')) ?: 1;
        $perPage = absint($request->get('per_page')) ?: 100;
        $perPage = min($perPage, 200);
        $search = sanitize_text_field((string) $request->get('search', ''));
        $libraryIds = self::parseIds((string) $request->get('library_ids', ''));
        $typeIds = self::parseIds((string) $request->get('type_ids', ''));

        if (mb_strlen($search) >= Icons::MIN_SEARCH_LENGTH) {
            $result = Icons::search($search, $page, $perPage, $libraryIds, $typeIds);
        } else {
            $result = Icons::getPaginated($page, $perPage, $libraryIds, $typeIds);
        }

        return Response::success($result);
    }

    private static function parseIds(string $raw): array
    {
        if ($raw === '') {
            return [];
        }

        return array_values(array_filter(array_map('absint', explode(',', $raw))));
    }

    public function store(Request $request)
    {
        $slug = sanitize_text_field($request->get('slug'));
        $name = sanitize_text_field($request->get('name'));

        if (empty($slug) || empty($name)) {
            return Response::error('slug and name are required')->httpStatus(400);
        }

        $id = Icons::create(['slug' => $slug, 'name' => $name]);

        return Response::success(['id' => $id]);
    }

    public function update(Request $request)
    {
        $id = absint($request->get('id'));
        $slug = sanitize_text_field($request->get('slug'));
        $name = sanitize_text_field($request->get('name'));

        if (!$id || empty($slug) || empty($name)) {
            return Response::error('id, slug, and name are required')->httpStatus(400);
        }

        $updated = Icons::update($id, ['slug' => $slug, 'name' => $name]);

        if (!$updated) {
            return Response::error('Icon not found')->httpStatus(404);
        }

        return Response::success(['updated' => true]);
    }

    public function destroy(Request $request)
    {
        $id = absint($request->get('id'));

        if (!$id) {
            return Response::error('id is required')->httpStatus(400);
        }

        $deleted = Icons::delete($id);

        if (!$deleted) {
            return Response::error('Icon not found')->httpStatus(404);
        }

        return Response::success(['deleted' => true]);
    }
}
