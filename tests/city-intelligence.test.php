<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/web.php';
$container = require dirname(__DIR__) . '/app/bootstrap.php';
$pdo = $container['pdo'];

require_once dirname(__DIR__) . '/app/Support/CityIntelligenceService.php';

use App\Support\CityIntelligenceService;

$checks = 0;
function assertCheck(bool $condition, string $message): void {
    global $checks;
    if (!$condition) {
        throw new RuntimeException("Assertion Failed: " . $message);
    }
    $checks++;
}

echo "=== Running LOCUS-SF City Investment Intelligence & Reporting Tests ===\n";

$service = new CityIntelligenceService($pdo);

// --------------------------------------------------------------------------
// TEST 1: Date Range Bounds Resolution
// --------------------------------------------------------------------------
$allBounds = $service->resolveDateBounds('all');
assertCheck($allBounds['start'] === null && $allBounds['end'] === null, 'Cumulative date range has null bounds.');

$thirtyDays = $service->resolveDateBounds('30d');
assertCheck($thirtyDays['start'] instanceof DateTimeImmutable && $thirtyDays['end'] instanceof DateTimeImmutable, '30d range produces DateTimeImmutable instances.');
assertCheck($thirtyDays['start'] < $thirtyDays['end'], '30d start is strictly before end.');

$customBounds = $service->resolveDateBounds('custom', '2026-01-01', '2026-06-30');
assertCheck($customBounds['start']->format('Y-m-d') === '2026-01-01', 'Custom start date parses correctly.');
assertCheck($customBounds['end']->format('Y-m-d') === '2026-06-30', 'Custom end date parses correctly.');

// --------------------------------------------------------------------------
// TEST 2: Cumulative Baseline Data Fetch
// --------------------------------------------------------------------------
$fakeAdmin = ['id' => 1, 'role' => 'admin', 'username' => 'assessor_cao'];
$baseline = $service->getDashboardData(['date_range' => 'all'], $fakeAdmin);

assertCheck(isset($baseline['meta'], $baseline['kpi'], $baseline['inventory'], $baseline['listing_activity'], $baseline['broker_activity'], $baseline['investor_engagement'], $baseline['assessment_readiness']), 'All 5 analytical modules and meta exist in response.');

$kpi = $baseline['kpi'];
$inv = $baseline['inventory'];
$totalProps = (int) $kpi['properties_total'];

// --------------------------------------------------------------------------
// TEST 3: Zero Double-Counting Guarantee
// --------------------------------------------------------------------------
$primaryTypes = $inv['primary_types'];
$landCount = (int) ($primaryTypes['land'] ?? 0);
$bldgCount = (int) ($primaryTypes['building'] ?? 0);
$mixedCount = (int) ($primaryTypes['mixed'] ?? 0);
$primarySum = $landCount + $bldgCount + $mixedCount;

assertCheck($primarySum === $totalProps, "Zero double-counting: Primary types sum ({$primarySum}) must exactly equal total properties ({$totalProps}).");

// Ensure functional classifications are tracked separately without replacing primary type
assertCheck(isset($inv['classifications']['commercial'], $inv['classifications']['industrial'], $inv['classifications']['residential']), 'Functional classifications are reported as distinct non-additive dimensions.');

// --------------------------------------------------------------------------
// TEST 4: Listing Review Pipeline Status Parity
// --------------------------------------------------------------------------
$statusBreakdown = $baseline['listing_activity']['status_breakdown'];
$statusSum = array_sum(array_map('intval', $statusBreakdown));
assertCheck($statusSum === $totalProps, "Review status breakdown sum ({$statusSum}) must equal total properties ({$totalProps}).");

// --------------------------------------------------------------------------
// TEST 5: Assessment Completeness Parity & IAI Differentiation
// --------------------------------------------------------------------------
$assCounts = $baseline['assessment_readiness']['counts'];
$complete = (int) ($assCounts['complete_verified'] ?? 0);
$provisional = (int) ($assCounts['provisional_model'] ?? 0);
$incomplete = (int) ($assCounts['incomplete_criteria'] ?? 0);
$assSum = $complete + $provisional + $incomplete;

assertCheck($assSum === $totalProps, "Assessment readiness sum ({$assSum}) must equal total properties ({$totalProps}).");
assertCheck(isset($baseline['assessment_readiness']['clup_zoning'], $baseline['assessment_readiness']['hazard_review_flags']), 'Zoning and hazard constraints are reported.');

