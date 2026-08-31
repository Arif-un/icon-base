<?php

use Brain\Monkey\Functions;
use IconIndexa\Config;
use IconIndexa\Services\Onboarding;

beforeEach(function () {
    $this->userId = 7;
    $this->meta   = [];

    Functions\when('get_current_user_id')->alias(function () {
        return $this->userId;
    });

    Functions\when('get_user_meta')->alias(function ($userId, $key) {
        return $this->meta[$userId][$key] ?? '';
    });

    Functions\when('update_user_meta')->alias(function ($userId, $key, $value) {
        $this->meta[$userId][$key] = $value;

        return true;
    });
});

describe('Onboarding::stateForCurrentUser', function () {
    test('treats a user with no stored state as having seen nothing', function () {
        expect(Onboarding::stateForCurrentUser())->toBe([
            'version'     => Config::ONBOARDING_VERSION,
            'wizard'      => false,
            'adminTour'   => false,
            'editorGuide' => false,
        ]);
    });

    test('returns stored flags when the stored revision is current', function () {
        $this->meta[7][Config::withPrefix('onboarding')] = [
            'version'     => Config::ONBOARDING_VERSION,
            'wizard'      => true,
            'adminTour'   => false,
            'editorGuide' => true,
        ];

        expect(Onboarding::stateForCurrentUser())->toBe([
            'version'     => Config::ONBOARDING_VERSION,
            'wizard'      => true,
            'adminTour'   => false,
            'editorGuide' => true,
        ]);
    });

    test('re-shows everything when the stored revision is older than the current one', function () {
        $this->meta[7][Config::withPrefix('onboarding')] = [
            'version'     => Config::ONBOARDING_VERSION - 1,
            'wizard'      => true,
            'adminTour'   => true,
            'editorGuide' => true,
        ];

        expect(Onboarding::stateForCurrentUser())->toBe(Onboarding::defaultState());
    });

    test('treats state stored without a revision as never seen', function () {
        $this->meta[7][Config::withPrefix('onboarding')] = ['wizard' => true];

        expect(Onboarding::stateForCurrentUser())->toBe(Onboarding::defaultState());
    });

    test('falls back to defaults when the stored value is not an array', function () {
        $this->meta[7][Config::withPrefix('onboarding')] = 'corrupted';

        expect(Onboarding::stateForCurrentUser())->toBe(Onboarding::defaultState());
    });

    test('coerces truthy stored values to real booleans', function () {
        $this->meta[7][Config::withPrefix('onboarding')] = [
            'version' => Config::ONBOARDING_VERSION,
            'wizard'  => '1',
        ];

        expect(Onboarding::stateForCurrentUser()['wizard'])->toBeTrue();
    });

    test('is per user, so a second administrator still gets onboarded', function () {
        $this->meta[7][Config::withPrefix('onboarding')] = [
            'version' => Config::ONBOARDING_VERSION,
            'wizard'  => true,
        ];

        expect(Onboarding::stateForCurrentUser()['wizard'])->toBeTrue();

        $this->userId = 8;

        expect(Onboarding::stateForCurrentUser()['wizard'])->toBeFalse();
    });

    test('returns defaults when nobody is logged in', function () {
        $this->userId = 0;

        expect(Onboarding::stateForCurrentUser())->toBe(Onboarding::defaultState());
    });
});

describe('Onboarding::markSeen', function () {
    test('persists under the prefixed meta key and stamps the current revision', function () {
        Onboarding::markSeen(['wizard' => true]);

        expect($this->meta[7][Config::withPrefix('onboarding')])->toBe([
            'version'     => Config::ONBOARDING_VERSION,
            'wizard'      => true,
            'adminTour'   => false,
            'editorGuide' => false,
        ]);
    });

    test('merges into existing state instead of replacing it', function () {
        Onboarding::markSeen(['wizard' => true]);
        Onboarding::markSeen(['adminTour' => true]);

        $stored = $this->meta[7][Config::withPrefix('onboarding')];

        expect($stored['wizard'])->toBeTrue();
        expect($stored['adminTour'])->toBeTrue();
        expect($stored['editorGuide'])->toBeFalse();
    });

    test('ignores keys outside the known flags', function () {
        Onboarding::markSeen(['wizard' => true, 'isAdmin' => true, 'version' => 999]);

        expect($this->meta[7][Config::withPrefix('onboarding')])
            ->toHaveKeys(['version', 'wizard', 'adminTour', 'editorGuide'])
            ->and($this->meta[7][Config::withPrefix('onboarding')])
            ->not->toHaveKey('isAdmin');

        expect($this->meta[7][Config::withPrefix('onboarding')]['version'])
            ->toBe(Config::ONBOARDING_VERSION);
    });

    test('casts flag values to booleans', function () {
        Onboarding::markSeen(['wizard' => '1', 'adminTour' => 0]);

        $stored = $this->meta[7][Config::withPrefix('onboarding')];

        expect($stored['wizard'])->toBeTrue();
        expect($stored['adminTour'])->toBeFalse();
    });

    test('bumping the revision re-shows onboarding to a user who had seen it', function () {
        Onboarding::markSeen(['wizard' => true, 'adminTour' => true, 'editorGuide' => true]);

        expect(Onboarding::stateForCurrentUser()['wizard'])->toBeTrue();

        // Simulate Config::ONBOARDING_VERSION being bumped in a later release.
        $stored            = $this->meta[7][Config::withPrefix('onboarding')];
        $stored['version'] = Config::ONBOARDING_VERSION - 1;

        $this->meta[7][Config::withPrefix('onboarding')] = $stored;

        expect(Onboarding::stateForCurrentUser()['wizard'])->toBeFalse();
    });
});
