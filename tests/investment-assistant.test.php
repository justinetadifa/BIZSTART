<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/InvestmentAssistant.php';

use App\Support\InvestmentAssistant as Assistant;
use App\Support\InvestmentSearch as Search;

$checks = 0;
$check = static function (bool $condition, string $label) use (&$checks): void {
    if (!$condition) throw new RuntimeException($label);
    $checks++;
};
$state = Assistant::initial();
$state = Assistant::interpret($state, ['message' => 'I want to open a café']);
$check($state['criteria']['activity'] === 'Café' && $state['criteria']['category'] === null, 'Business intention does not fabricate classification');
$check($state['pending'] === 'propertyType' && substr_count($state['question'], '?') === 1, 'One useful follow-up');
$state = Assistant::interpret($state, ['message' => 'a commercial lot for sale']);
$check($state['criteria']['activity'] === 'Café' && $state['criteria']['subcategory'] === 'Commercial Lot', 'Activity and context persist');
$state = Assistant::interpret($state, ['message' => 'PHP 5 million']);
$check($state['criteria']['budget'] === 5000000.0 && $state['criteria']['budgetBasis'] === 'sale_total', 'Purchase budget retains purpose');
$state = Assistant::interpret($state, ['message' => 'Only in Biday']);
$check($state['criteria']['budget'] === 5000000.0 && $state['criteria']['barangay'] === 'Biday', 'Location refinement retains budget');
$prior = $state['criteria'];
$unsupported = Assistant::interpret($state, ['message' => 'Guarantee my investment returns']);
$check($unsupported['criteria'] === $prior && $unsupported['intent'] === 'unsupported', 'Unsupported advice cannot alter filters');
$interrupted = Assistant::interpret(Assistant::initial(), ['message' => 'Find a commercial lot']);
$interrupted = Assistant::interpret($interrupted, ['message' => 'buy']);
$interrupted = Assistant::interpret($interrupted, ['message' => 'What is the weather?']);
$interrupted = Assistant::interpret($interrupted, ['message' => '2 million']);
$check($interrupted['criteria']['budget'] === 2000000.0 && $interrupted['criteria']['budgetBasis'] === 'sale_total', 'An unsupported interruption cannot erase the pending budget follow-up');
$normal = Assistant::interpret($unsupported, ['message' => 'Only in Sevilla']);
$check(!isset($normal['message']) && $normal['criteria']['barangay'] === 'Sevilla', 'Prior unsupported response cannot leak into a subsequent search');
$lower = Assistant::interpret($state, ['message' => 'Lower my budget']);
$check($lower['criteria']['budget'] === 5000000.0 && $lower['pending'] === 'budget', 'No arbitrary budget reduction');
$ambiguous = Assistant::interpret(Assistant::initial(), ['message' => 'Find properties under PHP 50000']);
$check($ambiguous['criteria']['budgetBasis'] === null && $ambiguous['pending'] === 'budgetBasis', 'Ambiguous basis requires clarification');
$state['lastResultIds'] = [11, 22, 33];
$compare = Assistant::interpret($state, ['message' => 'Compare these two']);
$check(empty($compare['compareIds']) && !empty($compare['question']), 'Ambiguous compare does not arbitrarily select');
$compare = Assistant::interpret($state, ['message' => 'Compare the first two']);
$check($compare['compareIds'] === [11, 22], 'Explicit comparison uses shown IDs');
$afterCompare = Assistant::interpret($compare, ['message' => 'Only in Biday']);
$check(!isset($afterCompare['compareIds']) && !isset($afterCompare['message']), 'Comparison is not replayed on the next message');
$search = ['results' => [['id' => 11, 'reasons' => ['Recorded location is Biday.']]], 'total' => 1];
$compare['compareIds'] = [11, 999];
$response = Assistant::response($compare, $search, [11]);
$check($response['compareIds'] === [] && $response['results'][0]['saved'] === true, 'Comparison IDs rechecked against freshly authorized results');
$reset = Assistant::interpret($state, ['reset' => true]);
$check($reset['criteria'] === Search::EMPTY_CRITERIA && $reset['messages'] === [], 'Reset clears context');