// --------------------------------------------------------------------------
// TEST 6: Privacy Safeguards & Absence of Sensitive PII
// --------------------------------------------------------------------------
$recentApps = $baseline['broker_activity']['recent_applications'] ?? [];
foreach ($recentApps as $app) {
    assertCheck(!isset($app['prc_id_raw']) && !isset($app['prc_license_number']) && !isset($app['tin_number']), 'Broker applications in intelligence view do not expose raw PRC credentials or sensitive tax IDs.');
    assertCheck(isset($app['applicant_name'], $app['status'], $app['created_at']), 'Sanitized broker details remain visible for review monitoring.');
}

// Ensure investor browsing identities are never exposed in engagement telemetry
assertCheck(!isset($baseline['investor_engagement']['investor_browsing_history']), 'Individual investor browsing history is not exposed.');
assertCheck(isset($baseline['investor_engagement']['telemetry_status']), 'Telemetry disclosure is explicitly documented.');

// --------------------------------------------------------------------------
// TEST 7: Filtering Precision (Barangay, Typology, Status)
// --------------------------------------------------------------------------
// Test Barangay Filter
$sevillaData = $service->getDashboardData(['barangay' => 'Sevilla', 'date_range' => 'all'], $fakeAdmin);
$sevillaTotal = (int) $sevillaData['kpi']['properties_total'];
$sevillaPrimary = (int) $sevillaData['inventory']['primary_types']['land'] + (int) $sevillaData['inventory']['primary_types']['building'] + (int) $sevillaData['inventory']['primary_types']['mixed'];
assertCheck($sevillaPrimary === $sevillaTotal, "Barangay Sevilla filtered primary typologies sum ({$sevillaPrimary}) matches filtered total ({$sevillaTotal}).");

// Test Land Typology Filter
$landOnlyData = $service->getDashboardData(['property_type' => 'land', 'date_range' => 'all'], $fakeAdmin);
$landOnlyTotal = (int) $landOnlyData['kpi']['properties_total'];
assertCheck((int) $landOnlyData['inventory']['primary_types']['building'] === 0, 'Building count is strictly 0 when property_type=land is applied.');
assertCheck((int) $landOnlyData['inventory']['primary_types']['land'] === $landOnlyTotal, 'All properties match land type when filtered.');

// Test Status Filter
$publishedOnlyData = $service->getDashboardData(['status' => 'published', 'date_range' => 'all'], $fakeAdmin);
$publishedTotal = (int) $publishedOnlyData['kpi']['properties_total'];
assertCheck($publishedTotal === (int) $baseline['kpi']['properties_published'], 'Published filter count matches baseline published count.');

// --------------------------------------------------------------------------
// TEST 8: Mandatory Disclaimer & Governance Verification
// --------------------------------------------------------------------------
$mandatoryFooter = 'Generated by LOCUS-SF | For planning and information purposes | Subject to data completeness and verification';

$phpContent = file_get_contents(dirname(__DIR__) . '/city-intelligence.php');
assertCheck(str_contains($phpContent, $mandatoryFooter), 'city-intelligence.php strictly includes the mandatory disclaimer footer text.');

$jsContent = file_get_contents(dirname(__DIR__) . '/assets/js/city-intelligence.js');
assertCheck(str_contains($jsContent, $mandatoryFooter), 'assets/js/city-intelligence.js strictly embeds the mandatory disclaimer footer in report exports.');

// --------------------------------------------------------------------------
// TEST 9: Navigation & Workspace Integration
// --------------------------------------------------------------------------
$shellContent = file_get_contents(dirname(__DIR__) . '/app/Support/CityShell.php');
assertCheck(str_contains($shellContent, '/city-intelligence.php'), 'CityShell.php includes navigation entry for city-intelligence.php.');

$adminDashboardContent = file_get_contents(dirname(__DIR__) . '/admin-dashboard.php');
assertCheck(str_contains($adminDashboardContent, '/city-intelligence.php'), 'admin-dashboard.php contains quick link to City Intelligence & Reports.');

// --------------------------------------------------------------------------
// TEST 10: API Security Check
// --------------------------------------------------------------------------
$apiFile = dirname(__DIR__) . '/api/city-intelligence.php';
assertCheck(file_exists($apiFile), 'api/city-intelligence.php endpoint exists.');
$apiContent = file_get_contents($apiFile);
assertCheck(str_contains($apiContent, "'admin'"), 'api/city-intelligence.php strictly restricts access to admin role.');

echo "City Intelligence Test Suite: ALL {$checks} CHECKS PASSED!\n";
