<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/SurroundingsRadar.php';
use App\Support\SurroundingsRadar as Radar;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$root = sys_get_temp_dir() . '/locus-radar-reliability-' . bin2hex(random_bytes(8));
mkdir($root . '/cache', 0700, true);
$createdFiles = [];
$write = static function (string $name, array $data) use ($root, &$createdFiles): string {
    $file = $root . '/' . $name;
    file_put_contents($file, json_encode($data, JSON_THROW_ON_ERROR));
    $createdFiles[$file] = true;
    return $file;
};
$point = static fn (string $id, string $name, float $lat, string $status = 'unknown'): array => [
    'type' => 'Feature', 'id' => $id, 'geometry' => ['type' => 'Point', 'coordinates' => [120.3209, $lat]],
    'properties' => ['name' => $name, 'businessType' => 'cafe', 'category' => 'cafe', 'status' => $status, 'distanceMeters' => 9999, 'verified' => true],
];
$road = ['type' => 'Feature', 'id' => 'osm:way:8', 'geometry' => ['type' => 'LineString', 'coordinates' => [[120.314,16.6159],[120.328,16.6159]]],
    'properties' => ['name' => 'Saved crossing road', 'highway' => 'residential', 'distanceMeters' => 9999]];
$options = ['cache_directory' => $root . '/cache', 'data_directory' => $root];
$unavailable = static function (): array { throw new RuntimeException('Simulated provider outage.'); };
try {
    $saved = ['type' => 'FeatureCollection', 'center' => [16.616,120.3209], 'radius' => 500,
        'features' => [$point('osm:node:7','Saved Cafe',16.6168), $point('branch','Other Branch',16.6198),
            $point('outside','Outside Circle',16.623), $point('closed','Closed Cafe',16.6168,'closed')],
        'roads' => ['status' => 'Available', 'geojson' => ['type' => 'FeatureCollection', 'features' => [$road]]],
        'retrievalDate' => '2025-01-01', 'coverage' => 'mapped_only'];
    $write('cache/radar_16.6160_120.3209_500.json', $saved);
    $write('cache/duplicate.json', $saved);
    $malformed = $saved;
    $malformed['features'] = [['type'=>'Feature','properties'=>'invalid','geometry'=>null]];
    $malformed['roads']['geojson']['features'][0]['properties'] = 'invalid';
    $write('cache/malformed.json', $malformed);
    $write('commercial-directory.json', ['type'=>'FeatureCollection','features'=>[$point('local','Local Cafe',16.6159)]]);
    $called = false;
    $local = Radar::search(16.6159,120.3209,500,'cafe',$options + ['local_only'=>true,'fetcher'=>static function () use (&$called): array { $called=true; return []; }]);
    $check(!$called,'Local and saved searches make no live provider calls.');
    $check(count($local['features'])===3,'Saved places merge with local records and deduplicate across snapshots.');
    $check(count($local['roads']['geojson']['features'])===1,'A cached road crossing the circle survives even when its vertices are outside.');
    $check($local['roads']['geojson']['features'][0]['properties']['distanceMeters'] < 1,'Road distance is recalculated from the new reference point.');
    $check($local['cached'] && $local['stale'],'Older records remain available with explicit cache age.');
    $byName = [];
    foreach ($local['features'] as $feature) { $byName[$feature['properties']['name']] = $feature; }
    $check(!isset($byName['Outside Circle']) && !isset($byName['Closed Cafe']),'No outside or closed place becomes a nearby record.');
    $check($byName['Saved Cafe']['properties']['distanceMeters'] > 95 && $byName['Saved Cafe']['properties']['distanceMeters'] < 105,'A saved distance from another point is never reused.');
    $check($byName['Saved Cafe']['properties']['checkedOn']==='2025-01-01','The saved record retains its original date.');
    $check($byName['Saved Cafe']['properties']['verified']===false,'Saved mapping does not manufacture authentication.');
    $check($local['screening']['score']!==null && $local['screening']['is_verified']===false,'Observed businesses can supply only a provisional screening.');
    $retail = Radar::search(16.6159,120.3209,500,'retail',$options + ['local_only'=>true]);
    $check($retail['features'][0]['properties']['classification']!==$local['features'][0]['properties']['classification'],'Business roles are recalculated for the selected profile.');
    $check($retail['screening']['observations']['business_type']==='retail','The screening is bound to the current business profile.');

    $cacheFile = $root . '/cache/radar_v2_16.615900_120.320900_500.json';
    $offline = Radar::search(16.6159,120.3209,500,'cafe',$options + ['fetcher'=>$unavailable]);
    $check($offline['liveUnavailable'] && count($offline['features'])===3,'Provider outage returns a usable saved inventory.');
    $check(!is_file($cacheFile),'An outage does not create a 24-hour failure cache.');
    $poisoned = $write('cache/radar_v2_16.615900_120.320900_500.json',['type'=>'FeatureCollection','features'=>[],'coverage'=>'local_only']);
    $calls = 0;
    $newMap = static function () use (&$calls): array { $calls++; return ['elements'=>[
        ['type'=>'node','id'=>7,'lat'=>16.6168,'lon'=>120.3209,'tags'=>['name'=>'Updated Cafe','amenity'=>'cafe']]]]; };
    $updated = Radar::search(16.6159,120.3209,500,'cafe',$options + ['fetcher'=>$newMap]);
    $check($calls===1,'A fresh failed local-only cache cannot suppress a live refresh.');
    $check(in_array('Updated Cafe',array_column(array_column($updated['features'],'properties'),'name'),true),'Live observations replace older records with the same OSM identity.');
    $check(!$updated['liveUnavailable'],'A complete provider response is identified as available.');
    $before = file_get_contents($cacheFile);
    $failedRetry = Radar::search(16.6159,120.3209,500,'cafe',$options + ['force_refresh'=>true,'fetcher'=>$unavailable]);
    $check($failedRetry['liveUnavailable'] && count($failedRetry['features'])===3,'Forced retry can fail without losing the successful snapshot.');
    $check(file_get_contents($cacheFile)===$before,'An outage never overwrites the successful map snapshot.');
    $partial = Radar::search(16.6159,120.3209,500,'cafe',$options + ['force_refresh'=>true,'fetcher'=>static fn():array=>['elements'=>[],'remark'=>'Simulated partial result']]);
    $check($partial['liveUnavailable'] && file_get_contents($cacheFile)===$before,'A partial provider response also preserves the successful snapshot.');
    $changed = Radar::search(16.623,120.3209,500,'cafe',$options + ['local_only'=>true]);
    $check($changed['center']===[16.623,120.3209],'Moved pins use their own result frame.');
    $check(!in_array('Local Cafe',array_column(array_column($changed['features'],'properties'),'name'),true),'A business outside the moved circle cannot leak from the previous point.');
    $check($changed['screening']['observations']['reference_lat']===16.623,'The provisional score follows the moved reference point.');
    echo "Nearby reliability: {$checks} saved-map, radius, deduplication, outage, freshness, forced refresh and partial-response checks passed.\n";
} finally {
    foreach (array_keys($createdFiles) as $file) { if (is_file($file)) { unlink($file); } }
    rmdir($root . '/cache');
    rmdir($root);
}
