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
        $csrfToken = sfc_csrf_token();

        $range = $details['permitted_weight_range'] ?? ['min' => 5.0, 'max' => 60.0];
        $currentCriteria = [];
        foreach ($details['criteria'] as $code => $crit) {
            if (empty($crit['is_active'])) {
                continue;
            }
            $currentCriteria[$code] = [
                'code' => $code,
                'label' => $crit['name'] ?? $code,
                'required' => (bool) ($crit['is_required'] ?? false),
                'basis' => $crit['description'] ?? ($crit['source_reference'] ?? ''),
                'rangeMin' => (float) ($range['min'] ?? 5.0),
                'rangeMax' => (float) ($range['max'] ?? 60.0),
                'weightPercent' => (float) ($crit['weight'] ?? 0.0),
            ];
        }

        $discrepancyText = is_array($details['discrepancy'] ?? null)
            ? ($details['discrepancy']['rationale'] ?? '')
            : (string) ($details['discrepancy'] ?? '');

        $frontendDetails = [
            'version' => $details['current_version'] ?? 'LOCUS-SF-MCE-v3.0-Baseline',
            'current' => $currentCriteria,
            'baseline' => $details['baseline_weights'] ?? PropertyAssessmentService::baselineWeights(),
            'documentedSixCriterion' => $details['documented_six_criterion_weights'] ?? PropertyAssessmentService::documentedSixCriterionWeights(),
            'discrepancy' => $discrepancyText,
            'discrepancyDetails' => $details['discrepancy'] ?? null,
            'history' => $details['history'] ?? [],
            'permittedRange' => $range,
            'csrfToken' => $csrfToken,
            'csrf_token' => $csrfToken,
        ];

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
                'details' => $frontendDetails,
                'configuration' => $details,
                'csrfToken' => $csrfToken,
                'csrf_token' => $csrfToken,
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

            // Compute standard comparative profiles for simulation preview
            $sampleProfiles = [
                [
                    'profile' => 'Highway Commercial Corridor (MacArthur / Quezon Ave)',
                    'scores' => [
                        'spatial_accessibility' => 95.0,
                        'infrastructure_readiness' => 90.0,
                        'property_cost_market_competitiveness' => 75.0,
                        'nearby_businesses' => 85.0,
                        'risk_constraints' => 80.0,
                    ],
                ],
                [
                    'profile' => 'Downtown Urban Core (Poblacion Heritage & Trade)',
                    'scores' => [
                        'spatial_accessibility' => 85.0,
                        'infrastructure_readiness' => 95.0,
                        'property_cost_market_competitiveness' => 65.0,
                        'nearby_businesses' => 95.0,
                        'risk_constraints' => 90.0,
                    ],
                ],
                [
                    'profile' => 'Emerging Growth Corridor (Bypass / Diversion Road)',
                    'scores' => [
                        'spatial_accessibility' => 90.0,
                        'infrastructure_readiness' => 70.0,
                        'property_cost_market_competitiveness' => 90.0,
                        'nearby_businesses' => 60.0,
                        'risk_constraints' => 85.0,
                    ],
                ],
                [
                    'profile' => 'High Hazard Susceptibility / Riverine Fringe',
                    'scores' => [
                        'spatial_accessibility' => 70.0,
                        'infrastructure_readiness' => 65.0,
                        'property_cost_market_competitiveness' => 85.0,
                        'nearby_businesses' => 50.0,
                        'risk_constraints' => 45.0,
                    ],
                ],
            ];

            $simulations = [];
            $baselineWeights = PropertyAssessmentService::baselineWeights();
            foreach ($sampleProfiles as $sp) {
                $baseSum = 0.0;
                $propSum = 0.0;
                foreach ($preview['active_weights'] as $cKey => $propW) {
                    $cScore = (float) ($sp['scores'][$cKey] ?? 75.0);
                    $baseW = (float) ($baselineWeights[$cKey] ?? 0.0);
                    $baseSum += ($cScore * $baseW / 100.0);
                    $propSum += ($cScore * $propW / 100.0);
                }
                $simulations[] = [
                    'profile' => $sp['profile'],
                    'baselineScore' => round($baseSum, 1),
                    'proposedScore' => round($propSum, 1),
                    'delta' => round(round($propSum, 1) - round($baseSum, 1), 1),
                ];
            }

            $preview['version'] = 'Proposed MCE Configuration (' . count($preview['criteria_rows']) . ' Active Criteria)';
            $preview['simulations'] = $simulations;

            return [200, ['ok' => true, 'preview' => $preview]];
        }

        if ($action === 'apply') {
            if (!sfc_can_configure_mce_weights($user)) {
                return [403, ['ok' => false, 'error' => 'Unauthorized. Only explicitly authorized CICTO technical administrators may apply MCE weight modifications.']];
            }

            $weights = is_array($input['weights'] ?? null) ? $input['weights'] : [];
            $reason = trim((string) ($input['reason'] ?? ''));
            $sourceReference = trim((string) ($input['source_reference'] ?? ($input['reference'] ?? '')));
            if ($sourceReference === '') {
                $sourceReference = 'City Technical Committee (CSFP MCE-CFG Authorized Adjustment)';
            }

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
