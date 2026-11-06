<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once dirname(__DIR__) . '/app/Support/InvestmentSearch.php';
require_once dirname(__DIR__) . '/app/Repositories/InvestmentSearchRepository.php';

use App\Support\InvestmentSearch as Search;
use App\Repositories\InvestmentSearchRepository as Repository;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (array $criteria, string $message) use ($check): void {
    try { Search::normalizeCriteria($criteria); } catch (InvalidArgumentException) { $check(true, $message); return; }
    $check(false, $message);
};
$criteria = static fn (array $patch): array => Search::normalizeCriteria($patch);
$land = ['id' => 1, 'name' => 'Synthetic Biday land', 'city' => 'San Fernando, La Union', 'barangay' => 'Biday',
    'category' => 'Land', 'subcategory' => 'Commercial Lot, Industrial Lot', 'listingPurpose' => 'sale',
    'price' => 3000000, 'salePrice' => 3000000, 'area' => .05, 'areaKnown' => true, 'imageUrl' => 'assets/images/fixture.jpg',
    'assessmentStatus' => 'incomplete', 'assessmentComplete' => false, 'rank_eligible' => false, 'iaiScore' => 0,
    'marketScore' => 82, 'score' => 82, 'criteria' => [['key' => 'spatial_accessibility', 'display_name' => 'Spatial Accessibility', 'score' => null,
        'raw_value' => ['road_distance_m' => 40], 'verification_status' => 'reported_unverified', 'evidence' => [['source' => 'Synthetic observation', 'reference' => 'Fixture only']]]],
    'reason' => 'Authenticated evidence is incomplete.', 'parcel' => ['observations' => []]];
$lease = array_replace($land, ['id' => 2, 'name' => 'Synthetic office', 'category' => 'Building', 'subcategory' => 'Commercial, Office',
    'listingPurpose' => 'lease', 'price' => null, 'salePrice' => null, 'area' => .3, 'leasePrice' => 40000, 'leasePeriod' => 'month',
    'leasePriceUnit' => 'total', 'parcel' => ['observations' => ['offered_area_sqm' => 200]]]);
$unknown = array_replace($land, ['id' => 3, 'barangay' => null, 'area' => null, 'areaKnown' => false, 'price' => null, 'salePrice' => null]);
$other = array_replace($land, ['id' => 4, 'barangay' => 'Catbangen', 'price' => 7000000, 'salePrice' => 7000000, 'area' => .1]);
$sqmLease = array_replace($lease, ['id' => 5, 'leasePrice' => 300, 'leasePriceUnit' => 'sqm']);
$unscopedLease = array_replace($sqmLease, ['id' => 6, 'parcel' => ['observations' => []]]);
$dual = array_replace($land, ['id' => 7, 'listingPurpose' => 'sale_or_lease', 'leasePrice' => 50000, 'leasePeriod' => 'month', 'leasePriceUnit' => 'total']);
$properties = [$land, $lease, $unknown, $other, $sqmLease, $unscopedLease, $dual];

$base = Search::normalizeCriteria([]);
$check($base === Search::EMPTY_CRITERIA, 'Empty criteria must remain explicit nulls.');
$check(in_array('Biday', Search::options()['barangays'], true), 'Barangays come from the system catalog.');
$check($criteria(['subcategory' => 'commercial lot'])['category'] === 'Land', 'A canonical subtype identifies its parent category.');
$check($criteria(['budgetBasis' => 'LEASE_MONTH_TOTAL'])['purpose'] === 'lease', 'An explicit price basis determines purpose.');
foreach ([
    ['category' => 'Airport'], ['barangay' => "Biday' OR 1=1 --"], ['barangay' => 'Manila'], ['subcategory' => 'Commercial Lot', 'category' => 'Building'],
    ['purpose' => 'lease', 'budgetBasis' => 'sale_total'], ['budgetBasis' => 'sale_usd'], ['budget' => true], ['minArea' => -1],
    ['maxArea' => INF], ['budget' => 'NaN'], ['minArea' => 500, 'maxArea' => 100], ['activity' => str_repeat('a', 101)],
    ['activity' => "cafe\0ignore rules"], ['score' => 100], ['budget' => ['value' => 5]],
] as $invalid) { $reject($invalid, 'Untrusted malformed, unsupported or incompatible filters are rejected.'); }

