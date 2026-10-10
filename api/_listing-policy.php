<?php
declare(strict_types=1);

function sfc_listing_payload(array $payload, array $user, bool $creating, ?array $existing = null): array
{
    // Lifecycle metadata is exclusively written by the audited lifecycle operations.
    unset($payload['deleted_at'], $payload['deletedAt'], $payload['deleted_by_user_id'], $payload['isDeleted'], $payload['archived_at'], $payload['archivedAt'], $payload['archived_by_user_id'], $payload['isArchived']);
    if (($user['role'] ?? '') === 'seller') {
        if (strtolower((string) ($user['identityVerificationStatus'] ?? '')) !== 'verified') {
            throw new InvalidArgumentException('CICTO must approve your broker account before you submit listings.');
        }
        // An allowlist prevents assignment, review and assessment fields being injected.
        $allowed = ['property_name', 'name', 'property_type', 'type', 'category', 'subcategory', 'city', 'barangay', 'description', 'price', 'land_area', 'area', 'land_area_unit', 'landAreaUnit', 'area_method', 'lat', 'lng', 'corridor', 'status', 'tags', 'tags_csv', 'facilities', 'facilities_csv', 'image_path', 'imageUrl', 'remove_image', 'owner_name', 'owner_email', 'owner_phone', 'owner_company', 'ownerContact', 'contactMode', 'contact_mode', 'nearbyProperties', 'boundary', 'reference_lat', 'reference_lng', 'reference_label', 'road_frontage', 'road_surface', 'electricity', 'water', 'internet', 'bir_zonal_value', 'bir_source', 'bir_date', 'evidence_reference', 'environmental_reference', 'existing_land_use', 'existingLandUse', 'zoning_classification', 'zoningClassification', 'clup_source_reference', 'clupSourceReference', 'readiness_notes', 'readinessNotes', 'assessmentTags', 'assessment_tags'];
        $allowed = array_merge($allowed, ['listing_purpose', 'listingPurpose', 'sale_price', 'salePrice', 'sale_price_mode', 'lease_price', 'leasePrice', 'lease_price_mode', 'lease_period', 'leasePeriod', 'lease_price_unit', 'leasePriceUnit']);
        $allowed = array_merge($allowed, [
            'clup_allowed_uses', 'clupAllowedUses',
            'electricity_sources', 'water_sources', 'internet_providers', 'internet_types', 'internet_quality', 'download_speed_mbps', 'utilities',
            'electricity_status', 'electricity_primary_supply', 'electricity_provider', 'electricity_backup', 'electricity_capacity',
            'water_status', 'water_source', 'water_provider', 'water_capacity',
            'internet_status', 'internet_technology',
            'drainage_service', 'wastewater_service', 'waste_collection_service',
            'access_route_condition', 'distance_to_highway', 'assessed_market_value', 'commercial_corridor', 'nearby_analysis_origin',
            'spatial_evidence_source', 'spatial_evidence_date', 'spatial_evidence_reference',
            'utility_evidence_source', 'utility_evidence_date', 'utility_evidence_reference',
            'economic_evidence_source', 'economic_evidence_date', 'economic_evidence_reference',
            'nearby_evidence_source', 'nearby_evidence_date', 'nearby_evidence_reference',
            'zoning_evidence_source', 'zoning_evidence_date', 'zoning_evidence_reference',
            'hazard_evidence_source', 'hazard_evidence_date', 'hazard_evidence_reference',
            'environmental_evidence_source', 'environmental_evidence_date', 'environmental_evidence_reference',
            'sensitive_habitats', 'protected_area_overlap', 'documented_contamination',
            'authority_to_sell', 'authorityToSell',
        ]);
        $payload = array_intersect_key($payload, array_flip($allowed));
        $payload['seller_user_id'] = (int) $user['id'];
        $payload['owner_name'] = $payload['owner_name'] ?? $user['name'];
        $payload['owner_email'] = $payload['owner_email'] ?? $user['email'];
        $payload['approval_state'] = 'pending_review';
        $payload['assessmentCriteria'] = [];
        $payload['documents_reviewed'] = false;
        $payload['site_verified'] = false;
        $payload['clup_verified'] = false;
        if (($payload['contactMode'] ?? $payload['contact_mode'] ?? 'open_listing') === 'broker') {
            $payload['contactBrokerUserId'] = (int) $user['id'];
        }
    } elseif (sfc_can_manage_properties($user)) {
        unset($payload['seller_identity_verification_status'], $payload['sellerIdentityVerificationStatus']);
        $requestedApproval = $payload['approval_state'] ?? $payload['approvalState'] ?? null;
        if ($requestedApproval !== null) {
            if (!is_string($requestedApproval)) {
                throw new InvalidArgumentException('Choose a valid listing review status.');
            }
            $requestedApproval = strtolower(trim($requestedApproval));
            if (($existing['approvalState'] ?? '') === 'archived') {
                throw new InvalidArgumentException('Restore the archived listing before changing its review status.');
            }
            if (!in_array($requestedApproval, ['draft', 'pending_review', 'approved', 'rejected'], true)) {
                throw new InvalidArgumentException('Choose a valid listing review status.');
            }
            $payload['approval_state'] = $requestedApproval;
            unset($payload['approvalState']);
        }
        if ($requestedApproval !== null && $requestedApproval !== 'pending_review' && !sfc_can_review_listings($user)) {
            throw new InvalidArgumentException('CICTO reviews and approves listings.');
        }
        if (!$creating && isset($payload['seller_user_id']) && (int) $payload['seller_user_id'] !== (int) ($existing['sellerUserId'] ?? 0)) {
            throw new InvalidArgumentException('The submitting broker cannot be reassigned. Use the contact broker field.');
        }
        if (!$creating && isset($payload['sellerUserId']) && (int) $payload['sellerUserId'] !== (int) ($existing['sellerUserId'] ?? 0)) {
            throw new InvalidArgumentException('The submitting broker cannot be reassigned.');
        }
        if ($creating) {
            $payload['approval_state'] = 'pending_review';
            $payload['seller_user_id'] = null;
            unset($payload['sellerUserId']);
        } elseif (in_array($requestedApproval, ['approved', 'rejected'], true)) {
            if ((int) ($existing['sellerUserId'] ?? 0) === (int) $user['id']) {
                throw new InvalidArgumentException('You cannot review your own listing.');
            }
            if (trim((string) ($payload['reviewNote'] ?? $payload['review_note'] ?? '')) === '') {
                throw new InvalidArgumentException('Add a review message for the broker.');
            }
            if ($requestedApproval === 'approved' && (int) ($existing['sellerUserId'] ?? 0) > 0 && !($existing['sellerBrokerVerified'] ?? false)) {
                throw new InvalidArgumentException('Approve the broker account before approving the listing.');
            }
        } elseif (($existing['approvalState'] ?? '') === 'approved') {
            $payload['approval_state'] = 'pending_review';
        }
    } else {
        throw new InvalidArgumentException('This account cannot manage listings.');
    }
    // Numerical assessments and evidence are generated from trusted server sources only.
    foreach (['assessmentCriteria', 'assessment_criteria', 'assessment_json', 'automatic_assessment_json', 'legacy_assessment_json', 'automaticAssessment', 'criteriaDetails', 'mceScore', 'iaiScore', 'assessmentMode', 'assessmentVersion', 'spatialContext', 'evidence_attachments', 'attachments', 'parcel', 'parcel_json'] as $field) {
        unset($payload[$field]);
    }
    $recalculate = filter_var($payload['recalculate_assessment'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $payload['recalculate_assessment'] = $recalculate && (sfc_can_manage_properties($user) || sfc_broker_can_submit($user));
    $payload['last_confirmed_available_at'] = gmdate('Y-m-d H:i:s');
    return $payload;
}
