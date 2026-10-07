<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_listing-policy.php';
require_once dirname(__DIR__) . '/app/Support/PropertyNearby.php';
require_once dirname(__DIR__) . '/app/Support/PropertyEvidenceFiles.php';

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();
    if ($method === 'GET') {
        $properties = $container['properties']->all($user);
        $propertyIds = array_column($properties, 'id');
        $brokers = [];
        if ($user !== null && sfc_can_manage_properties($user)) {
            $brokers = $container['pdo']->query("SELECT u.id, u.name, sp.phone FROM users u INNER JOIN seller_profiles sp ON sp.user_id = u.id WHERE u.role = 'seller' AND u.identity_verification_status = 'verified' AND sp.application_status = 'verified' AND sp.seller_type = 'broker' AND sp.prc_registration_no REGEXP '^[0-9]{1,20}$' AND sp.prc_valid_until >= DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)) ORDER BY u.name")->fetchAll();
        }
        return [
            'properties' => $container['decisionEngine']->decorateProperties($properties, [
                'voteSummaries' => $container['votes']->summaryMap($propertyIds),
                'messageSummaries' => $container['messages']->propertySummaryMap($propertyIds),
            ]),
            'categories' => \App\Support\PropertyCatalog::categories(),
            'criteria' => \App\Support\PropertyCatalog::criteria(),
            'approvedBrokers' => $brokers,
            'previewLimit' => $user === null ? 3 : null,
        ];
    }
    if ($method === 'POST') {
        if ($user === null || (!sfc_can_manage_properties($user) && ($user['role'] ?? '') !== 'seller')) {
            return [403, ['error' => 'A department or approved broker account is required.']];
        }
        if (($user['role'] ?? '') === 'seller' && !sfc_broker_can_submit($user)) {
            return [403, ['error' => 'Your broker application is awaiting CICTO approval.']];
        }
        if (!sfc_can_manage_properties($user) && \App\Support\PropertyEvidenceFiles::uploadEntries($_FILES['evidence_files'] ?? null) !== []) {
            return [403, ['error' => 'A city department account is required to attach assessment evidence.']];
        }
        $payload = sfc_listing_payload(read_request_input(), $user, true);
        $payload = \App\Support\PropertyNearby::withUploads($payload, $_FILES);
        $image = store_uploaded_property_image($_FILES['image_file'] ?? null);
        if ($image !== null) {
            $payload['image_path'] = $image;
        }
        $evidence = ['created' => []];
        if (sfc_can_manage_properties($user)) {
            $evidence = \App\Support\PropertyEvidenceFiles::stage($_FILES['evidence_files'] ?? null);
            $payload['evidence_attachments'] = $evidence['attachments'];
        }
        try {
            $property = $container['properties']->create($payload, $user);
        } catch (Throwable $error) {
            \App\Support\PropertyEvidenceFiles::discard($evidence['created']);
            throw $error;
        }
        $container['line']->onListingCreated($property, $user);
        return [201, ['property' => $container['decisionEngine']->decorateProperty($property)]];
    }
    return [405, ['error' => 'Method not allowed.']];
});
