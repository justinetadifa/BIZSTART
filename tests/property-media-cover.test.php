<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/JsonData.php';
require_once dirname(__DIR__) . '/app/Support/PropertyMediaSelection.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';

use App\Repositories\PropertyRepository;
use App\Support\PropertyMediaSelection;

$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
};
$reject = static function (callable $operation, string $message) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException $expected) { $check(true, $message); return; }
    throw new RuntimeException($message);
};
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('CREATE TABLE properties (id INTEGER PRIMARY KEY, image_url TEXT)');
$pdo->exec('CREATE TABLE property_media (id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER, kind TEXT, source TEXT, alt_text TEXT, sort_order INTEGER)');
$pdo->exec("INSERT INTO properties VALUES (1, 'old-a.jpg'), (2, 'foreign.jpg'), (3, 'fallback.jpg')");
$pdo->exec("INSERT INTO property_media (id, property_id, kind, source, alt_text, sort_order) VALUES (11,1,'image','old-a.jpg','A',0),(12,1,'image','old-b.jpg','B',1),(13,1,'image','old-c.jpg','C',2),(21,2,'image','foreign.jpg','Foreign',0)");
$repository = new PropertyRepository($pdo);
$rows = static function (int $id) use ($pdo): array {
    $query = $pdo->prepare('SELECT id, source, sort_order FROM property_media WHERE property_id = ? ORDER BY sort_order, id');
    $query->execute([$id]);
    return $query->fetchAll();
};
$cover = static function (int $id) use ($pdo): string {
    $query = $pdo->prepare('SELECT image_url FROM properties WHERE id = ?');
    $query->execute([$id]);
    return (string) $query->fetchColumn();
};

$repository->syncPropertyMedia(1, 'old-a.jpg', 'Fixture', [], [13, 11, 12]);
$check(array_column($rows(1), 'source') === ['old-c.jpg', 'old-a.jpg', 'old-b.jpg'], 'Saved media follow the explicitly retained ID order.');
$check($cover(1) === 'old-c.jpg', 'Catalog cover matches the first reordered gallery photo.');
$repository->syncPropertyMedia(1, 'old-c.jpg', 'Fixture', ['new-a.jpg', 'new-b.jpg'], [13, 11, 12], false, 12);
$check(array_column($rows(1), 'source') === ['old-b.jpg', 'old-c.jpg', 'old-a.jpg', 'new-a.jpg', 'new-b.jpg'], 'Existing selected cover leads retained photos and newly uploaded gallery.');
$check($cover(1) === 'old-b.jpg', 'Choosing an existing cover updates the catalog image.');
$owned = array_column($rows(1), 'id');
$repository->syncPropertyMedia(1, 'old-b.jpg', 'Fixture', ['new-c.jpg', 'new-d.jpg'], $owned, false, null, 'new-d.jpg');
$check($rows(1)[0]['source'] === 'new-d.jpg' && $cover(1) === 'new-d.jpg', 'A newly uploaded selected photo becomes the cover even when old photos remain.');
$check(array_map('intval', array_column($rows(1), 'sort_order')) === range(0, 6), 'Gallery positions are consecutive after promoting a new cover.');

$snapshot = $rows(1);
$originalCover = $cover(1);
foreach ([
    fn () => $repository->syncPropertyMedia(1, $originalCover, 'Fixture', [], [11, 21]),
    fn () => $repository->syncPropertyMedia(1, $originalCover, 'Fixture', [], array_column($snapshot, 'id'), false, 21),
    fn () => $repository->syncPropertyMedia(1, $originalCover, 'Fixture', [], [11], false, 12),
    fn () => $repository->syncPropertyMedia(1, $originalCover, 'Fixture', ['new-e.jpg'], array_column($snapshot, 'id'), false, null, 'untrusted.jpg'),
    fn () => $repository->syncPropertyMedia(1, $originalCover, 'Fixture', [], null, true, 11),
] as $invalid) {
    $reject($invalid, 'Invalid ownership, removed-cover and arbitrary-path requests are rejected.');
    $check($rows(1) === $snapshot && $cover(1) === $originalCover, 'Invalid selection leaves the gallery and catalog cover unchanged.');
}
$check($rows(2)[0]['source'] === 'foreign.jpg' && $cover(2) === 'foreign.jpg', 'Other properties are unaffected.');
$retainedWithoutCover = array_values(array_filter(array_column($snapshot, 'id'), static fn ($id): bool => $id !== $snapshot[0]['id']));
$repository->syncPropertyMedia(1, $originalCover, 'Fixture', [], $retainedWithoutCover);
$check($cover(1) === $rows(1)[0]['source'] && $cover(1) !== $originalCover, 'Removing the visible cover promotes the next retained photo.');
$repository->syncPropertyMedia(3, 'fallback.jpg', 'New fixture', ['first.jpg', 'second.jpg'], null, false, null, 'second.jpg');
$check(array_column($rows(3), 'source') === ['second.jpg', 'first.jpg'] && $cover(3) === 'second.jpg', 'New listings honor the selected uploaded cover.');

$payload = PropertyMediaSelection::withUploads(['cover_image_path' => 'untrusted.jpg'], ['cover_upload_index' => '1', 'cover_image_path' => 'untrusted.jpg'], ['staged-a.jpg', 'staged-b.jpg']);
$check($payload['cover_image_path'] === 'staged-b.jpg', 'Upload cover selection resolves only to a server-staged upload path.');
$payload = PropertyMediaSelection::withUploads([], ['cover_media_id' => '12', 'retained_media_ids' => '[12,11,12]'], []);
$check($payload['cover_media_id'] === 12 && $payload['retained_media_ids'] === [12, 11], 'Saved ID parsing retains request order and removes duplicates.');
$check(!isset(PropertyMediaSelection::withUploads(['cover_image_path' => 'untrusted.jpg'], ['cover_image_path' => 'untrusted.jpg'], [])['cover_image_path']), 'Arbitrary cover paths never survive input resolution.');
foreach ([
    ['cover_upload_index' => '-1'], ['cover_upload_index' => '4'], ['cover_upload_index' => '1.0'],
    ['cover_media_id' => '0'], ['cover_media_id' => [12]], ['cover_media_id' => '12', 'cover_upload_index' => '0'],
    ['retained_media_ids' => 'malformed'], ['retained_media_ids' => '{"id":12}'], ['retained_media_ids' => '{}'], ['retained_media_ids' => '{"0":12}'], ['retained_media_ids' => '[0]'],
] as $input) {
    $reject(fn () => PropertyMediaSelection::withUploads([], $input, ['staged-a.jpg']), 'Malformed cover or retained photo controls fail before changing the listing.');
}

echo "Property media cover: {$checks} isolated checks passed; SQLite memory only, no live database writes.\n";
