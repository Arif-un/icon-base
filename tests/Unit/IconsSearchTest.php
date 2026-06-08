<?php

use IconBase\Models\Icons;

function callPrivate(string $method, ...$args): mixed
{
    $ref = new ReflectionMethod(Icons::class, $method);

    return $ref->invoke(null, ...$args);
}

describe('buildFtsQuery', function () {
    test('tokenizes and quotes simple input', function () {
        $result = callPrivate('buildFtsQuery', 'arrow right');

        expect($result)->toBe('"arrow"* "right"*');
    });

    test('strips special characters', function () {
        $result = callPrivate('buildFtsQuery', 'arrow(right)~test');

        expect($result)->toBe('"arrow"* "right"* "test"*');
    });

    test('returns empty string for empty input', function () {
        expect(callPrivate('buildFtsQuery', ''))->toBe('');
        expect(callPrivate('buildFtsQuery', '***'))->toBe('');
    });

    test('handles unicode characters', function () {
        $result = callPrivate('buildFtsQuery', 'flèche');

        expect($result)->toBe('"flèche"*');
    });
});

describe('scoreToken', function () {
    test('exact match returns 100', function () {
        expect(callPrivate('scoreToken', 'arrow', 'arrow'))->toBe(100.0);
    });

    test('prefix match returns 90', function () {
        expect(callPrivate('scoreToken', 'arr', 'arrow'))->toBe(90.0);
    });

    test('completely different strings score low', function () {
        expect(callPrivate('scoreToken', 'zzz', 'arrow'))->toBeLessThan(50.0);
    });
});

describe('scoreField', function () {
    test('substring match returns 100', function () {
        expect(callPrivate('scoreField', 'arrow', 'left arrow'))->toBe(100.0);
    });

    test('empty field returns 0', function () {
        expect(callPrivate('scoreField', 'arrow', ''))->toBe(0.0);
    });

    test('scores individual words for best match', function () {
        $score = callPrivate('scoreField', 'arr', 'big arrow');

        expect($score)->toBeGreaterThanOrEqual(90.0);
    });
});

describe('constants', function () {
    test('MIN_SEARCH_LENGTH is 3', function () {
        expect(Icons::MIN_SEARCH_LENGTH)->toBe(3);
    });
});
