<?php

use Brain\Monkey\Functions;
use IconIndexa\Config;
use IconIndexa\Deps\BitApps\WPKit\Http\Request\Request;
use IconIndexa\Deps\BitApps\WPKit\Http\Response;
use IconIndexa\HTTP\Controllers\OnboardingController;

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

/**
 * The controller reads every known flag off the request, so a mock has to answer for all
 * of them. Absent flags are represented by null.
 */
function onboardingRequest(array $flags)
{
    $request = Mockery::mock(Request::class);

    foreach (['wizard', 'adminTour', 'editorGuide'] as $flag) {
        $request->shouldReceive('get')
            ->with($flag)
            ->andReturn($flags[$flag] ?? null);
    }

    return $request;
}

describe('OnboardingController::update', function () {
    test('persists a dismissed wizard for the current user', function () {
        $controller = new OnboardingController();
        $controller->update(onboardingRequest(['wizard' => true]));

        expect($this->meta[7][Config::withPrefix('onboarding')]['wizard'])->toBeTrue();
        expect(Response::getStatus())->toBe(Response::SUCCESS);
    });

    test('returns the resulting state so the client can stay in sync', function () {
        $controller = new OnboardingController();
        $controller->update(onboardingRequest(['editorGuide' => true]));

        expect(Response::getData())->toBe([
            'version'     => Config::ONBOARDING_VERSION,
            'wizard'      => false,
            'adminTour'   => false,
            'editorGuide' => true,
        ]);
    });

    test('accepts the string booleans a form-encoded body produces', function () {
        $controller = new OnboardingController();
        $controller->update(onboardingRequest(['wizard' => 'true', 'adminTour' => 'false']));

        $stored = $this->meta[7][Config::withPrefix('onboarding')];

        expect($stored['wizard'])->toBeTrue();
        expect($stored['adminTour'])->toBeFalse();
    });

    test('treats "0" as false rather than a truthy non-empty string', function () {
        $controller = new OnboardingController();
        $controller->update(onboardingRequest(['wizard' => '0']));

        expect($this->meta[7][Config::withPrefix('onboarding')]['wizard'])->toBeFalse();
    });

    test('leaves untouched flags alone', function () {
        $controller = new OnboardingController();
        $controller->update(onboardingRequest(['wizard' => true]));
        $controller->update(onboardingRequest(['adminTour' => true]));

        $stored = $this->meta[7][Config::withPrefix('onboarding')];

        expect($stored['wizard'])->toBeTrue();
        expect($stored['adminTour'])->toBeTrue();
        expect($stored['editorGuide'])->toBeFalse();
    });

    test('rejects a request that names no known flag', function () {
        $controller = new OnboardingController();
        $controller->update(onboardingRequest([]));

        expect(Response::getStatus())->toBe(Response::ERROR);
        expect(Response::getHttpStatusCode())->toBe(400);
        expect($this->meta)->toBe([]);
    });
});
