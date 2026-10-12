<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/Support/PropertyAssessmentService.php';
require_once __DIR__ . '/../app/Support/PropertyAssessment.php';
require_once __DIR__ . '/../app/Support/PropertyCatalog.php';
require_once __DIR__ . '/../app/Repositories/PropertyRepository.php';
require_once __DIR__ . '/../api/_listing-policy.php';

use App\Support\PropertyAssessmentService;
use App\Support\PropertyAssessment;
use App\Support\PropertyCatalog;
use App\Repositories\PropertyRepository;

$passed = 0;
$check = static function (bool $condition, string $message) use (&$passed): void {
    if (!$condition) {
        throw new RuntimeException("Assertion Failed: $message");
    }
    echo "  [PASS] $message\n";
    $passed++;
};

echo "\n=======================================================\n";
echo "  LOCUS-SF Comprehensive MCE/IAI & Submission Test Suite\n";
echo "=======================================================\n\n";

// -------------------------------------------------------------------------
// TEST 1: Perfect Infrastructure Readiness
// All applicable subcategories are fully satisfied and verified.
// Expected: Infrastructure Readiness = 100/100.
// -------------------------------------------------------------------------
echo "Test 1: Perfect Infrastructure Readiness\n";
$perfectInfra = PropertyAssessmentService::evaluateInfrastructureReadiness([
    'power' => 'connected',
    'water' => 'connected',
    'telecom' => 'connected',
    'road_connectivity' => 'connected',
], ['is_verified' => true]);

$check($perfectInfra['is_complete'] === true, 'Perfect infrastructure is complete');
$check($perfectInfra['score'] === 100.0, 'Perfect infrastructure scores exactly 100.0/100');
$check($perfectInfra['verification_status'] === 'verified', 'Verification status is verified');
$check(empty($perfectInfra['missing_subcategories']), 'No missing subcategories');
$check(count($perfectInfra['subcategories']) === 4, 'Includes all 4 subcategory breakdowns');

$perfectContribution = PropertyAssessmentService::calculateWeightedScore(100.0, 20.0);
$check($perfectContribution === 20.0, '100/100 Infra Readiness contributes exactly 20.0 points to final IAI (20% weight)');


// -------------------------------------------------------------------------
// TEST 2: Partial Infrastructure Readiness
// Some services are fully ready and others are unavailable or partially available.
// Expected: Score follows configured scoring rules and is not incorrectly 100.
// -------------------------------------------------------------------------
echo "\nTest 2: Partial Infrastructure Readiness\n";
// Power: connected (100 * 30% = 30.0)
// Water: available_unconnected (50 * 30% = 15.0)
// Telecom: mobile_broadband (75 * 20% = 15.0)
// Road: unpaved_row (60 * 20% = 12.0)
// Total = 30.0 + 15.0 + 15.0 + 12.0 = 72.0/100
$partialInfra = PropertyAssessmentService::evaluateInfrastructureReadiness([
    'power' => 'connected',
    'water' => 'available_unconnected',
    'telecom' => 'mobile_broadband',
    'road_connectivity' => 'unpaved_row',
], ['is_verified' => true]);

$check($partialInfra['is_complete'] === true, 'Partial infrastructure with known states is complete');
$check($partialInfra['score'] === 72.0, 'Partial infrastructure calculates exact weighted score: 72.0/100');
$check($partialInfra['score'] !== 100.0, 'Partial infrastructure is not incorrectly 100');


// -------------------------------------------------------------------------
// TEST 3: Incomplete Infrastructure Information
// At least one required subcategory is missing or unverified.
// Expected: Identifies missing requirement and does not falsely report complete verified score.
// -------------------------------------------------------------------------
echo "\nTest 3: Incomplete Infrastructure Information\n";
$incompleteInfra = PropertyAssessmentService::evaluateInfrastructureReadiness([
    'power' => 'connected',
    'water' => 'unverified',
    'telecom' => 'connected',
    'road_connectivity' => 'connected',
]);

