<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/PropertyEvidenceFiles.php';
header('Cache-Control: private, no-store, max-age=0');

api_handle(function (array $container): array {
    if (request_method() !== 'GET') { return [405, ['error' => 'Method not allowed.']]; }
    $user = sfc_current_user();
    if ($user === null || !sfc_can_manage_properties($user)) { return [403, ['error' => 'A city department account is required to download site evidence.']]; }
    $propertyId = int_or_null($_GET['propertyId'] ?? null);
    $attachmentId = $_GET['attachmentId'] ?? null;
    if ($propertyId === null || $propertyId < 1 || !is_string($attachmentId) || !preg_match('/^[a-f0-9]{32}$/D', $attachmentId)) { throw new InvalidArgumentException('Choose a valid property evidence attachment.'); }
    $property = $container['properties']->find($propertyId, $user);
    $attachments = \App\Support\PropertyEvidenceFiles::normalizeAttachments($property['parcel']['attachments'] ?? []);
    $match = null;
    foreach ($attachments as $attachment) { if (hash_equals($attachment['id'], $attachmentId)) { $match = $attachment; break; } }
    if ($match === null) { throw new OutOfBoundsException('This property evidence attachment was not found.'); }
    $path = \App\Support\PropertyEvidenceFiles::locate($match);
    $stream = fopen($path, 'rb');
    if ($stream === false) { throw new OutOfBoundsException('This property evidence file is unavailable.'); }
    if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }
    header('Content-Type: ' . $match['mime']);
    header('Content-Length: ' . $match['size']);
    header('Content-Disposition: attachment; filename="property-evidence.' . \App\Support\PropertyEvidenceFiles::extension($match['mime']) . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, max-age=0');
    fpassthru($stream);
    fclose($stream);
    exit;
});
