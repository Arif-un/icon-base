<?php

use IconBase\HTTP\Controllers\IconController;

function callParseIds(string $raw): array
{
    $ref = new ReflectionMethod(IconController::class, 'parseIds');

    return $ref->invoke(null, $raw);
}

describe('IconController::parseIds', function () {
    test('returns empty array for empty string', function () {
        expect(callParseIds(''))->toBe([]);
    });

    test('parses single id', function () {
        expect(callParseIds('5'))->toBe([5]);
    });

    test('parses comma-separated ids', function () {
        expect(callParseIds('1,2,3'))->toBe([1, 2, 3]);
    });

    test('filters out zero values', function () {
        expect(callParseIds('1,0,3'))->toBe([1, 3]);
    });

    test('filters out non-numeric values', function () {
        expect(callParseIds('1,abc,3'))->toBe([1, 3]);
    });

    test('casts to integers', function () {
        $result = callParseIds('10,20');

        expect($result)->toBe([10, 20]);
        expect($result[0])->toBeInt();
    });

    test('re-indexes after filtering', function () {
        $result = callParseIds('0,0,5');

        expect($result)->toBe([5]);
        expect(array_keys($result))->toBe([0]);
    });
});