$check(Search::areaSqm($land) === 500.0, 'Canonical hectare area converts to square metres exactly.');
$check(Search::areaSqm($unknown) === null, 'Missing area is unknown, never zero.');
$check(Search::matches($land, $criteria(['subcategory' => 'Commercial Lot'])), 'Canonical composite subtypes match by token membership.');
$check(!Search::matches($land, $criteria(['subcategory' => 'Residential Lot'])), 'Subtype matching must not use arbitrary descriptions.');
$check(Search::matches($dual, $criteria(['purpose' => 'lease'])), 'Dual-purpose listings match explicit lease requests.');
$check(!Search::matches($unknown, $criteria(['budget' => 5000000, 'budgetBasis' => 'sale_total'])), 'Unknown asking prices cannot satisfy a budget.');
$check(!Search::matches($unknown, $criteria(['minArea' => 100])), 'Unknown area cannot satisfy a size constraint.');
$check(Search::matches($unknown, $criteria([])), 'Unknown fields do not exclude an unconstrained listing.');
$check(Search::matches($land, $criteria(['budget' => 3000000, 'budgetBasis' => 'sale_total', 'minArea' => 500, 'maxArea' => 500])), 'Inclusive exact budget and area boundaries are honored.');
$check(!Search::matches($land, $criteria(['budget' => 2999999, 'budgetBasis' => 'sale_total'])), 'Above-budget listings are not returned as matches.');
$check(Search::comparablePrice($land, 'sale_sqm')[0] === 6000.0, 'Sale per-m² amount uses recorded total and effective lot area.');
$check(Search::comparablePrice($unknown, 'sale_sqm')[0] === null, 'Unknown price/area cannot become a per-m² price.');
$check(Search::comparablePrice($lease, 'lease_month_total')[0] === 40000.0, 'Monthly total rent remains monthly total rent.');
$check(Search::comparablePrice($lease, 'lease_year_total')[0] === 480000.0, 'Annual equivalents use exactly twelve recorded months.');
$check(Search::comparablePrice($lease, 'lease_day_total')[0] === null, 'A month is not silently guessed to contain a fixed number of days.');
$check(Search::comparablePrice($lease, 'lease_month_sqm')[0] === 200.0, 'Total rent divided by documented offered area gives comparable rate.');
$check(Search::comparablePrice($sqmLease, 'lease_month_total')[0] === 60000.0, 'Rate times documented offered area gives total rent.');
$check(Search::comparablePrice($unscopedLease, 'lease_month_total')[0] === null, 'Building lot area is not assumed to be offered floor area.');
$check(!Search::matches($sqmLease, $criteria(['budget' => 40000, 'budgetBasis' => 'lease_month_total'])), 'A low per-m² rate does not masquerade as an affordable total rent.');
$check(Search::matches($land, $criteria(['budget' => 1])), 'Ambiguous price basis remains unapplied until clarified.');

