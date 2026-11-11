<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Repositories/ProjectProfileRepository.php';
require_once dirname(__DIR__) . '/app/Support/V2PropertyAssessmentService.php';

use App\Repositories\ProjectProfileRepository;
use App\Support\V2PropertyAssessmentService;

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();
    $repo = new ProjectProfileRepository($container['pdo']);

    if ($method === 'GET') {
        if ($user === null) {
            // Guest preview preset profile
            return [
                'profiles' => [],
                'active_profile' => V2PropertyAssessmentService::defaultProjectProfile(),
                'is_guest' => true,
            ];
        }

        $userId = (int) $user['id'];
        $id = int_or_null($_GET['id'] ?? null);
        if ($id !== null) {
            $profile = $repo->find($id, $userId);
            if (!$profile) {
                return [404, ['error' => 'Project profile not found.']];
            }
            return ['profile' => $profile];
        }

        $profiles = $repo->listByUser($userId);
        $active = $repo->getDefault($userId) ?? V2PropertyAssessmentService::defaultProjectProfile();

        return [
            'profiles' => $profiles,
            'active_profile' => $active,
            'is_guest' => false,
        ];
    }

    // Write operations require authentication
    if ($user === null) {
        return [401, ['error' => 'Sign in to manage your investor project profiles.']];
    }

    $userId = (int) $user['id'];
    $input = read_request_input();

    if ($method === 'POST') {
        $action = $input['action'] ?? 'create';

        if ($action === 'set_default') {
            $id = int_or_null($input['id'] ?? null);
            if ($id === null) throw new InvalidArgumentException('Profile ID is required.');
            $ok = $repo->setDefault($id, $userId);
            return ['success' => $ok, 'active_profile' => $repo->find($id, $userId)];
        }

        $profile = $repo->create($userId, $input);
        return ['profile' => $profile, 'message' => 'Project profile created successfully.'];
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $id = int_or_null($input['id'] ?? ($_GET['id'] ?? null));
        if ($id === null) throw new InvalidArgumentException('Profile ID is required.');

        $profile = $repo->update($id, $userId, $input);
        return ['profile' => $profile, 'message' => 'Project profile updated successfully.'];
    }

    if ($method === 'DELETE') {
        $id = int_or_null($input['id'] ?? ($_GET['id'] ?? null));
        if ($id === null) throw new InvalidArgumentException('Profile ID is required.');

        $deleted = $repo->delete($id, $userId);
        if (!$deleted) {
            return [404, ['error' => 'Project profile not found.']];
        }
        return ['success' => true, 'message' => 'Project profile deleted.'];
    }

    return [405, ['error' => 'Method not allowed.']];
});

