<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Support/PropertyEvidenceFiles.php';
require_once dirname(__DIR__) . '/app/Support/PropertyParcel.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';
use App\Support\PropertyEvidenceFiles as Evidence;
use App\Support\PropertyParcel;
use App\Repositories\PropertyRepository;
$checks = 0;
$check = static function (bool $condition, string $message) use (&$checks): void {
    if (!$condition) { throw new RuntimeException($message); } $checks++;
};
$reject = static function (callable $operation) use ($check): void {
    try { $operation(); } catch (InvalidArgumentException) { $check(true, 'Rejected malformed evidence.'); return; }
    throw new RuntimeException('Malformed evidence was accepted.');
};
$attachment = ['id' => str_repeat('a', 32), 'label' => 'Site visit.pdf', 'mime' => 'application/pdf', 'size' => 120, 'uploadedAt' => '2026-10-07T12:00:00+00:00'];
$check(Evidence::normalizeAttachments([$attachment]) === [$attachment], 'Valid private attachment metadata changed.');
foreach (['id' => '../file', 'label' => "bad\nname", 'mime' => 'image/svg+xml', 'size' => Evidence::MAX_BYTES + 1, 'uploadedAt' => '2026-99-99T99:99:99+00:00'] as $key => $value) {
    $reject(static fn () => Evidence::normalizeAttachments([array_replace($attachment, [$key => $value])]));
}
$reject(static fn () => Evidence::normalizeAttachments([$attachment, $attachment]));
$emptyUpload = ['name' => [''], 'tmp_name' => [''], 'error' => [UPLOAD_ERR_NO_FILE], 'size' => [0], 'type' => ['']];
$check(Evidence::uploadEntries($emptyUpload) === [], 'Optional files must accept an empty picker.');
$check(Evidence::stage(null, [$attachment])['attachments'] === [$attachment], 'Unrelated updates must retain saved attachments.');
foreach ([[], 'file', array_replace($emptyUpload, ['error' => [UPLOAD_ERR_INI_SIZE]]), array_replace($emptyUpload, ['name' => [['nested']]]), array_replace($emptyUpload, ['tmp_name' => []]), array_replace($emptyUpload, ['error' => ['0']])] as $invalid) {
    $reject(static fn () => Evidence::uploadEntries($invalid));
}
$fakeUpload = ['name' => ['fake.png'], 'tmp_name' => [__FILE__], 'error' => [UPLOAD_ERR_OK], 'size' => [1], 'type' => ['image/png']];
$reject(static fn () => Evidence::stage($fakeUpload));
$parcel = PropertyParcel::fromPayload(['evidence_attachments' => [$attachment]]);
$check($parcel['attachments'] === [$attachment] && PropertyParcel::fromPayload([], $parcel)['attachments'] === [$attachment], 'Parcel updates must preserve private evidence.');
$staff = ['id' => 1, 'role' => 'admin', 'department' => 'CICTO'];
$payload = sfc_listing_payload(['evidence_attachments' => [$attachment], 'attachments' => [$attachment], 'parcel_json' => '{}', 'parcel' => ['attachments' => [$attachment]]], $staff, true);
$check(!isset($payload['evidence_attachments'], $payload['attachments'], $payload['parcel_json'], $payload['parcel']), 'Browser metadata must not authorize private attachments.');
$repository = new PropertyRepository(new class extends PDO { public function __construct() {} });
$present = new ReflectionMethod($repository, 'presentProperties'); $present->setAccessible(true);
$property = ['parcel' => $parcel];
$investor = $present->invoke($repository, [$property], ['id' => 2, 'role' => 'investor']);
$check(!isset($investor[0]['parcel']['attachments']), 'Investors must not receive staff-private attachment filenames.');
$check($present->invoke($repository, [$property], $staff)[0]['parcel']['attachments'] === [$attachment], 'Staff must retain access to attachment metadata.');
$normalize = new ReflectionMethod($repository, 'normalizePropertyPayload'); $normalize->setAccessible(true);
$saved = $normalize->invoke($repository, ['name' => 'Evidence preservation fixture', 'property_type' => 'commercial', 'category' => 'Land', 'lat' => 16.61, 'lng' => 120.32, 'land_area' => 1000, 'land_area_unit' => 'sqm', 'evidence_attachments' => [$attachment]]);
$broker = ['id' => 3, 'role' => 'seller', 'identityVerificationStatus' => 'verified', 'name' => 'Broker test', 'email' => 'broker@example.test'];
$brokerPayload = sfc_listing_payload(['description' => 'Broker edit', 'evidence_attachments' => []], $broker, false);
$brokerEdit = $normalize->invoke($repository, $brokerPayload, $saved);
$check(json_decode($brokerEdit['parcel_json'], true)['attachments'] === [$attachment], 'Broker edits must preserve existing private staff evidence.');
$directory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'locus_evidence_' . bin2hex(random_bytes(8));
if (!mkdir($directory)) { throw new RuntimeException('Unable to create isolated test fixtures.'); }
$fixture = $directory . DIRECTORY_SEPARATOR . 'fixture';
try {
    $png = file_get_contents(dirname(__DIR__) . '/assets/icons/propertyinfo.png');
    file_put_contents($fixture, $png);
    $check(Evidence::fileMetadata($fixture)['mime'] === 'image/png', 'A real PNG must be accepted using server MIME detection.');
    file_put_contents($fixture, substr($png, 0, -12)); $reject(static fn () => Evidence::fileMetadata($fixture));
    file_put_contents($fixture, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'); $reject(static fn () => Evidence::fileMetadata($fixture));
    file_put_contents($fixture, '%PDF-1.4' . "\nnot a document\n%%EOF\n"); $reject(static fn () => Evidence::fileMetadata($fixture));
    $pdf = "%PDF-1.4\n"; $offsets = [0];
    foreach (['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>'] as $index => $object) {
        $offsets[] = strlen($pdf); $pdf .= ($index + 1) . " 0 obj\n$object\nendobj\n";
    }
    $xref = strlen($pdf); $pdf .= "xref\n0 4\n0000000000 65535 f \n";
    foreach (array_slice($offsets, 1) as $offset) { $pdf .= sprintf("%010d 00000 n \n", $offset); }
    $pdf .= "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
    file_put_contents($fixture, $pdf);
    $check(Evidence::fileMetadata($fixture)['mime'] === 'application/pdf', 'A structurally valid PDF must be accepted.');
    file_put_contents($fixture, substr($pdf, 0, -9)); $reject(static fn () => Evidence::fileMetadata($fixture));
    file_put_contents($fixture, ''); $reject(static fn () => Evidence::fileMetadata($fixture));
    $handle = fopen($fixture, 'wb'); fseek($handle, Evidence::MAX_BYTES); fwrite($handle, 'x'); fclose($handle); clearstatcache(true, $fixture);
    $reject(static fn () => Evidence::fileMetadata($fixture));
    foreach (glob(dirname(__DIR__) . '/assets/images/*.jpg') as $image) {
        if (filesize($image) <= Evidence::MAX_BYTES) { $check(Evidence::fileMetadata($image)['mime'] === 'image/jpeg', 'An existing property JPEG must pass structural screening.'); break; }
    }
} finally {
    if (is_file($fixture)) { unlink($fixture); } rmdir($directory);
}
echo "Property evidence checks passed: $checks\n";