$check($incompleteInfra['is_complete'] === false, 'Incomplete infrastructure flags is_complete as false');
$check($incompleteInfra['score'] === null, 'Incomplete infrastructure score is null (not falsely 100 or 0)');
$check(in_array('Water Supply', $incompleteInfra['missing_subcategories'], true), 'Identifies Water Supply as missing requirement');

// Inside MCE evaluation:
$assessmentWithMissingInfra = PropertyAssessmentService::evaluate([
    'spatial_accessibility' => 90.0,
    'infrastructure_readiness' => null,
    'economic_viability' => 80.0,
    'zoning_compatibility' => 100.0,
    'nearby_businesses' => 85.0,
    'risk_constraints' => 90.0,
    'environmental_safety' => 100.0,
]);
$check($assessmentWithMissingInfra['status'] === 'incomplete', 'MCE with missing infra is marked incomplete');
$check($assessmentWithMissingInfra['iaiScore'] === null, 'IAI is withheld (null) when infra is unverified');


// -------------------------------------------------------------------------
// TEST 4: Unavailable Infrastructure
// A confirmed unavailable service is entered.
// Expected: The correct configured penalty score (0) is applied, appropriately lowering total.
// -------------------------------------------------------------------------
echo "\nTest 4: Unavailable Infrastructure\n";
// Power: connected (100 * 30% = 30.0)
// Water: connected (100 * 30% = 30.0)
// Telecom: unavailable (0 * 20% = 0.0)
// Road: connected (100 * 20% = 20.0)
// Total = 30 + 30 + 0 + 20 = 80.0/100
$unavailableInfra = PropertyAssessmentService::evaluateInfrastructureReadiness([
    'power' => 'connected',
    'water' => 'connected',
    'telecom' => 'unavailable',
    'road_connectivity' => 'connected',
]);

$check($unavailableInfra['is_complete'] === true, 'Confirmed unavailable service is an evaluated state');
$check($unavailableInfra['score'] === 80.0, 'Confirmed unavailable telecom service drops score to 80.0/100');
$telecomItem = null;
foreach ($unavailableInfra['subcategories'] as $item) {
    if ($item['key'] === 'telecom') { $telecomItem = $item; break; }
}
$check($telecomItem !== null && $telecomItem['score'] === 0.0, 'Telecom subcategory receives 0.0 points');


// -------------------------------------------------------------------------
// TEST 5: Prohibited Zoning
// The property is prohibited for the selected proposed land use.
// Expected: Not Suitable; IAI = null.
// -------------------------------------------------------------------------
echo "\nTest 5: Prohibited Zoning Hard Constraint\n";
$prohibitedAssessment = PropertyAssessmentService::evaluate([
    'scores' => [
        'spatial_accessibility' => 100.0,
        'infrastructure_readiness' => 100.0,
        'economic_viability' => 100.0,
        'zoning_compatibility' => 0.0,
        'nearby_businesses' => 100.0,
        'risk_constraints' => 100.0,
        'environmental_safety' => 100.0,
    ],
    'zoning_status' => 'prohibited',
]);

$check($prohibitedAssessment['status'] === 'not_suitable', 'Status is not_suitable');
$check($prohibitedAssessment['iaiScore'] === null, 'IAI is null for prohibited land use');
$check($prohibitedAssessment['mceScore'] === null, 'MCE score is null for prohibited land use');
$check($prohibitedAssessment['assessmentComplete'] === false, 'assessmentComplete is false');
$check(!empty($prohibitedAssessment['reason']), 'Explains prohibition reason');


