<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

// Image responses use the same refreshed session and permissions as application APIs.
try {
    if (!in_array(request_method(), ['GET', 'HEAD'], true)) {
        respond_json(['error' => 'Method not allowed.'], 405);
        exit;
    }
    $user = sfc_current_user();
    $targetUserId = int_or_null($_GET['userId'] ?? null);
    if ($user === null || $targetUserId === null || $targetUserId < 1 || ((int) ($user['id'] ?? 0) !== $targetUserId && !sfc_can_review_brokers($user))) {
        respond_json(['error' => 'You do not have access to this private document.'], 403);
        exit;
    }
    $side = (string) ($_GET['side'] ?? '');
    $documentId = string_or_null($_GET['documentId'] ?? null);
    $metadata = $container['sellerProfiles']->documentMetadataForUser($targetUserId, $side, $documentId);
    if ($metadata === null) {
        respond_json(['error' => 'PRC document not found.'], 404);
        exit;
    }
    $container['brokerDocuments']->assertStored($metadata);
    $path = $container['brokerDocuments']->pathForId($metadata['id']);
    header('Content-Type: ' . $metadata['mime']);
    header('Content-Length: ' . (int) $metadata['size']);
    header('Content-Disposition: inline; filename="prc-' . $side . '.' . match ($metadata['mime']) { 'image/jpeg' => 'jpg', 'image/png' => 'png', default => 'webp' } . '"');
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'; sandbox");
    if (request_method() !== 'HEAD') { readfile($path); }
} catch (InvalidArgumentException $exception) {
    respond_json(['error' => $exception->getMessage()], 400);
} catch (Throwable) {
    respond_json(['error' => 'Unable to read the private PRC document. Contact support.'], 500);
}
