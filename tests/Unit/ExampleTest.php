<?php

test('basic assertion works', function () {
    expect(true)->toBeTrue();
});

test('array has expected keys', function () {
    $result = [
        'items'       => [],
        'total'       => 0,
        'page'        => 1,
        'per_page'    => 100,
        'total_pages' => 0,
    ];

    expect($result)
        ->toBeArray()
        ->toHaveKeys(['items', 'total', 'page', 'per_page', 'total_pages']);
});
