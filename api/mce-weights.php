<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use App\Support\PropertyAssessmentService;

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();

    if ($method === 'GET') {
        if ($user === null || (!sfc_can_manage_properties($user) && ($user['role'] ?? '') !== 'admin')) {
            return [403, ['ok' => false, 'error' => 'City staff authorization is required to view MCE weight configuration details.']];
        }

        $details = PropertyAssessmentService::getWeightConfigurationDetails($container['pdo'] ?? null);
        return [
            200,
            [
                'ok' => true,
                'can_configure' => sfc_can_configure_mce_weights($user),
                'user' => [
                    'id' => (int) ($user['id'] ?? 0),
                    'name' => (string) ($user['name'] ?? ''),
                    'role' => (string) ($user['role'] ?? ''),
                    'department' => sfc_admin_department($user),
                ],
                'configuration' => $details,
            ]
        ];
    }

    if ($method !== 'POST') {
        return [405, ['ok' => false, 'error' => 'Method not allowed.']];
    }

    if ($user === null) {
        return [401, ['ok' => false, 'error' => 'Authentication required.']];
    }

    if (!sfc_verify_csrf_request()) {
        return [419, ['ok' => false, 'error' => 'CSRF security token expired. Please refresh the page and try again.']];
    }

    $input = read_json_input();
    $action = (string) ($input['action'] ?? 'preview');

    try {
        if ($action === 'preview') {
            if (!sfc_can_manage_properties($user)) {
                return [403, ['ok' => false, 'error' => 'City staff authorization is required to preview MCE weight configurations.']];
            }

            $weights = is_array($input['weights'] ?? null) ? $input['weights'] : [];
            $sampleScores = is_array($input['sample_scores'] ?? null) ? $input['sample_scores'] : null;

            $preview = PropertyAssessmentService::previewWeights($weights, $sampleScores);
            return [200, ['ok' => true, 'preview' => $preview]];
        }

        if ($action === 'apply') {
            if (!sfc_can_configure_mce_weights($user)) {
                return [403, ['ok' => false, 'error' => 'Unauthorized. Only explicitly authorized CICTO technical administrators may apply MCE weight modifications.']];
            }

            $weights = is_array($input['weights'] ?? null) ? $input['weights'] : [];
            $reason = (string) ($input['reason'] ?? '');
            $sourceReference = (string) ($input['source_reference'] ?? '');

            $result = PropertyAssessmentService::applyWeights(
                $weights,
                $reason,
                $sourceReference,
                $user,
                $container['pdo'] ?? null
            );

            return [200, $result];
        }

        if ($action === 'restore_baseline') {
            if (!sfc_can_configure_mce_weights($user)) {
                return [403, ['ok' => false, 'error' => 'Unauthorized. Only explicitly authorized CICTO technical administrators may restore baseline weights.']];
            }

            $reason = (string) ($input['reason'] ?? 'Restored approved LOCUS-SF v3.0 baseline weights');
            $result = PropertyAssessmentService::restoreBaseline($reason, $user, $container['pdo'] ?? null);

            return [200, $result];
        }

        if ($action === 'recalculate_property') {
            if (!sfc_can_manage_properties($user)) {
                return [403, ['ok' => false, 'error' => 'Unauthorized. City property management authorization is required to recalculate assessments.']];
            }

            $propertyId = (int) ($input['property_id'] ?? 0);
            if ($propertyId <= 0) {
                return [400, ['ok' => false, 'error' => 'A valid property ID is required.']];
            }

            $result = PropertyAssessmentService::recalculatePropertyAssessment(
                $propertyId,
                $user,
                $container['pdo'] ?? null
            );

            return [200, $result];
        }

        return [400, ['ok' => false, 'error' => "Unknown action '{$action}'."]];
    } catch (DomainException | InvalidArgumentException $e) {
        return [400, ['ok' => false, 'error' => $e->getMessage()]];
    } catch (Throwable $e) {
        return [500, ['ok' => false, 'error' => 'An internal server error occurred while processing MCE weights.', 'detail' => $e->getMessage()]];
    }
});
