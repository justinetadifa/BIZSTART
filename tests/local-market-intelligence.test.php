<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Support/LocalMarketIntelligenceService.php';

use App\Support\LocalMarketIntelligenceService as Market;

$cases = [];
foreach (['Barangay IV', '  barangay iv (Pob.) ', 'Madaydegdeg', 'Unknown barangay', '', 'Barangay II'] as $name) {
    $cases[$name] = Market::get(['barangay' => $name]);
}
if (in_array('--json', $argv, true)) {
    echo json_encode($cases, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    exit;
}

$checks = 0;
function checkMarket(bool $condition, string $message): void {
    global $checks;
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
}

$known = $cases['Barangay IV'];
checkMarket($known['scopes']['barangay']['population']['total'] === 611, 'Barangay IV uses its own 2020 census count.');
checkMarket($cases['  barangay iv (Pob.) ']['scopes']['barangay']['population']['total'] === 611, 'Case, whitespace and common suffixes resolve to the same record.');
checkMarket($cases['Madaydegdeg']['scopes']['barangay']['population']['total'] === 1729, 'The existing spelling alias resolves to Madayegdeg.');
foreach (['Unknown barangay', '', 'Barangay II'] as $name) {
    $scope = $cases[$name]['scopes']['barangay'];
    checkMarket($scope['population']['available'] === false && $scope['population']['total'] === null, 'An unsupported or absent barangay never receives a default count.');
    checkMarket($cases[$name]['scopes']['city']['population']['total'] === 125640, 'The separately labeled city reference remains available.');
}
checkMarket($known['scopes']['province']['population']['total'] === 822352, 'The provincial census aggregate is retained.');
checkMarket($known['scopes']['region']['population']['total'] === 5301139, 'The regional census aggregate is retained.');
foreach ($known['scopes'] as $key => $scope) {
    checkMarket(array_intersect(['employees', 'residents'], array_keys($scope['population'])) === [], 'Residents and employees are not represented as disjoint census groups.');
    foreach (['income', 'spending'] as $metric) {
        $record = $scope[$metric];
        checkMarket($record['statistic'] === 'mean' && $record['unit'] === 'PHP per family per year', 'Finances identify the statistic and denominator.');
        checkMarket($record['preliminary'] && $record['reference_year'] === 2023, 'The published preliminary reference period is explicit.');
        checkMarket($record['is_proxy'] === in_array($key, ['barangay', 'city'], true), 'Only narrower geography is marked as a provincial reference.');
        checkMarket(array_intersect(['median', 'total', 'brackets', 'categories'], array_keys($record)) === [], 'Unsupported local medians, totals and distributions are absent.');
        checkMarket(str_starts_with($record['source']['url'], 'https://'), 'Every numeric finance record has a linked source.');
    }
}
checkMarket($known['scopes']['barangay']['income']['value'] === 393220.0, 'Published income in thousands is converted to pesos.');
checkMarket($known['scopes']['barangay']['spending']['value'] === 259350.0, 'Published expenditure in thousands is converted to pesos.');
checkMarket($known['scopes']['region']['income']['value'] === 339690.0, 'Regional income is not a provincial value.');
checkMarket($known['scopes']['region']['spending']['value'] === 232440.0, 'Regional expenditure is not a provincial value.');
echo "Local market service: {$checks} checks passed.\n";