$check($reset['mode'] === 'rules', 'Every new conversation uses rules');
$zeroState = Assistant::interpret(Assistant::initial(), ['filters' => ['purpose' => 'sale', 'budget' => 1, 'budgetBasis' => 'sale_total']]);
$zero = Assistant::response($zeroState, ['results' => [], 'total' => 0, 'publishedTotal' => 5], []);
$check(str_contains($zero['message'], Assistant::ZERO_RESULTS), 'Zero results retain exact required wording');
$detailCard = Search::card(['id' => 17, 'name' => 'Recorded lot', 'category' => 'Land', 'listingPurpose' => 'sale', 'city' => 'San Fernando', 'price' => null, 'area' => .05], []);
$detailState = Assistant::initial();
$detailState['lastResultIds'] = [17];
$detailState = Assistant::interpret($detailState, ['message' => 'Show details for property 17']);
$details = Assistant::response($detailState, ['results' => [$detailCard], 'total' => 1], []);
$check(str_contains($details['message'], 'Recorded lot') && str_contains($details['message'], Assistant::MISSING), 'Detail template names listing and preserves missing facts');
$check(str_contains($details['message'], '500') && str_contains($details['message'], 'San Fernando'), 'Missing price does not suppress available area and location');
$detailState = Assistant::interpret($detailState, ['message' => 'amenities for property 999']);
$hidden = Assistant::response($detailState, ['results' => [$detailCard], 'total' => 1], []);
$check(!str_contains($hidden['message'], '999:') && !empty($hidden['question']), 'An unshown ID cannot reveal a listing');
$ambiguousDetail = Assistant::interpret(Assistant::initial(), ['message' => 'What amenities are listed?']);
$ambiguousResponse = Assistant::response($ambiguousDetail, ['results' => [$detailCard], 'total' => 1], []);
$check(!empty($ambiguousResponse['guidance']), 'Detail clarifications include explicit choices');
$parkingState = Assistant::interpret(Assistant::initial(), ['message' => 'Does the first property have parking?']);
$amenityCard = Search::card(['id' => 17, 'name' => 'Recorded lot', 'category' => 'Land', 'listingPurpose' => 'sale', 'facilities' => ['Electricity']], []);
$parking = Assistant::response($parkingState, ['results' => [$amenityCard], 'total' => 1], []);
$check(str_contains($parking['message'], Assistant::MISSING) && str_contains($parking['message'], 'Electricity'), 'An unrecorded specific amenity stays unknown alongside other recorded amenities');
$newSearch = Assistant::interpret($ambiguousDetail, ['message' => 'Buy a lot in Poro']);
$check($newSearch['intent'] === 'search' && $newSearch['criteria']['barangay'] === 'Poro', 'A new filter search can leave a pending listing-detail question');
$dualCard = Search::card(['id' => 21, 'name' => 'Dual listing', 'category' => 'Land', 'listingPurpose' => 'sale_or_lease', 'price' => null, 'leasePrice' => 1000, 'leasePeriod' => 'month', 'leasePriceUnit' => 'total'], []);
$check(str_contains($dualCard['details']['price'], Assistant::MISSING) && str_contains($dualCard['details']['price'], '1,000'), 'A missing dual-purpose sale price does not hide recorded rent');
foreach (['buy or lease', 'commercial or residential lot', 'budget between PHP 1 million and PHP 3 million'] as $ambiguousMessage) {
    $before = $state['criteria'];
    $unclear = Assistant::interpret($state, ['message' => $ambiguousMessage]);
    $check($unclear['criteria'] === $before || ($ambiguousMessage === 'buy or lease' && $unclear['criteria']['purpose'] === null), 'Ambiguous request does not silently choose a conflicting value: ' . $ambiguousMessage);
}
$runtime = file_get_contents(dirname(__DIR__) . '/api/investment-assistant.php') . file_get_contents(dirname(__DIR__) . '/app/Support/InvestmentAssistant.php');
$check(!preg_match('/InvestmentLanguageModel|->interpret\(|->explain\(|curl_|generat[ei]Content/', $runtime), 'Assistant runtime has no model or external AI transport');

foreach ([['filters' => ['sql' => 'DROP TABLE properties']], ['message' => str_repeat('a', 2001)], ['message' => ['nested']], ['filters' => [1, 2]] ] as $input) {
    $rejected = false;
    try { Assistant::interpret(Assistant::initial(), $input); } catch (InvalidArgumentException) { $rejected = true; }
    $check($rejected, 'Malformed user input is rejected');
}
echo "Investment assistant: $checks checks passed.\n";
