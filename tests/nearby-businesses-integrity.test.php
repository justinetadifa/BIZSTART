<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/NearbyBusinesses.php';

use App\Support\NearbyBusinesses;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$directory = sys_get_temp_dir() . '/locus-nearby-integrity-' . bin2hex(random_bytes(8));
mkdir($directory . '/cache/radar', 0700, true);
$feature = static function (string $id, string $name, float $lat, string $status = 'unknown', ?string $source = null): array {
    $properties = ['id' => $id, 'name' => $name, 'category' => 'cafe', 'businessType' => 'cafe', 'status' => $status];
    if ($source !== null) { $properties['source'] = $source; }
    return ['type' => 'Feature', 'id' => $id, 'geometry' => ['type' => 'Point', 'coordinates' => [120.3209, $lat]], 'properties' => $properties];
};
$write = static function (string $file, array $features) use ($directory): void {
    file_put_contents($directory . '/' . $file, json_encode(['type' => 'FeatureCollection', 'features' => $features], JSON_THROW_ON_ERROR));
};

try {
    $invalid = $feature('invalid', 'Invalid Coordinate Cafe', 16.6159);
    $invalid['geometry']['coordinates'][0] = 'not a coordinate';
    $closedNote = $feature('closed-note', 'Closed Through Note', 16.6159, 'existing');
    $closedNote['properties']['note'] = 'Temporarily closed for renovations.';
    $write('commercial-directory.json', [
        $feature('local', 'Bean House Downtown', 16.6159, 'operating', 'City directory fixture'),
        $feature('local-unknown', 'Local Unknown Status', 16.6199),
        $feature('local-closed', 'Closed Local Cafe', 16.6159, 'closed'), $invalid,
    ]);
    $write('competitors.json', [
        $feature('locator', 'Locator Existing', 16.6179, 'existing', 'Brand location fixture'),
        $feature('locator-unknown', 'Locator Unknown Status', 16.6189),
        $closedNote,
    ]);
    $write('cache/radar/a.json', [
        $feature('osm-duplicate', 'Bean House', 16.61591, 'unknown', 'OpenStreetMap contributors'),
        $feature('osm-distinct', 'Bread Shop', 16.61591, 'unknown', 'OpenStreetMap contributors'),
        $feature('osm-far-branch', 'Bean House Uptown', 16.6209, 'unknown', 'OpenStreetMap contributors'),
        $feature('osm-no-source', 'No Source Recorded', 16.6219),
        $feature('osm-closed', 'Closed Mapped Cafe', 16.6159, 'permanently_closed'),
    ]);
    $write('cache/radar/b.json', [$feature('osm-repeat', 'Bread Shop', 16.61592, 'unknown', 'OpenStreetMap contributors')]);
    $records = array_values(NearbyBusinesses::directory($directory));
    $names = array_column($records, 'name');
    $byName = array_column($records, null, 'name');
    $check(count($records) === 7, 'Directory keeps unique valid open/unknown records across sources.');
    $check(in_array('Bread Shop', $names, true), 'Different merchant within 45m of a known business survives.');
    $check(!in_array('Bean House', $names, true), 'Same named nearby business deduplicates against primary local record.');
    $check(in_array('Bean House Uptown', $names, true), 'Distant same-brand branch survives.');
    $check(count(array_filter($names, static fn ($name): bool => $name === 'Bread Shop')) === 1, 'Repeated cached observations of one merchant count once.');
    $check($byName['Bread Shop']['status'] === 'unknown', 'OSM unknown operating status is preserved.');
    $check($byName['Bread Shop']['source'] === 'OpenStreetMap contributors', 'Mapped record keeps its actual source.');
    $check($byName['No Source Recorded']['source'] === 'Mapped place record', 'Absent source does not invent official city registry verification.');
    $check($byName['Local Unknown Status']['status'] === 'unknown', 'Local missing operating status remains unknown.');
    $check($byName['Locator Existing']['status'] === 'operating' && $byName['Locator Existing']['source'] === 'Brand location fixture', 'Explicit operating locator status and source normalize honestly.');
    $check($byName['Locator Unknown Status']['status'] === 'unknown', 'Unknown locator does not invent planned construction status.');
    $check(!in_array('Closed Local Cafe', $names, true) && !in_array('Closed Mapped Cafe', $names, true) && !in_array('Closed Through Note', $names, true), 'Closed records from all sources are excluded.');
    $check(!in_array('Invalid Coordinate Cafe', $names, true), 'Malformed coordinate is not cast to a plausible numeric zero.');
    $write('commercial-directory.json', []);
    $check(count(NearbyBusinesses::directory($directory)) === 6, 'Fixture reads do not populate or reuse production static cache.');
    echo "Nearby businesses integrity: {$checks} isolated checks passed; no live writes.\n";
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
        if ($file->isDir()) { rmdir($file->getPathname()); } else { unlink($file->getPathname()); }
    }
    rmdir($directory);
}