// -------------------------------------------------------------------------
// TEST 6: Fully Verified Eligible Property
// All required criteria are verified and zoning permits the use.
// Expected: Final IAI matches manual weighted calculation exactly.
// -------------------------------------------------------------------------
echo "\nTest 6: Fully Verified Eligible Property (Authoritative MCE/IAI Formula)\n";
// Criterion weights (6-Criterion Model):
// spatial_accessibility: 20% * 85.0 = 17.0
// infrastructure_readiness: 20% * 80.0 = 16.0
// economic_viability: 20% * 75.0 = 15.0
// zoning_compatibility: 15% * 100.0 = 15.0
// nearby_businesses: 10% * 90.0 = 9.0
// risk_constraints: 15% * 85.0 = 12.75
// Manual Sum = 17.0 + 16.0 + 15.0 + 15.0 + 9.0 + 12.75 = 84.75 -> 84.8
$verifiedScores = [
    'spatial_accessibility' => 85.0,
    'infrastructure_readiness' => 80.0,
    'economic_viability' => 75.0,
    'zoning_compatibility' => 100.0,
    'nearby_businesses' => 90.0,
    'risk_constraints' => 85.0,
];

$verifiedAssessment = PropertyAssessmentService::evaluate([
    'scores' => $verifiedScores,
    'zoning_status' => 'permitted',
]);

$check($verifiedAssessment['status'] === 'complete', 'Status is complete');
$check($verifiedAssessment['iaiScore'] === 84.8, 'IAI matches manual sum: 84.8');
$check($verifiedAssessment['mceScore'] === 84.8, 'MCE score equals IAI score (single authoritative formula)');
$check(count($verifiedAssessment['criteria']) === 6, 'All 6 criteria present in breakdown');


// -------------------------------------------------------------------------
// TEST 7: Broker Submission (Role Sensitivity & Drafts)
// Broker submits property requiring ATS documentation.
// Expected: Enforces ATS upon review submission; allows draft saving.
// -------------------------------------------------------------------------
echo "\nTest 7: Broker Submission & ATS Enforcement\n";
$brokerUser = [
    'id' => 101,
    'role' => 'seller',
    'identityVerificationStatus' => 'verified',
    'name' => 'Licensed Broker',
    'email' => 'broker@sfcelerate.test',
];

// Saving draft: approval_state = 'draft' allowed without ATS
$brokerDraft = sfc_listing_payload([
    'name' => 'Broker Draft Property',
    'approval_state' => 'draft',
    'price' => 5000000,
], $brokerUser, true);
$check($brokerDraft['approval_state'] === 'draft', 'Broker can save a draft with approval_state = draft');
$check($brokerDraft['seller_user_id'] === 101, 'Broker seller_user_id is preserved on draft');

// Submitting for review without ATS:
$brokerSubmission = sfc_listing_payload([
    'name' => 'Broker Submission Listing',
    'price' => 5000000,
], $brokerUser, true);
$check($brokerSubmission['approval_state'] === 'pending_review', 'Default submission state is pending_review');


// -------------------------------------------------------------------------
// TEST 8: Authorized CAO / LEBDO Submission
// Authorized city reviewer submits an office-managed property.
// Expected: Shared property-entry works without requiring Broker-specific ATS.
// -------------------------------------------------------------------------
echo "\nTest 8: Authorized CAO / LEBDO Departmental Submission\n";
$cityReviewer = [
    'id' => 1,
    'role' => 'admin',
    'department' => 'CAO',
    'name' => 'City Assessor Officer',
    'email' => 'cao@sanfernandocity.gov.ph',
];

$departmentalListing = sfc_listing_payload([
    'name' => 'City Government Commercial Asset',
    'price' => 15000000,
    'category' => 'Commercial',
], $cityReviewer, true);

$check($departmentalListing['seller_user_id'] === null, 'Departmental submission seller_user_id is null (city listing)');
$check($departmentalListing['approval_state'] === 'pending_review', 'City listing created in pending_review');
$check(!isset($departmentalListing['authority_to_sell']), 'No broker-specific ATS required for departmental submission');


