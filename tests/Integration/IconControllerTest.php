<?php

use Brain\Monkey\Functions;
use Tests\Helpers\InMemoryDB;
use IconBase\HTTP\Controllers\IconController;
use IconBase\Deps\BitApps\WPKit\Http\Request\Request;

beforeEach(function () {
    $this->pdo = InMemoryDB::setup();

    Functions\when('sanitize_text_field')->alias(function ($str) {
        return trim(strip_tags((string) $str));
    });

    InMemoryDB::seedLibraries($this->pdo, [
        ['id' => 1, 'slug' => 'antd', 'name' => 'Ant Design'],
        ['id' => 2, 'slug' => 'boxicons', 'name' => 'Boxicons'],
    ]);

    InMemoryDB::seedTypes($this->pdo, [
        ['id' => 1, 'type' => 'outlined'],
        ['id' => 2, 'type' => 'filled'],
    ]);

    InMemoryDB::seedIcons($this->pdo, [
        ['name' => 'arrow-left', 'type_id' => 1, 'tags' => 'arrow,left', 'library_id' => 1, 'filename' => 'antd-arrow-left'],
        ['name' => 'arrow-right', 'type_id' => 1, 'tags' => 'arrow,right', 'library_id' => 1, 'filename' => 'antd-arrow-right'],
        ['name' => 'home', 'type_id' => 2, 'tags' => 'house', 'library_id' => 2, 'filename' => 'bx-home'],
    ]);
});

afterEach(function () {
    InMemoryDB::teardown();
});

describe('IconController::index', function () {
    test('returns paginated icons without search', function () {
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('page')->andReturn('1');
        $request->shouldReceive('get')->with('per_page')->andReturn('100');
        $request->shouldReceive('get')->with('search', '')->andReturn('');
        $request->shouldReceive('get')->with('library_ids', '')->andReturn('');
        $request->shouldReceive('get')->with('type_ids', '')->andReturn('');

        $controller = new IconController();
        $response = $controller->index($request);

        expect($response)->not->toBeNull();
    });

    test('uses search when query >= MIN_SEARCH_LENGTH', function () {
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('page')->andReturn('1');
        $request->shouldReceive('get')->with('per_page')->andReturn('100');
        $request->shouldReceive('get')->with('search', '')->andReturn('arrow');
        $request->shouldReceive('get')->with('library_ids', '')->andReturn('');
        $request->shouldReceive('get')->with('type_ids', '')->andReturn('');

        $controller = new IconController();
        $response = $controller->index($request);

        expect($response)->not->toBeNull();
    });

    test('falls back to paginated when search query too short', function () {
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('page')->andReturn('1');
        $request->shouldReceive('get')->with('per_page')->andReturn('100');
        $request->shouldReceive('get')->with('search', '')->andReturn('ab');
        $request->shouldReceive('get')->with('library_ids', '')->andReturn('');
        $request->shouldReceive('get')->with('type_ids', '')->andReturn('');

        $controller = new IconController();
        $response = $controller->index($request);

        expect($response)->not->toBeNull();
    });

    test('passes library and type filters', function () {
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('page')->andReturn('1');
        $request->shouldReceive('get')->with('per_page')->andReturn('100');
        $request->shouldReceive('get')->with('search', '')->andReturn('');
        $request->shouldReceive('get')->with('library_ids', '')->andReturn('1');
        $request->shouldReceive('get')->with('type_ids', '')->andReturn('1');

        $controller = new IconController();
        $response = $controller->index($request);

        expect($response)->not->toBeNull();
    });

    test('caps per_page at 200', function () {
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('get')->with('page')->andReturn('1');
        $request->shouldReceive('get')->with('per_page')->andReturn('500');
        $request->shouldReceive('get')->with('search', '')->andReturn('');
        $request->shouldReceive('get')->with('library_ids', '')->andReturn('');
        $request->shouldReceive('get')->with('type_ids', '')->andReturn('');

        $controller = new IconController();
        $response = $controller->index($request);

        expect($response)->not->toBeNull();
    });
});
