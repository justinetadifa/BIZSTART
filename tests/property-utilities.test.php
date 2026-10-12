<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';

use App\Support\PropertyParcel;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $operation, string $message) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException $expected) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
$existing = ['internet' => ['status' => 'available', 'connection_status' => 'connected', 'quality' => 'Strong',
    'download_speed_mbps' => 125.5, 'technology' => 'Fiber', 'providers' => ['PLDT'], 'connection_types' => ['fiber']],
    'electricity' => ['status' => 'available', 'sources' => ['grid']], 'water' => ['status' => 'available', 'sources' => ['piped']]];
foreach (['strong' => 'Strong', 'moderate' => 'Moderate', 'weak' => 'Weak', ' STRONG ' => 'Strong',
    'Strong' => 'Strong', 'Moderate' => 'Moderate', 'Weak' => 'Weak', 'not_verified' => 'Not verified', 'Not verified' => 'Not verified', '' => 'Not verified'] as $input => $expected) {
    $normalized = PropertyParcel::normalizeUtilities(['internet_status' => 'connected', 'internet_quality' => $input], $existing);
    $check($normalized['internet']['quality'] === $expected, 'Form and historical quality labels normalize consistently: ' . $input);
}
$partial = PropertyParcel::normalizeUtilities(['internet_technology' => 'Fiber broadband'], $existing);
$check($partial['internet']['download_speed_mbps'] === 125.5 && $partial['internet']['quality'] === 'Strong', 'Partial updates retain active internet speed and quality when keys are absent.');
foreach (['', '   ', null] as $blank) {
    $cleared = PropertyParcel::normalizeUtilities(['download_speed_mbps' => $blank], $existing);
    $check($cleared['internet']['download_speed_mbps'] === null && $cleared['internet']['quality'] === 'Strong', 'Explicit blank/null clears old speed without clearing omitted quality.');
}
foreach ([0, '0', 0.01, 10000, '10000', '125.55'] as $speed) {
    $normalized = PropertyParcel::normalizeUtilities(['internet_status' => 'available', 'download_speed_mbps' => $speed]);
    $check($normalized['internet']['download_speed_mbps'] === round((float) $speed, 1), 'Available valid speed persists at one decimal Mbps precision.');
}
foreach ([-1, '-0.1', 10000.01, '10001', INF, NAN, '1e309', 'NaN', 'fast', [], true, new stdClass()] as $invalid) {
    $reject(fn () => PropertyParcel::normalizeUtilities(['internet_status' => 'available', 'download_speed_mbps' => $invalid]), 'Available malformed, nonfinite, negative or excessive speed must reject explicitly.');
}
foreach (['not_connected', 'unavailable', 'not_verified', 'unknown'] as $inactive) {
    $normalized = PropertyParcel::normalizeUtilities(['internet_status' => $inactive, 'download_speed_mbps' => '-999', 'internet_quality' => 'strong'], $existing);
    $check($normalized['internet']['download_speed_mbps'] === null && $normalized['internet']['quality'] === 'Not verified', 'Inactive internet cannot retain hidden speed or quality.');
    $check($normalized['internet']['technology'] === '' && $normalized['internet']['providers'] === [] && $normalized['internet']['connection_types'] === [], 'Inactive internet hides/discards connection-dependent technology, providers and types.');
}
$inactiveOld = ['internet' => array_replace($existing['internet'], ['status' => 'unavailable', 'connection_status' => 'not_connected'])];
$check(PropertyParcel::normalizeUtilities([], $inactiveOld)['internet']['download_speed_mbps'] === null, 'Historical inactive internet speed clears on normalization even during unrelated partial edits.');
$otherUtilities = PropertyParcel::normalizeUtilities(['electricity_status' => 'unavailable', 'water_status' => 'not_verified'], $existing);
$check($otherUtilities['electricity']['sources'] === [] && $otherUtilities['water']['sources'] === [], 'Inactive electricity and water continue clearing availability-dependent source lists.');
$parcel = PropertyParcel::fromPayload(['internet' => 'available', 'internet_quality' => 'moderate', 'download_speed_mbps' => '250.5']);
$check($parcel['utilities']['internet']['quality'] === 'Moderate' && $parcel['utilities']['internet']['download_speed_mbps'] === 250.5, 'Actual parcel payload path uses canonical form quality and speed.');
$edited = PropertyParcel::fromPayload(['internet' => 'available', 'download_speed_mbps' => ''], $parcel);
$check($edited['utilities']['internet']['download_speed_mbps'] === null && $edited['utilities']['internet']['quality'] === 'Moderate', 'Actual parcel PATCH clears explicit speed while preserving omitted quality.');
$deactivated = PropertyParcel::fromPayload(['internet' => 'unavailable'], $parcel);
$check($deactivated['observations']['internet'] === 'unavailable' && $deactivated['utilities']['internet']['download_speed_mbps'] === null, 'Parcel observations and normalized inactive internet details agree.');

echo "Property utilities: {$checks} isolated checks passed; no database or network access.\n";