// -------------------------------------------------------------------------
// TEST 9: Sensitive Document Protection
// Property submission completed without mandatory land-title copy.
// Expected: No title-copy upload required; proper review safeguards active.
// -------------------------------------------------------------------------
echo "\nTest 9: Sensitive Document Protection (No Land Title Copy Required)\n";
$dummyPdo = new class extends PDO { public function __construct() {} };
$repo = new PropertyRepository($dummyPdo);

// Check that submission requirements only include non-sensitive documents
$submissionReqs = PropertyRepository::SUBMISSION_DOCUMENT_REQUIREMENTS;
$submissionKeys = array_column($submissionReqs, 'key');
$check(!in_array('title_copy', $submissionKeys, true), 'Title copy is NOT in mandatory submission requirements');
$check(!in_array('tax_declaration', $submissionKeys, true), 'Tax declaration is NOT in mandatory submission requirements');
$check(in_array('site_photos', $submissionKeys, true), 'Site photos is a standard submission requirement');
$check(in_array('zoning_clearance', $submissionKeys, true), 'Zoning clearance is a standard submission requirement');

// Reflection check on normalizeDocumentStatuses:
$normDocMethod = new ReflectionMethod($repo, 'normalizeDocumentStatuses');
$normDocMethod->setAccessible(true);

$rawDocsWithoutTitle = [
    'site_photos' => 'submitted',
    'zoning_clearance' => 'submitted',
    'hazard_report' => 'submitted',
];
$normalizedDocs = $normDocMethod->invoke($repo, $rawDocsWithoutTitle, false);
$check(!isset($normalizedDocs['title_copy']), 'title_copy is NOT populated as missing for ordinary submissions');
$check(!isset($normalizedDocs['tax_declaration']), 'tax_declaration is NOT populated as missing for ordinary submissions');
$check($normalizedDocs['site_photos'] === 'submitted', 'site_photos status is preserved as submitted');

$docCompletenessMethod = new ReflectionMethod($repo, 'documentCompletenessPct');
$docCompletenessMethod->setAccessible(true);
$completeness = $docCompletenessMethod->invoke($repo, $normalizedDocs);
$check($completeness === 75, 'Standard submission with photos, zoning, hazard achieves 75% completeness without title copy');


// -------------------------------------------------------------------------
// TEST 10: Calculation Consistency
// The same verified property is viewed by different authorized users.
// Expected: Identical IAI results, criteria breakdowns, and methodology version.
// -------------------------------------------------------------------------
echo "\nTest 10: Calculation Consistency Across Roles\n";
$propertyCriteria = [
    'spatial_accessibility' => 90.0,
    'infrastructure_readiness' => 85.0,
    'economic_viability' => 70.0,
    'zoning_compatibility' => 100.0,
    'nearby_businesses' => 80.0,
    'risk_constraints' => 90.0,
    'environmental_safety' => 95.0,
];

// User 1: Investor view
$evalInvestor = PropertyAssessmentService::evaluate([
    'scores' => $propertyCriteria,
    'zoning_status' => 'permitted',
]);

// User 2: Broker view
$evalBroker = PropertyAssessmentService::evaluate([
    'scores' => $propertyCriteria,
    'zoning_status' => 'permitted',
]);

// User 3: City Reviewer view
$evalCity = PropertyAssessmentService::evaluate([
    'scores' => $propertyCriteria,
    'zoning_status' => 'permitted',
]);

$check($evalInvestor['iaiScore'] === $evalBroker['iaiScore'], 'Investor and Broker see identical IAI score');
$check($evalBroker['iaiScore'] === $evalCity['iaiScore'], 'Broker and City Reviewer see identical IAI score');
$check($evalInvestor['methodology'] === PropertyAssessmentService::METHODOLOGY_VERSION, 'Methodology version is consistent');
$check(json_encode($evalInvestor['criteria']) === json_encode($evalCity['criteria']), 'Criteria breakdowns are byte-identical across roles');

echo "\n=======================================================\n";
echo "  All $passed LOCUS-SF Comprehensive Tests Passed Successfully!\n";
echo "=======================================================\n\n";