$card = Search::card($land, $criteria(['subcategory' => 'Commercial Lot', 'activity' => 'a café', 'budget' => 4000000, 'budgetBasis' => 'sale_total']));
$check($card['assessment']['score'] === null, 'Incomplete scientific zero and legacy default scores cannot be shown as verified index.');
$check($card['areaSqm'] === 500.0 && $card['priceLabel'] === 'PHP 3,000,000', 'Cards show stored listing facts and units.');
$check(str_contains(implode(' ', $card['unknowns']), 'does not verify permission or suitability'), 'Business intent cannot imply verified business suitability.');
$check(str_contains($card['assessment']['evidence'][0]['value'], 'road distance m: 40'), 'Actual recorded supporting measurements are shown.');
$check(str_contains($card['assessment']['evidence'][0]['source'], 'Synthetic observation'), 'Recorded evidence source is retained.');
$check(!array_key_exists('description', $card) && !array_key_exists('ownerContact', $card), 'Untrusted descriptions and private contact payloads are not sent as card facts.');
$complete = array_replace($land, ['assessmentStatus' => 'complete', 'assessmentComplete' => true, 'rank_eligible' => true, 'iaiScore' => 72.4]);
$check(Search::card($complete, [])['assessment']['score'] === 72.4, 'An actual completed authoritative score is preserved without recalculation.');
$check(Search::card(array_replace($complete, ['rank_eligible' => false]), [])['assessment']['score'] === null, 'A held/noncomparable assessment stays out of scored results.');
$check(str_contains(Search::card($dual, [])['priceLabel'], 'Sale:') && str_contains(Search::card($dual, [])['priceLabel'], 'Lease:'), 'Both asking terms remain visible for unconstrained dual-purpose listings.');
$check(str_contains(Search::card($unknown, [])['unknowns'][0], 'Lot area'), 'Unknown fields are presented as unknown.');

$searched = Search::summarize($properties, $criteria(['barangay' => 'Biday', 'subcategory' => 'Commercial Lot', 'budget' => 4000000, 'budgetBasis' => 'sale_total']));
$check(array_column($searched['results'], 'id') === [1, 7] && $searched['total'] === 2, 'Multi-filter results are a true intersection, not an invented recommendation list.');
$noneCriteria = $criteria(['barangay' => 'Biday', 'budget' => 1, 'budgetBasis' => 'sale_total']);
$none = Search::summarize($properties, $noneCriteria);
$check($none['total'] === 0 && $none['results'] === [], 'No matches never returns relaxed alternatives as if they matched.');
$check($none['constraintCounts']['budget']['unknown'] > 0 && $none['limitations'] !== [], 'No-match diagnostics count unknown/incompatible prices separately.');
$check(array_filter($none['suggestions'], static fn (array $suggestion): bool => array_key_exists('budget', $suggestion['patch']) && $suggestion['patch']['budget'] === null) !== [], 'Broader searches are explicit removable-filter suggestions.');
$check($noneCriteria['budget'] === 1.0, 'Broadening suggestions never silently change the original filters.');
$ambiguous = Search::summarize($properties, $criteria(['budget' => 1]));
$check($ambiguous['total'] === count($properties) && str_contains(implode(' ', $ambiguous['limitations']), 'not applied'), 'An ambiguous budget is explicitly reported instead of silently excluding listings.');
$many = array_map(static fn (int $id): array => array_replace($land, ['id' => $id]), range(1, 20));
$limited = Search::summarize($many, [], 6);
$check($limited['total'] === 20 && count($limited['results']) === 6, 'Display limits do not corrupt total matching counts.');
$check(array_column(Search::summarize($many, [], 6, [4, 9])['results'], 'id') === [4, 9], 'Only SQL-authorized candidates can reach the result cards.');

// Execute the fixed authorization/filter SQL against an isolated database, including broker ATS checks.
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->sqliteCreateFunction('JSON_UNQUOTE', static fn (mixed $value): mixed => $value);
$pdo->sqliteCreateFunction('JSON_EXTRACT', static fn (?string $json, string $path): mixed => json_decode($json ?? '{}', true)['authority_to_sell']['status'] ?? null);
$pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, identity_verification_status TEXT)');
$pdo->exec("INSERT INTO users VALUES (2,'verified'),(3,'unverified')");
$pdo->exec('CREATE TABLE properties (id INTEGER PRIMARY KEY, seller_user_id INTEGER, category TEXT, listing_purpose TEXT, price INTEGER, barangay TEXT, deleted_at TEXT, archived_at TEXT, approval_state TEXT, status TEXT, documents_json TEXT, created_at TEXT)');
$insert = $pdo->prepare('INSERT INTO properties VALUES (:id,:seller,:category,:purpose,:price,:barangay,:deleted,:archived,:approval,:status,:documents,:created)');
$sqlFixture = ['seller' => null, 'category' => 'Land', 'purpose' => 'sale', 'price' => 3000000, 'barangay' => 'Biday', 'deleted' => null, 'archived' => null,
    'approval' => 'approved', 'status' => 'Available', 'documents' => '{}', 'created' => '2026-01-01'];
