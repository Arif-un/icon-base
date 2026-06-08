<?php

use IconBase\Models\Icons;

function callBuildIdFilter(array &$conditions, array &$binds, string $column, array $ids): void
{
    $ref = new ReflectionMethod(Icons::class, 'buildIdFilter');
    $ref->invokeArgs(null, [&$conditions, &$binds, $column, $ids]);
}

describe('Icons::buildIdFilter', function () {
    test('does nothing for empty ids', function () {
        $conditions = [];
        $binds = [];
        callBuildIdFilter($conditions, $binds, 'library_id', []);

        expect($conditions)->toBe([]);
        expect($binds)->toBe([]);
    });

    test('builds single id filter', function () {
        $conditions = [];
        $binds = [];
        callBuildIdFilter($conditions, $binds, 'library_id', [5]);

        expect($conditions)->toBe(['library_id IN (:library_id_0)']);
        expect($binds)->toBe([':library_id_0' => 5]);
    });

    test('builds multiple id filter', function () {
        $conditions = [];
        $binds = [];
        callBuildIdFilter($conditions, $binds, 'type_id', [1, 2, 3]);

        expect($conditions)->toBe(['type_id IN (:type_id_0, :type_id_1, :type_id_2)']);
        expect($binds)->toHaveCount(3);
        expect($binds[':type_id_0'])->toBe(1);
        expect($binds[':type_id_1'])->toBe(2);
        expect($binds[':type_id_2'])->toBe(3);
    });

    test('replaces dots in column name for param base', function () {
        $conditions = [];
        $binds = [];
        callBuildIdFilter($conditions, $binds, 'i.library_id', [7]);

        expect($conditions)->toBe(['i.library_id IN (:i_library_id_0)']);
        expect($binds)->toBe([':i_library_id_0' => 7]);
    });

    test('appends to existing conditions', function () {
        $conditions = ['status = 1'];
        $binds = [':status' => 1];
        callBuildIdFilter($conditions, $binds, 'type_id', [4]);

        expect($conditions)->toHaveCount(2);
        expect($conditions[0])->toBe('status = 1');
        expect($conditions[1])->toBe('type_id IN (:type_id_0)');
        expect($binds[':status'])->toBe(1);
        expect($binds[':type_id_0'])->toBe(4);
    });

    test('casts ids to int', function () {
        $conditions = [];
        $binds = [];
        callBuildIdFilter($conditions, $binds, 'library_id', ['5', '10']);

        expect($binds[':library_id_0'])->toBe(5);
        expect($binds[':library_id_1'])->toBe(10);
    });
});
