<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/V2PropertyAssessmentService.php';
require_once dirname(__DIR__) . '/app/Repositories/ProjectProfileRepository.php';

use App\Support\V2PropertyAssessmentService;
use App\Repositories\ProjectProfileRepository;

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();
    $pdo = $container['pdo'];

    if ($method === 'GET') {
        $propertyId = int_or_null($_GET['id'] ?? ($_GET['property_id'] ?? null));
        if ($propertyId === null || $propertyId < 1) {
            throw new InvalidArgumentException('A valid property ID is required.');
        }

        $property = $container['properties']->find($propertyId, $user);

        // Resolve Project Profile
        $profile = null;
        $profileRepo = new ProjectProfileRepository($pdo);
        $profileId = int_or_null($_GET['profile_id'] ?? null);

        if ($profileId !== null && $user !== null) {
            $profile = $profileRepo->find($profileId, (int) $user['id']);
        } elseif ($user !== null && ($user['role'] ?? '') === 'investor') {
            $profile = $profileRepo->getDefault((int) $user['id']);
        }

        // Allow query override for business scenario testing
        if (isset($_GET['intended_business']) && is_string($_GET['intended_business'])) {
            $customBusiness = trim($_GET['intended_business']);
            if ($customBusiness !== '') {
                $profile = $profile ? array_merge($profile, ['intended_business' => $customBusiness]) : ['intended_business' => $customBusiness];
            }
        }
        if (isset($_GET['transaction_type']) && in_array(strtolower($_GET['transaction_type']), ['buy', 'lease'], true)) {
            $profile = $profile ? array_merge($profile, ['transaction_type' => strtolower($_GET['transaction_type'])]) : ['transaction_type' => strtolower($_GET['transaction_type'])];
        }
        if (isset($_GET['total_setup_budget']) && is_numeric($_GET['total_setup_budget'])) {
            $profile = $profile ? array_merge($profile, ['total_setup_budget' => (float) $_GET['total_setup_budget']]) : ['total_setup_budget' => (float) $_GET['total_setup_budget']];
        }
        if (isset($_GET['required_usable_area']) && is_numeric($_GET['required_usable_area'])) {
            $profile = $profile ? array_merge($profile, ['required_usable_area' => (float) $_GET['required_usable_area']]) : ['required_usable_area' => (float) $_GET['required_usable_area']];
        }

        // Scenario config
        $scenarioConfig = null;
        $scenarioKey = string_or_null($_GET['scenario_key'] ?? null);
        if ($scenarioKey !== null) {
            $stmt = $pdo->prepare('SELECT * FROM v2_scoring_configurations WHERE scenario_key = :k AND is_active = 1');
            $stmt->execute(['k' => $scenarioKey]);
            $scenarioConfig = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        $evaluation = V2PropertyAssessmentService::evaluate($property, $profile, $scenarioConfig, $pdo);

        return [
            'property_id' => $propertyId,
            'assessment' => $evaluation,
            'structured_facts' => $property['structured_facts'] ?? \App\Support\V2StructuredFacts::generateBaselineFacts($property),
            'profile' => $evaluation['profile_applied'],
            'historical_v1' => [
                'score' => $property['score'] ?? null,
                'mce_score' => $property['mceScore'] ?? null,
                'iai_score' => $property['iaiScore'] ?? null,
                'assessment_status' => $property['assessmentStatus'] ?? null,
                'assessment_version' => $property['assessmentVersion'] ?? 'v1.0',
            ],
        ];
    }

    if ($method === 'POST' || $method === 'PUT') {
        if ($user === null) {
            return [401, ['error' => 'Sign in to record or verify property evaluation facts.']];
        }

        $input = read_request_input();
        $propertyId = int_or_null($input['property_id'] ?? ($_GET['id'] ?? null));
        if ($propertyId === null || $propertyId < 1) {
            throw new InvalidArgumentException('A valid property ID is required.');
        }

        $factsUpdate = $input['structured_facts'] ?? ($input['facts'] ?? []);
        if (!is_array($factsUpdate)) {
            throw new InvalidArgumentException('Structured facts object is required.');
        }

        $result = V2PropertyAssessmentService::updatePropertyStructuredFacts($propertyId, $factsUpdate, $user, $pdo);

        return [
            'success' => true,
            'property_id' => $propertyId,
            'evaluation' => $result['evaluation'],
            'structured_facts' => $result['structured_facts'],
            'message' => ($user['role'] ?? '') === 'seller'
                ? 'Structured facts submitted for city technical verification.'
                : 'Technical verification and evidence records updated successfully.',
        ];
    }

    return [405, ['error' => 'Method not allowed.']];
});

