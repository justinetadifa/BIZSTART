<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/PropertyAuthorityToSellFiles.php';
header('Cache-Control: private, no-store, max-age=0');

api_handle(function (array $container): array {
    if (request_method() !== 'GET') {
        return [405, ['error' => 'Method not allowed.']];
    }

    $user = sfc_current_user();
    if ($user === null) {
        return [401, ['error' => 'Authentication required.']];
    }

    $propertyId = int_or_null($_GET['id'] ?? $_GET['propertyId'] ?? null);
    if ($propertyId === null || $propertyId < 1) {
        throw new InvalidArgumentException('Valid property ID required.');
    }

    $property = $container['properties']->find($propertyId, $user);
    $sellerUserId = (int) ($property['sellerUserId'] ?? 0);
    $isCityStaff = sfc_can_manage_properties($user);
    $isOwnerBroker = ($user['role'] ?? '') === 'seller' && (int) ($user['id'] ?? 0) === $sellerUserId;

    if (!$isCityStaff && !$isOwnerBroker) {
        return [403, ['error' => 'Access denied. Authority to Sell is restricted to city reviewers and the listing broker.']];
    }

    $authority = $property['authorityToSell'] ?? null;
    if ($authority === null || empty($authority['id'])) {
        throw new OutOfBoundsException('No Authority to Sell document on record.');
    }

    $path = \App\Support\PropertyAuthorityToSellFiles::locate($authority);
    $stream = fopen($path, 'rb');
    if ($stream === false) {
        throw new OutOfBoundsException('The Authority to Sell file is temporarily unavailable.');
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    header('Content-Type: ' . $authority['mime']);
    header('Content-Length: ' . (string) $authority['size']);
    header('Content-Disposition: inline; filename="' . basename($authority['label']) . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, max-age=0');

    fpassthru($stream);
    fclose($stream);
    exit;
});