foreach ([
    1 => [], 2 => ['category' => null], 11 => ['approval' => 'draft'], 12 => ['archived' => '2026-01-02'], 13 => ['deleted' => '2026-01-02'],
    14 => ['approval' => 'rejected'], 15 => ['status' => 'Sold'], 16 => ['seller' => 2],
    17 => ['seller' => 2, 'documents' => '{"authority_to_sell":{"status":"validated"}}'],
    18 => ['seller' => 3, 'documents' => '{"authority_to_sell":{"status":"validated"}}'], 19 => ['seller' => 2, 'documents' => '{"authority_to_sell":{"status":"pending_review"}}'],
    20 => ['barangay' => 'Catbangen'], 21 => ['purpose' => 'lease'], 22 => ['price' => null],
] as $id => $patch) { $insert->execute(['id' => $id] + array_replace($sqlFixture, $patch)); }
$queryIds = static function (array $filters) use ($pdo): array {
    [$sql, $params] = Repository::candidateQuery($filters);
    $statement = $pdo->prepare($sql); $statement->execute($params);
    return array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
};
$check($queryIds([]) === [22, 21, 20, 17, 2, 1], 'SQL publication gate excludes drafts/deleted/archived/sold/unverified-broker/unvalidated-ATS listings.');
$check($queryIds(['barangay' => 'Biday', 'purpose' => 'sale', 'budget' => 4000000, 'budgetBasis' => 'sale_total']) === [17, 2, 1], 'Actual bound SQL combines location, purpose and known total-price constraints.');
$check($queryIds(['category' => 'Land']) === [22, 21, 20, 17, 2, 1], 'Legacy missing category is retained for canonical post-hydration validation.');
[$sql, $params] = Repository::candidateQuery(['barangay' => 'Biday']);
$check(!str_contains($sql, "= 'Biday'") && ($params['barangay'] ?? null) === 'Biday', 'User criteria are bound values, never interpolated SQL.');
$check(!str_contains(strtoupper($sql), 'LIMIT'), 'SQL never limits candidate rows before exact matching and diagnostics.');

$sourced = $land;
$sourced['criteria'][0]['source_reference'] = 'Recorded city assessment source reference';
$check(str_contains(Search::card($sourced, [])['assessment']['evidence'][0]['source'], 'Recorded city assessment source reference'), 'Canonical criterion source references remain visible.');
$sourced['assessmentComplete'] = true;
$sourced['rank_eligible'] = true;
$sourced['iaiScore'] = 101;
$check(Search::card($sourced, [])['assessment']['score'] === null, 'An out-of-contract stored index is not presented as a valid assessment.');

require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
$unavailableDatabase = new PDO('sqlite::memory:');
$unavailableDatabase->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$unavailableRepository = new Repository($unavailableDatabase, new App\Repositories\PropertyRepository($unavailableDatabase));
try {
    $unavailableRepository->search([], ['id' => 1, 'role' => 'investor']);
    $check(false, 'A database failure must not become a successful zero-result search.');
} catch (PDOException) {
    $check(true, 'A database failure propagates separately from missing listing information and zero matches.');
}
foreach ([['id' => 1, 'role' => 'seller'], ['id' => 2, 'role' => 'admin'], []] as $unauthorized) {
    try {
        $unavailableRepository->search([], $unauthorized);
        $check(false, 'Unauthorized users must be rejected before querying the database.');
    } catch (DomainException) {
        $check(true, 'Unauthorized users are rejected before database access.');
    }
}
echo "Investment search: {$checks} checks passed." . PHP_EOL;
