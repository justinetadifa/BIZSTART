<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Support\JsonData;
use App\Support\PropertyCatalog;
use App\Support\PropertyAssessment;
use App\Support\AutomaticPropertyAssessment;
use App\Support\PropertyNearby;
use App\Support\PropertyParcel;
use InvalidArgumentException;
use OutOfBoundsException;
use PDO;
use Throwable;

require_once dirname(__DIR__) . '/Support/PropertyCatalog.php';
require_once dirname(__DIR__) . '/Support/PropertyAssessment.php';
require_once dirname(__DIR__) . '/Support/AutomaticPropertyAssessment.php';
require_once dirname(__DIR__) . '/Support/PropertyNearby.php';
require_once dirname(__DIR__) . '/Support/PropertyParcel.php';
require_once dirname(__DIR__) . '/Support/auth.php';

final class PropertyRepository
{
    private const DEFAULT_CITY = 'San Fernando, La Union';
    private const APPROVAL_STATES = ['draft', 'pending_review', 'approved', 'rejected', 'archived'];
    private const READINESS_PILLAR_WEIGHTS = [
        'spatial' => 18,
        'infrastructure' => 22,
        'economic' => 22,
        'institutional' => 18,
        'legal' => 20,
    ];
    private const DOCUMENT_REQUIREMENTS = [
        ['key' => 'title_copy', 'label' => 'Title Copy'],
        ['key' => 'tax_declaration', 'label' => 'Tax Declaration'],
        ['key' => 'survey_plan', 'label' => 'Survey Plan'],
        ['key' => 'zoning_clearance', 'label' => 'Zoning Clearance'],
        ['key' => 'site_photos', 'label' => 'Site Photos'],
        ['key' => 'hazard_report', 'label' => 'Hazard / Environmental Report'],
    ];
    private const DOCUMENT_PROGRESS = [
        'missing' => 0,
        'requested' => 25,
        'submitted' => 75,
        'reviewed' => 100,
    ];
    private const UTILITY_STATUS_SCORES = [
        'full_ready' => 100,
        'power_water' => 82,
        'partial' => 62,
        'limited' => 40,
        'off_grid' => 18,
    ];
    private const UTILITY_STATUS_LABELS = [
        'full_ready' => 'Full Fiber / Power / Water',
        'power_water' => 'Power / Water Ready',
        'partial' => 'Partial Utility Service',
        'limited' => 'Limited Utility Service',
        'off_grid' => 'Off Grid',
    ];

    private PDO $pdo;
    private ?AuditLogRepository $auditLogs;

    public function __construct(PDO $pdo, ?AuditLogRepository $auditLogs = null)
    {
        $this->pdo = $pdo;
        $this->auditLogs = $auditLogs;
    }

    public function all(?array $user = null): array
    {
        $params = [];
        $sql = $this->baseSelect();
        $visibility = $this->visibilityCondition($user, $params);
        if ($visibility !== '') {
            $sql .= ' WHERE ' . $visibility;
        }
        $sql .= ' ORDER BY p.created_at DESC, p.id DESC';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        $rows = $statement->fetchAll();

        return $this->presentProperties($this->hydrateProperties($rows), $user);
    }

    public function find(int $propertyId, ?array $user = null): array
    {
        return $this->presentProperties($this->hydrateProperties([$this->rawPropertyRow($propertyId, $user, true)]), $user)[0];
    }

    public function create(array $payload, ?array $actor = null): array
    {
        $property = $this->normalizePropertyPayload($payload);
        $property['created_by_user_id'] = isset($actor['id']) ? (int) $actor['id'] : null;

        $statement = $this->pdo->prepare(
            'INSERT INTO properties (
                name, city, lat, lng, area, listing_purpose, price, lease_price, lease_period, lease_price_unit, price_per_sqm, status, approval_state, score, type, corridor,
                tags_json, facilities_json, road_access, image_url, description, barangay, owner_contact_json,
                documents_json, seller_user_id, documents_reviewed_at, site_verified_at, last_confirmed_available_at,
                dist_to_road_km, utility_status, zoning_score, existing_land_use, zoning_classification,
                clup_allowed_uses_json, clup_conditional_uses_json, clup_restricted_uses_json, clup_source_reference,
                clup_verified_at, assessed_value_sqm, readiness_notes,
                category, subcategory, assessment_json, automatic_assessment_json, legacy_assessment_json, assessment_tags_json, nearby_properties_json, parcel_json, contact_mode, contact_broker_user_id, review_note, created_by_user_id
            ) VALUES (
                :name, :city, :lat, :lng, :area, :listing_purpose, :price, :lease_price, :lease_period, :lease_price_unit, :price_per_sqm, :status, :approval_state, :score, :type, :corridor,
                :tags_json, :facilities_json, :road_access, :image_url, :description, :barangay, :owner_contact_json,
                :documents_json, :seller_user_id, :documents_reviewed_at, :site_verified_at, :last_confirmed_available_at,
                :dist_to_road_km, :utility_status, :zoning_score, :existing_land_use, :zoning_classification,
                :clup_allowed_uses_json, :clup_conditional_uses_json, :clup_restricted_uses_json, :clup_source_reference,
                :clup_verified_at, :assessed_value_sqm, :readiness_notes,
                :category, :subcategory, :assessment_json, :automatic_assessment_json, :legacy_assessment_json, :assessment_tags_json, :nearby_properties_json, :parcel_json, :contact_mode, :contact_broker_user_id, :review_note, :created_by_user_id
            )'
        );

        $this->pdo->beginTransaction();

        try {
            $statement->execute($property);
            $propertyId = (int) $this->pdo->lastInsertId();

            $this->syncPrimaryMedia($propertyId, $property['image_url'], $property['name']);
            $this->ensureDueDiligenceRecord($propertyId);
            $created = $this->rawPropertyRow($propertyId, null, false);
            $this->recordPropertyAudit('CREATE', $propertyId, null, $created, $actor);
            $result = $this->presentEvidence($this->hydrateProperties([$created])[0], $actor);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
        return $result;
    }

    public function update(int $propertyId, array $payload, ?array $actor = null): array
    {
        $existing = $this->rawPropertyRow($propertyId, null, false);
        if (!empty($existing['deleted_at'])) {
            throw new InvalidArgumentException('Restore this property from Recently deleted before editing it.');
        }
        $property = $this->normalizePropertyPayload($payload, $existing);
        $property['id'] = $propertyId;

        $statement = $this->pdo->prepare(
            'UPDATE properties SET
                name = :name,
                city = :city,
                lat = :lat,
                lng = :lng,
                area = :area,
                listing_purpose = :listing_purpose,
                price = :price,
                lease_price = :lease_price,
                lease_period = :lease_period,
                lease_price_unit = :lease_price_unit,
                price_per_sqm = :price_per_sqm,
                status = :status,
                approval_state = :approval_state,
                score = :score,
                type = :type,
                corridor = :corridor,
                tags_json = :tags_json,
                facilities_json = :facilities_json,
                road_access = :road_access,
                image_url = :image_url,
                description = :description,
                barangay = :barangay,
                owner_contact_json = :owner_contact_json,
                documents_json = :documents_json,
                seller_user_id = :seller_user_id,
                documents_reviewed_at = :documents_reviewed_at,
                site_verified_at = :site_verified_at,
                last_confirmed_available_at = :last_confirmed_available_at,
                dist_to_road_km = :dist_to_road_km,
                utility_status = :utility_status,
                zoning_score = :zoning_score,
                existing_land_use = :existing_land_use,
                zoning_classification = :zoning_classification,
                clup_allowed_uses_json = :clup_allowed_uses_json,
                clup_conditional_uses_json = :clup_conditional_uses_json,
                clup_restricted_uses_json = :clup_restricted_uses_json,
                clup_source_reference = :clup_source_reference,
                clup_verified_at = :clup_verified_at,
                assessed_value_sqm = :assessed_value_sqm,
                readiness_notes = :readiness_notes,
                category = :category,
                subcategory = :subcategory,
                assessment_json = :assessment_json,
                automatic_assessment_json = :automatic_assessment_json,
                legacy_assessment_json = :legacy_assessment_json,
                assessment_tags_json = :assessment_tags_json,
                nearby_properties_json = :nearby_properties_json,
                parcel_json = :parcel_json,
                contact_mode = :contact_mode,
                contact_broker_user_id = :contact_broker_user_id,
                review_note = :review_note
             WHERE id = :id'
        );

        $this->pdo->beginTransaction();

        try {
            $statement->execute($property);
            $this->syncPrimaryMedia($propertyId, $property['image_url'], $property['name']);
            $this->ensureDueDiligenceRecord($propertyId);
            $updated = $this->rawPropertyRow($propertyId, null, false);
            $this->recordPropertyAudit('EDIT', $propertyId, $existing, $updated, $actor);
            $result = $this->presentEvidence($this->hydrateProperties([$updated])[0], $actor);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
        return $result;
    }

    public function delete(int $propertyId, ?array $actor = null): void
    {
        $this->changeLifecycle($propertyId, 'delete', null, $actor);
    }

    public function restore(int $propertyId, ?array $actor = null): array
    {
        return $this->changeLifecycle($propertyId, 'restore', null, $actor);
    }

    public function setAvailability(int $propertyId, string $status, ?array $actor = null): array
    {
        $normalized = $this->normalizeAvailability($status);
        if ($normalized === 'Availed') {
            throw new InvalidArgumentException('Availed is a historical status. Choose Sold or Leased for a new transaction.');
        }
        return $this->changeLifecycle($propertyId, 'availability', $normalized, $actor);
    }

    public function archive(int $propertyId, ?array $actor = null): array
    {
        return $this->changeLifecycle($propertyId, 'archive', null, $actor);
    }

    public function unarchive(int $propertyId, ?array $actor = null): array
    {
        return $this->changeLifecycle($propertyId, 'unarchive', null, $actor);
    }

    private function changeLifecycle(int $propertyId, string $action, ?string $status, ?array $actor): array
    {
        $cityManager = $actor !== null && sfc_can_manage_properties($actor);
        $ownBrokerArchive = in_array($action, ['archive', 'unarchive'], true)
            && ($actor['role'] ?? '') === 'seller'
            && strtolower((string) ($actor['identityVerificationStatus'] ?? $actor['identity_verification_status'] ?? '')) === 'verified';
        if (!$cityManager && !$ownBrokerArchive) {
            throw new InvalidArgumentException('This account cannot perform this listing management action.');
        }
        $this->pdo->beginTransaction();
        try {
            // Serialize lifecycle changes without deleting inquiries, evidence or audit history.
            $lock = $this->pdo->prepare('SELECT id FROM properties WHERE id = :id FOR UPDATE');
            $lock->execute(['id' => $propertyId]);
            $existing = $this->rawPropertyRow($propertyId, null, false);
            if (!$cityManager && (int) ($existing['seller_user_id'] ?? 0) !== (int) ($actor['id'] ?? 0)) {
                throw new InvalidArgumentException('You can only archive or unarchive your own listings.');
            }
            if ($action === 'restore') {
                if (empty($existing['deleted_at'])) { throw new InvalidArgumentException('This property is not in Recently deleted.'); }
                // Deletion leaves status, moderation and archive state intact.
                $statement = $this->pdo->prepare('UPDATE properties SET deleted_at = NULL, deleted_by_user_id = NULL WHERE id = :id');
                $statement->execute(['id' => $propertyId]);
            } elseif ($action === 'delete') {
                if (!empty($existing['deleted_at'])) { throw new InvalidArgumentException('This property is already in Recently deleted.'); }
                $statement = $this->pdo->prepare('UPDATE properties SET deleted_at = UTC_TIMESTAMP(), deleted_by_user_id = :actor WHERE id = :id');
                $statement->execute(['id' => $propertyId, 'actor' => (int) $actor['id']]);
            } elseif ($action === 'archive' || $action === 'unarchive') {
                if (!empty($existing['deleted_at'])) { throw new InvalidArgumentException('Restore this property before changing its archive state.'); }
                $isArchived = !empty($existing['archived_at']) || ($existing['approval_state'] ?? '') === 'archived';
                if ($action === 'archive') {
                    if ($isArchived) { throw new InvalidArgumentException('This property is already archived.'); }
                    $statement = $this->pdo->prepare('UPDATE properties SET archived_at = UTC_TIMESTAMP(), archived_by_user_id = :actor WHERE id = :id');
                    $statement->execute(['id' => $propertyId, 'actor' => (int) $actor['id']]);
                } else {
                    if (!$isArchived) { throw new InvalidArgumentException('This property is not archived.'); }
                    // Historical archives did not retain their previous review state.
                    $statement = $this->pdo->prepare("UPDATE properties SET archived_at = NULL, archived_by_user_id = NULL, approval_state = CASE WHEN approval_state = 'archived' THEN 'pending_review' ELSE approval_state END WHERE id = :id");
                    $statement->execute(['id' => $propertyId]);
                }
            } else {
                if (!empty($existing['deleted_at'])) { throw new InvalidArgumentException('Restore this property before changing availability.'); }
                $statement = $this->pdo->prepare('UPDATE properties SET status = :status, last_confirmed_available_at = CASE WHEN :is_available = 1 THEN UTC_TIMESTAMP() ELSE NULL END WHERE id = :id');
                $statement->execute(['id' => $propertyId, 'status' => $status, 'is_available' => $status === 'Available' ? 1 : 0]);
            }
            $updated = $this->rawPropertyRow($propertyId, null, false);
            $this->recordPropertyAudit($action === 'availability' ? 'EDIT' : strtoupper($action), $propertyId, $existing, $updated, $actor);
            $result = $this->presentEvidence($this->hydrateProperties([$updated])[0], $actor);
            $this->pdo->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) { $this->pdo->rollBack(); }
            throw $exception;
        }
    }

    private function normalizeAvailability(string $value): string
    {
        return match (strtolower(trim($value))) {
            'available', 'active', 'open' => 'Available',
            'unavailable' => 'Unavailable',
            'reserved', 'under review', 'pending' => 'Reserved',
            'sold' => 'Sold',
            'leased' => 'Leased',
            'availed', 'taken' => 'Availed',
            default => throw new InvalidArgumentException('Choose Available, Reserved, Unavailable, Sold or Leased.'),
        };
    }

    public function updateBarangay(int $propertyId, ?string $barangay): array
    {
        $statement = $this->pdo->prepare('UPDATE properties SET barangay = :barangay WHERE id = :id');
        $statement->execute([
            'barangay' => $barangay,
            'id' => $propertyId,
        ]);

        return $this->hydrateProperties([$this->rawPropertyRow($propertyId, null, false)])[0];
    }

    public function isOwnedBySeller(int $propertyId, int $sellerUserId): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT id
             FROM properties
             WHERE id = :id
               AND seller_user_id = :seller_user_id
             LIMIT 1'
        );
        $statement->execute([
            'id' => $propertyId,
            'seller_user_id' => $sellerUserId,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function dueDiligenceState(int $propertyId): array
    {
        $statement = $this->pdo->prepare(
            'SELECT state_json FROM property_due_diligence WHERE property_id = :property_id LIMIT 1'
        );
        $statement->execute(['property_id' => $propertyId]);
        $row = $statement->fetch();

        if (!$row) {
            return [];
        }

        return $this->decodeJson($row['state_json'] ?? '{}');
    }

    public function saveDueDiligenceState(int $propertyId, array $state, ?array $actor = null): array
    {
        $before = $this->dueDiligenceState($propertyId);
        $statement = $this->pdo->prepare(
            'INSERT INTO property_due_diligence (property_id, state_json)
             VALUES (:property_id, :state_json)
             ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = CURRENT_TIMESTAMP'
        );
        $this->pdo->beginTransaction();

        try {
            $statement->execute([
                'property_id' => $propertyId,
                'state_json' => json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);

            $after = $this->dueDiligenceState($propertyId);
            if ($this->auditLogs !== null && $before !== $after) {
                $this->auditLogs->record(
                    isset($actor['id']) ? (int) $actor['id'] : null,
                    'EDIT',
                    'PROPERTY',
                    $propertyId,
                    [
                        'actorName' => (string) ($actor['name'] ?? 'Platform User'),
                        'actorRole' => (string) ($actor['role'] ?? 'system'),
                        'eventType' => 'DUE_DILIGENCE_EDIT',
                        'targetLabel' => $this->propertyTargetLabel($propertyId),
                        'summary' => 'Updated due diligence checklist and supporting readiness state.',
                        'before' => $before,
                        'after' => $after,
                        'changedFields' => $this->changedFields($before, $after),
                        'streamGroup' => 'all',
                    ]
                );
            }

            $this->pdo->commit();
            return $after;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function voteTallies(int $propertyId): array
    {
        $statement = $this->pdo->prepare(
            'SELECT label, COUNT(*) AS votes
             FROM property_votes
             WHERE property_id = :property_id
             GROUP BY label
             ORDER BY votes DESC, label ASC'
        );
        $statement->execute(['property_id' => $propertyId]);

        $votes = [];
        foreach ($statement->fetchAll() as $row) {
            $votes[(string) $row['label']] = (int) $row['votes'];
        }

        return $votes;
    }

    public function castVote(int $propertyId, string $label): array
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO property_votes (property_id, label) VALUES (:property_id, :label)'
        );
        $statement->execute([
            'property_id' => $propertyId,
            'label' => $label,
        ]);

        return $this->voteTallies($propertyId);
    }

    public function mapViewport(array $properties): ?array
    {
        if ($properties === []) {
            return null;
        }

        $properties = array_values(array_filter($properties, static fn (array $property): bool => isset($property['lat'], $property['lng'])));
        if ($properties === []) { return null; }
        $latitudes = array_map(static fn (array $property): float => (float) $property['lat'], $properties);
        $longitudes = array_map(static fn (array $property): float => (float) $property['lng'], $properties);

        return [
            'center' => [
                'lat' => round((min($latitudes) + max($latitudes)) / 2, 4),
                'lng' => round((min($longitudes) + max($longitudes)) / 2, 4),
            ],
            'bounds' => [
                'north' => max($latitudes),
                'south' => min($latitudes),
                'east' => max($longitudes),
                'west' => min($longitudes),
            ],
        ];
    }

    private function baseSelect(): string
    {
        return
            'SELECT
                p.*,
                seller.identity_verification_status AS seller_identity_verification_status,
                seller.identity_verified_at AS seller_identity_verified_at,
                CASE WHEN seller.identity_verification_status = \'verified\' AND seller.account_status = \'active\' AND seller.email_verified_at IS NOT NULL AND seller_profile.prc_front_json IS NOT NULL AND seller_profile.prc_back_json IS NOT NULL AND seller_profile.seller_type = \'broker\' AND seller_profile.application_status = \'verified\' AND seller_profile.prc_registration_no REGEXP \'^[0-9]{1,20}$\' AND seller_profile.prc_valid_until >= DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)) THEN 1 ELSE 0 END AS seller_broker_verified,
                broker.name AS contact_broker_name,
                broker.email AS contact_broker_email,
                broker_profile.phone AS contact_broker_phone,
                broker_profile.application_status AS contact_broker_status,
                (SELECT COUNT(*) FROM property_shortlists saved WHERE saved.property_id = p.id) AS save_count
             FROM properties p
             LEFT JOIN users seller ON seller.id = p.seller_user_id
             LEFT JOIN seller_profiles seller_profile ON seller_profile.user_id = seller.id
             LEFT JOIN users broker ON broker.id = p.contact_broker_user_id AND broker.identity_verification_status = \'verified\' AND broker.account_status = \'active\' AND broker.email_verified_at IS NOT NULL
             LEFT JOIN seller_profiles broker_profile ON broker_profile.user_id = broker.id AND broker_profile.seller_type = \'broker\' AND broker_profile.application_status = \'verified\' AND broker_profile.prc_front_json IS NOT NULL AND broker_profile.prc_back_json IS NOT NULL AND broker_profile.prc_registration_no REGEXP \'^[0-9]{1,20}$\' AND broker_profile.prc_valid_until >= DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))';
    }

    private function visibilityCondition(?array $user, array &$params): string
    {
        $role = (string) ($user['role'] ?? 'guest');
        $userId = (int) ($user['id'] ?? 0);

        if ($role === 'admin' && !sfc_can_manage_properties($user)) {
            throw new InvalidArgumentException('A recognized city department account is required.');
        }

        if ($role === 'admin' && sfc_can_manage_properties($user)) {
            return '';
        }

        if ($role === 'seller' && $userId > 0) {
            $params['visible_seller_user_id'] = $userId;
            return 'p.deleted_at IS NULL AND ((p.archived_at IS NULL AND p.approval_state = \'approved\' AND LOWER(p.status) IN (\'available\', \'active\', \'open\')) OR p.seller_user_id = :visible_seller_user_id)';
        }

        if ($userId < 1) {
            return 'p.deleted_at IS NULL AND p.archived_at IS NULL AND p.approval_state = \'approved\' AND LOWER(p.status) IN (\'available\', \'active\', \'open\') AND p.id IN (SELECT featured.id FROM (SELECT id FROM properties WHERE deleted_at IS NULL AND archived_at IS NULL AND approval_state = \'approved\' AND LOWER(status) IN (\'available\', \'active\', \'open\') ORDER BY created_at DESC, id DESC LIMIT 3) featured)';
        }

        return 'p.deleted_at IS NULL AND p.archived_at IS NULL AND p.approval_state = \'approved\' AND LOWER(p.status) IN (\'available\', \'active\', \'open\')';
    }

    private function rawPropertyRow(int $propertyId, ?array $user = null, bool $enforceVisibility = true): array
    {
        $params = ['id' => $propertyId];
        $sql = $this->baseSelect() . ' WHERE p.id = :id';
        if ($enforceVisibility) {
            $visibility = $this->visibilityCondition($user, $params);
            if ($visibility !== '') {
                $sql .= ' AND ' . $visibility;
            }
        }
        $sql .= ' LIMIT 1';

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch();

        if (!$row) {
            throw new OutOfBoundsException('Property not found.');
        }

        return $row;
    }

    private function hydrateProperties(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $propertyIds = array_map(static fn (array $row): int => (int) $row['id'], $rows);
        $mediaMap = $this->mediaMap($propertyIds);
        $documentRequestSummaryMap = $this->documentRequestSummaryMap($propertyIds);
        $dueDiligenceSummaryMap = $this->dueDiligenceSummaryMap($propertyIds);
        $groundTruthSummaryMap = $this->groundTruthSummaryMap($propertyIds);
        $priceBenchmarkMap = $this->priceBenchmarkMap();
        $assessmentRanks = $this->assessmentRanks();

        return array_map(function (array $row) use ($mediaMap, $documentRequestSummaryMap, $dueDiligenceSummaryMap, $groundTruthSummaryMap, $priceBenchmarkMap, $assessmentRanks): array {
            $propertyId = (int) $row['id'];
            $media = $mediaMap[$propertyId] ?? [];
            $documentStatuses = $this->normalizeDocumentStatuses($this->decodeJson($row['documents_json'] ?? '{}'));
            $documentCompletenessPct = $this->documentCompletenessPct($documentStatuses);
            $approvalState = $this->normalizeApprovalState((string) ($row['approval_state'] ?? 'approved'));
            $sellerIdentityStatus = $this->normalizeIdentityVerificationStatus((string) ($row['seller_identity_verification_status'] ?? 'unverified'));
            $documentsReviewedAt = $this->normalizeTimestamp($row['documents_reviewed_at'] ?? null);
            $siteVerifiedAt = $this->normalizeTimestamp($row['site_verified_at'] ?? null);
            $lastConfirmedAvailableAt = $this->normalizeTimestamp($row['last_confirmed_available_at'] ?? null);
            $updatedAt = $this->normalizeTimestamp($row['updated_at'] ?? null);
            $listingVerificationStatus = $this->listingVerificationStatus(
                $approvalState,
                $sellerIdentityStatus === 'verified',
                $documentsReviewedAt,
                $siteVerifiedAt,
                $documentCompletenessPct
            );
            $summary = $documentRequestSummaryMap[$propertyId] ?? [
                'count' => 0,
                'openCount' => 0,
                'pendingCount' => 0,
            ];
            $dueSummary = $dueDiligenceSummaryMap[$propertyId] ?? [
                'state' => [],
                'pct' => 0,
            ];
            $groundTruthSummary = $groundTruthSummaryMap[$propertyId] ?? [
                'multiplier' => 1.0,
                'visitCount' => 0,
                'latestVisitedAt' => null,
                'latestFieldAudit' => [],
                'latestAuditMultiplier' => null,
            ];
            $distToRoadKm = float_or_null($row['dist_to_road_km'] ?? null);
            $utilityStatus = $this->normalizeUtilityStatus($row['utility_status'] ?? null);
            $zoningScore = int_or_null($row['zoning_score'] ?? null);
            $clupAllowedUses = $this->decodeJson($row['clup_allowed_uses_json'] ?? '[]');
            $clupConditionalUses = $this->decodeJson($row['clup_conditional_uses_json'] ?? '[]');
            $clupRestrictedUses = $this->decodeJson($row['clup_restricted_uses_json'] ?? '[]');
            $clupVerifiedAt = $this->normalizeTimestamp($row['clup_verified_at'] ?? null);
            $pricePerSqm = $this->effectivePricePerSqm($row);
            $assessedValueSqm = $this->effectiveAssessedValueSqm($row['assessed_value_sqm'] ?? null, $pricePerSqm);
            $roadAccess = (int) $row['road_access'];
            $marketScore = (int) ($row['score'] ?? 82);
            $readinessMeta = $this->investmentReadiness([
                'id' => $propertyId,
                'type' => (string) $row['type'],
                'corridor' => (string) $row['corridor'],
                'barangay' => $row['barangay'] !== null ? (string) $row['barangay'] : null,
                'lat' => float_or_null($row['lat'] ?? null),
                'lng' => float_or_null($row['lng'] ?? null),
                'roadAccess' => $roadAccess,
                'pricePerSqm' => $pricePerSqm,
                'marketScore' => $marketScore,
                'approvalState' => $approvalState,
                'siteVerifiedAt' => $siteVerifiedAt,
                'documentsReviewedAt' => $documentsReviewedAt,
                'documentCompletenessPct' => $documentCompletenessPct,
                'listingVerificationStatus' => $listingVerificationStatus,
                'sellerIdentityStatus' => $sellerIdentityStatus,
                'sellerBrokerVerified' => (bool) ($row['seller_broker_verified'] ?? false),
                'distToRoadKm' => $distToRoadKm,
                'utilityStatus' => $utilityStatus,
                'zoningScore' => $zoningScore,
                'assessedValueSqm' => $assessedValueSqm,
                'readinessNotes' => string_or_null($row['readiness_notes'] ?? null),
                'dueDiligencePct' => (int) ($dueSummary['pct'] ?? 0),
                'groundTruthMultiplier' => (float) ($groundTruthSummary['multiplier'] ?? 1.0),
                'facilities' => $this->decodeJson($row['facilities_json'] ?? '[]'),
                'priceBenchmark' => $priceBenchmarkMap[(string) $row['type']] ?? ($priceBenchmarkMap['*'] ?? null),
            ]);

            $assessment = AutomaticPropertyAssessment::presentStored(
                $this->decodeJson($row['assessment_json'] ?? '{}'),
                $this->decodeJson($row['automatic_assessment_json'] ?? '{}'),
                $this->decodeJson($row['legacy_assessment_json'] ?? '{}')
            );
            if ($assessment['mceScore'] === null && isset($row['lat'], $row['lng'])) {
                try {
                    [$catFallback, $subcatFallback] = PropertyCatalog::normalizeCategory(string_or_null($row['category'] ?? null), string_or_null($row['subcategory'] ?? null), (string) ($row['type'] ?? 'Land'));
                    $evaluated = AutomaticPropertyAssessment::configured()->evaluate([
                        'lat' => float_or_null($row['lat'] ?? null),
                        'lng' => float_or_null($row['lng'] ?? null),
                        'category' => $catFallback,
                        'subcategory' => $subcatFallback,
                        'landArea' => float_or_null($row['area'] ?? null),
                    ]);
                    if ($evaluated['mceScore'] !== null) {
                        $assessment = $evaluated;
                    }
                } catch (\Throwable) {
                }
            }
            [$category, $subcategory] = PropertyCatalog::normalizeCategory(string_or_null($row['category'] ?? null), string_or_null($row['subcategory'] ?? null), (string) $row['type']);

            return array_merge([
                'id' => $propertyId,
                'name' => (string) $row['name'],
                'propertyName' => (string) $row['name'],
                'city' => (string) ($row['city'] ?? self::DEFAULT_CITY),
                'lat' => float_or_null($row['lat'] ?? null),
                'lng' => float_or_null($row['lng'] ?? null),
                'hasExactLocation' => isset($row['lat'], $row['lng']),
                'area' => float_or_null($row['area'] ?? null),
                'landArea' => float_or_null($row['area'] ?? null),
                'areaKnown' => isset($row['area']) && (float) $row['area'] > 0,
                'listingPurpose' => (string) ($row['listing_purpose'] ?? 'sale'),
                'price' => isset($row['price']) ? (int) $row['price'] : null,
                'salePrice' => isset($row['price']) ? (int) $row['price'] : null,
                'leasePrice' => isset($row['lease_price']) ? (int) $row['lease_price'] : null,
                'leasePeriod' => (string) ($row['lease_period'] ?? 'month'),
                'leasePriceUnit' => (string) ($row['lease_price_unit'] ?? 'total'),
                'pricePerSqm' => $pricePerSqm,
                'status' => (string) $row['status'],
                'approvalState' => $approvalState,
                'deletedAt' => string_or_null($this->normalizeTimestamp($row['deleted_at'] ?? null)),
                'isDeleted' => !empty($row['deleted_at']),
                'archivedAt' => string_or_null($this->normalizeTimestamp($row['archived_at'] ?? null)),
                'isArchived' => !empty($row['archived_at']) || $approvalState === 'archived',
                'marketScore' => $marketScore,
                'type' => (string) $row['type'],
                'propertyType' => (string) $row['type'],
                'category' => $category,
                'subcategory' => $subcategory,
                'assessmentTags' => $this->decodeJson($row['assessment_tags_json'] ?? '[]'),
                'nearbyProperties' => $this->decodeJson($row['nearby_properties_json'] ?? '[]'),
                'parcel' => $this->decodeJson($row['parcel_json'] ?? '{}'),
                'contactMode' => (string) ($row['contact_mode'] ?? 'open_listing'),
                'contactBrokerUserId' => int_or_null($row['contact_broker_user_id'] ?? null),
                'brokerContact' => ($row['contact_broker_status'] ?? null) === 'verified' ? [
                    'name' => (string) ($row['contact_broker_name'] ?? ''),
                    'phone' => (string) ($row['contact_broker_phone'] ?? ''),
                    'email' => (string) ($row['contact_broker_email'] ?? ''),
                ] : null,
                'reviewNote' => (string) ($row['review_note'] ?? ''),
                'saveCount' => (int) ($row['save_count'] ?? 0),
                'mceRank' => $assessmentRanks[$propertyId]['mceRank'] ?? null,
                'iaiRank' => $assessmentRanks[$propertyId]['iaiRank'] ?? null,
                'corridor' => (string) $row['corridor'],
                'tags' => $this->decodeJson($row['tags_json'] ?? '[]'),
                'facilities' => $this->decodeJson($row['facilities_json'] ?? '[]'),
                'roadAccess' => $roadAccess,
                'imageUrl' => (string) $row['image_url'],
                'imagePath' => (string) $row['image_url'],
                'description' => (string) $row['description'],
                'barangay' => $row['barangay'] !== null ? (string) $row['barangay'] : null,
                'ownerContact' => $this->decodeJson($row['owner_contact_json'] ?? '{}'),
                'sellerUserId' => isset($row['seller_user_id']) ? int_or_null($row['seller_user_id']) : null,
                'createdByUserId' => int_or_null($row['created_by_user_id'] ?? null),
                'sellerIdentityStatus' => $sellerIdentityStatus,
                'sellerBrokerVerified' => (bool) ($row['seller_broker_verified'] ?? false),
                'sellerIdentityVerifiedAt' => $this->normalizeTimestamp($row['seller_identity_verified_at'] ?? null),
                'documentsReviewedAt' => $documentsReviewedAt,
                'siteVerifiedAt' => $siteVerifiedAt,
                'lastConfirmedAvailableAt' => $lastConfirmedAvailableAt,
                'documentStatuses' => $documentStatuses,
                'documentChecklist' => self::DOCUMENT_REQUIREMENTS,
                'documentCompletenessPct' => $documentCompletenessPct,
                'listingVerificationStatus' => $listingVerificationStatus,
                'distToRoadKm' => $distToRoadKm,
                'utilityStatus' => $utilityStatus,
                'zoningScore' => $zoningScore,
                'clupProfile' => [
                    'existingLandUse' => string_or_null($row['existing_land_use'] ?? null),
                    'zoningClassification' => string_or_null($row['zoning_classification'] ?? null),
                    'allowedUses' => $clupAllowedUses,
                    'conditionalUses' => $clupConditionalUses,
                    'restrictedUses' => $clupRestrictedUses,
                    'sourceReference' => string_or_null($row['clup_source_reference'] ?? null),
                    'verifiedAt' => string_or_null($clupVerifiedAt),
                    'isVerified' => string_or_null($clupVerifiedAt) !== null,
                ],
                'assessedValueSqm' => $assessedValueSqm,
                'readinessNotes' => string_or_null($row['readiness_notes'] ?? null),
                'dueDiligencePct' => (int) ($dueSummary['pct'] ?? 0),
                'groundTruthMultiplier' => (float) ($groundTruthSummary['multiplier'] ?? 1.0),
                'groundTruthAdjustmentPct' => round((((float) ($groundTruthSummary['multiplier'] ?? 1.0)) - 1) * 100, 1),
                'groundTruthVisitCount' => (int) ($groundTruthSummary['visitCount'] ?? 0),
                'latestGroundTruthVisitAt' => $this->normalizeTimestamp($groundTruthSummary['latestVisitedAt'] ?? null),
                'latestFieldAudit' => is_array($groundTruthSummary['latestFieldAudit'] ?? null) ? $groundTruthSummary['latestFieldAudit'] : [],
                'latestFieldAuditMultiplier' => isset($groundTruthSummary['latestAuditMultiplier']) ? (float) $groundTruthSummary['latestAuditMultiplier'] : null,
                'investmentReadiness' => $readinessMeta,
                'trustBadges' => $this->trustBadges(
                    $sellerIdentityStatus === 'verified',
                    $documentsReviewedAt,
                    $siteVerifiedAt,
                    $lastConfirmedAvailableAt,
                    $updatedAt
                ),
                'recentlyUpdated' => $this->isRecentTimestamp($lastConfirmedAvailableAt ?: $updatedAt),
                'documentRequestCount' => (int) ($summary['count'] ?? 0),
                'openDocumentRequestCount' => (int) ($summary['openCount'] ?? 0),
                'pendingDocumentRequestCount' => (int) ($summary['pendingCount'] ?? 0),
                'media' => $media,
                'createdAt' => $this->normalizeTimestamp($row['created_at'] ?? null),
                'updatedAt' => $updatedAt,
            ], $assessment);
        }, $rows);
    }

    private function assessmentRanks(): array
    {
        $rows = $this->pdo->query("SELECT id, assessment_json FROM properties WHERE deleted_at IS NULL AND archived_at IS NULL AND approval_state = 'approved' AND LOWER(status) IN ('available', 'active', 'open')")->fetchAll();
        $properties = array_map(fn (array $row): array => array_merge(['id' => (int) $row['id']], PropertyAssessment::scores($this->decodeJson($row['assessment_json'] ?? '{}'))), $rows);
        return PropertyAssessment::ranks($properties);
    }

    private function presentEvidence(array $property, ?array $user): array
    {
        if ($user === null || !sfc_can_manage_properties($user)) {
            unset($property['parcel']['attachments']);
        }
        return $property;
    }

    private function presentProperties(array $properties, ?array $user): array
    {
        $properties = array_map(fn (array $property): array => $this->presentEvidence($property, $user), $properties);
        if ((int) ($user['id'] ?? 0) > 0) {
            return $properties;
        }
        return array_map(static function (array $property): array {
            $property['ownerContact'] = null;
            $property['brokerContact'] = null;
            $property['contactBrokerUserId'] = null;
            $property['reviewNote'] = '';
            $property['sellerUserId'] = null;
            $property['createdByUserId'] = null;
            $property['sellerIdentityStatus'] = 'not_disclosed';
            $property['sellerBrokerVerified'] = false;
            $property['sellerIdentityVerifiedAt'] = null;
            $property['documentStatuses'] = [];
            $property['latestFieldAudit'] = [];
            $property['media'] = array_values(array_filter($property['media'], static fn (array $item): bool => in_array($item['kind'] ?? '', ['image', 'photo'], true)));
            return $property;
        }, $properties);
    }

    private function mediaMap(array $propertyIds): array
    {
        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
        $statement = $this->pdo->prepare(
            "SELECT id, property_id, kind, source, alt_text, sort_order
             FROM property_media
             WHERE property_id IN ({$placeholders})
             ORDER BY property_id ASC, sort_order ASC, id ASC"
        );
        $statement->execute($propertyIds);

        $map = [];
        foreach ($statement->fetchAll() as $row) {
            $propertyId = (int) $row['property_id'];
            $map[$propertyId] ??= [];
            $map[$propertyId][] = [
                'id' => (int) $row['id'],
                'kind' => (string) $row['kind'],
                'source' => (string) $row['source'],
                'url' => (string) $row['source'],
                'altText' => (string) ($row['alt_text'] ?? ''),
                'sortOrder' => (int) $row['sort_order'],
            ];
        }

        return $map;
    }

    private function groundTruthSummaryMap(array $propertyIds): array
    {
        if ($propertyIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
        $summaryStatement = $this->pdo->prepare(
            "SELECT
                property_id,
                COUNT(*) AS visit_count,
                AVG(COALESCE(ground_truth_multiplier, 1)) AS avg_multiplier,
                MAX(COALESCE(visited_at, updated_at)) AS latest_visited_at
             FROM visit_logs
             WHERE property_id IN ({$placeholders})
               AND status = 'visited'
             GROUP BY property_id"
        );
        $summaryStatement->execute($propertyIds);

        $map = [];
        foreach ($summaryStatement->fetchAll() as $row) {
            $map[(int) $row['property_id']] = [
                'multiplier' => isset($row['avg_multiplier']) ? (float) $row['avg_multiplier'] : 1.0,
                'visitCount' => (int) ($row['visit_count'] ?? 0),
                'latestVisitedAt' => $row['latest_visited_at'] ?? null,
                'latestFieldAudit' => [],
                'latestAuditMultiplier' => null,
            ];
        }

        $auditStatement = $this->pdo->prepare(
            "SELECT property_id, field_audit_json, ground_truth_multiplier, visited_at, updated_at
             FROM visit_logs
             WHERE property_id IN ({$placeholders})
               AND field_audit_json IS NOT NULL
             ORDER BY property_id ASC, COALESCE(visited_at, updated_at) DESC, id DESC"
        );
        $auditStatement->execute($propertyIds);

        foreach ($auditStatement->fetchAll() as $row) {
            $propertyId = (int) $row['property_id'];
            if (isset($map[$propertyId]['latestFieldAudit']) && $map[$propertyId]['latestFieldAudit'] !== []) {
                continue;
            }

            $map[$propertyId] ??= [
                'multiplier' => 1.0,
                'visitCount' => 0,
                'latestVisitedAt' => $row['visited_at'] ?? $row['updated_at'] ?? null,
                'latestFieldAudit' => [],
                'latestAuditMultiplier' => null,
            ];
            $map[$propertyId]['latestFieldAudit'] = $this->decodeJson($row['field_audit_json'] ?? '{}');
            $map[$propertyId]['latestAuditMultiplier'] = $row['ground_truth_multiplier'] !== null
                ? (float) $row['ground_truth_multiplier']
                : null;
        }

        return $map;
    }

    private function documentRequestSummaryMap(array $propertyIds): array
    {
        if ($propertyIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
        $statement = $this->pdo->prepare(
            "SELECT
                property_id,
                COUNT(*) AS total_count,
                SUM(CASE WHEN status IN ('requested', 'in_review') THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) AS pending_count
             FROM property_document_requests
             WHERE property_id IN ({$placeholders})
             GROUP BY property_id"
        );
        $statement->execute($propertyIds);

        $map = [];
        foreach ($statement->fetchAll() as $row) {
            $map[(int) $row['property_id']] = [
                'count' => (int) ($row['total_count'] ?? 0),
                'openCount' => (int) ($row['open_count'] ?? 0),
                'pendingCount' => (int) ($row['pending_count'] ?? 0),
            ];
        }

        return $map;
    }

    private function dueDiligenceSummaryMap(array $propertyIds): array
    {
        if ($propertyIds === []) {
            return [];
        }

        $items = $this->dueDiligenceItems();
        $placeholders = implode(',', array_fill(0, count($propertyIds), '?'));
        $statement = $this->pdo->prepare(
            "SELECT property_id, state_json
             FROM property_due_diligence
             WHERE property_id IN ({$placeholders})"
        );
        $statement->execute($propertyIds);

        $map = [];
        foreach ($statement->fetchAll() as $row) {
            $state = $this->decodeJson($row['state_json'] ?? '{}');
            $map[(int) $row['property_id']] = [
                'state' => $state,
                'pct' => $this->dueDiligencePct($state, $items),
            ];
        }

        return $map;
    }

    private function priceBenchmarkMap(): array
    {
        $statement = $this->pdo->query(
            'SELECT type, listing_purpose, price, area, price_per_sqm
             FROM properties
             WHERE deleted_at IS NULL
               AND archived_at IS NULL
               AND approval_state = \'approved\'
               AND listing_purpose IN (\'sale\', \'sale_or_lease\')
               AND LOWER(status) IN (\'available\', \'active\', \'open\')
               AND price > 0
               AND area > 0'
        );

        $groups = [];
        foreach ($statement->fetchAll() as $row) {
            $type = strtolower(trim((string) ($row['type'] ?? '')));
            $pricePerSqm = $this->effectivePricePerSqm($row);
            if ($pricePerSqm === null || $pricePerSqm < 1) {
                continue;
            }

            $groups[$type] ??= [];
            $groups[$type][] = $pricePerSqm;
            $groups['*'] ??= [];
            $groups['*'][] = $pricePerSqm;
        }

        $benchmarks = [];
        foreach ($groups as $type => $prices) {
            sort($prices);
            $benchmarks[$type] = [
                'min' => min($prices),
                'max' => max($prices),
                'median' => $prices[(int) floor((count($prices) - 1) / 2)],
            ];
        }

        return $benchmarks;
    }

    private function normalizePropertyPayload(array $payload, ?array $existing = null): array
    {
        $name = string_or_null($payload['property_name'] ?? $payload['name'] ?? ($existing['name'] ?? null));
        if ($name === null) {
            throw new InvalidArgumentException('Property name is required.');
        }

        $city = string_or_null($payload['city'] ?? ($existing['city'] ?? null)) ?? self::DEFAULT_CITY;
        $barangay = string_or_null($payload['barangay'] ?? ($existing['barangay'] ?? null));
        $type = string_or_null($payload['property_type'] ?? $payload['type'] ?? ($existing['type'] ?? null));
        if ($type === null) {
            throw new InvalidArgumentException('Property type is required.');
        }

        $corridor = string_or_null($payload['corridor'] ?? ($existing['corridor'] ?? null)) ?? 'highway';
        $status = $this->normalizeAvailability(string_or_null($payload['status'] ?? ($existing['status'] ?? null)) ?? 'Available');
        if ($status === 'Availed' && !in_array(strtolower((string) ($existing['status'] ?? '')), ['availed', 'taken'], true)) {
            throw new InvalidArgumentException('Availed is a historical status. Choose Sold or Leased for a new transaction.');
        }
        $approvalState = $this->normalizeApprovalState((string) ($payload['approval_state'] ?? $payload['approvalState'] ?? ($existing['approval_state'] ?? 'approved')));
        if ($approvalState === 'archived' && ($existing['approval_state'] ?? '') !== 'archived') {
            throw new InvalidArgumentException('Use the Archive action to archive a listing.');
        }
        if (($existing['approval_state'] ?? '') === 'archived' && $approvalState !== 'archived') {
            throw new InvalidArgumentException('Use the Unarchive action before reviewing this historical archive.');
        }
        $rawDescription = array_key_exists('description', $payload) ? $payload['description'] : ($existing['description'] ?? '');
        if ($rawDescription !== null && !is_string($rawDescription)) { throw new InvalidArgumentException('Description must be text.'); }
        $description = trim($rawDescription ?? '');

        $listingPurpose = $this->normalizeListingChoice($this->payloadValue($payload, ['listing_purpose', 'listingPurpose'], $existing['listing_purpose'] ?? 'sale'), ['sale', 'lease', 'sale_or_lease'], 'listing purpose');
        $price = $this->normalizeNullableAmount($this->payloadValue($payload, ['sale_price', 'salePrice', 'price'], $existing['price'] ?? null), 'Sale asking price');
        $leasePrice = $this->normalizeNullableAmount($this->payloadValue($payload, ['lease_price', 'leasePrice'], $existing['lease_price'] ?? null), 'Lease asking price');
        $leasePeriod = $this->normalizeListingChoice($this->payloadValue($payload, ['lease_period', 'leasePeriod'], $existing['lease_period'] ?? 'month'), ['month', 'year', 'day'], 'lease period');
        $leasePriceUnit = $this->normalizeListingChoice($this->payloadValue($payload, ['lease_price_unit', 'leasePriceUnit'], $existing['lease_price_unit'] ?? 'total'), ['total', 'sqm'], 'lease price unit');

        $parcel = PropertyParcel::fromPayload($payload, $this->decodeJson($existing['parcel_json'] ?? '{}'));
        $effectiveSqm = $parcel['surveyAreaSqm'] ?? $parcel['estimatedAreaSqm'];
        $retainHistoricalArea = !array_key_exists('boundary', $payload) && ($payload['land_area'] ?? $payload['area'] ?? null) === null;
        $area = $effectiveSqm !== null ? $effectiveSqm / 10000 : ($retainHistoricalArea ? float_or_null($existing['area'] ?? null) : null);
        if ($area !== null && (!is_finite($area) || $area <= 0 || round($area, 4) <= 0)) {
            throw new InvalidArgumentException('Land area must be greater than zero.');
        }
        // Assess and price the exact hectare value that DECIMAL(12, 4) stores.
        $area = $area === null ? null : round($area, 4);

        $storedScore = int_or_null($payload['score'] ?? $payload['market_score'] ?? $payload['marketScore'] ?? ($existing['score'] ?? null));
        $storedScore = $this->clamp($storedScore ?? 82, 40, 100);

        $roadAccess = int_or_null($payload['road_access'] ?? $payload['roadAccess'] ?? ($existing['road_access'] ?? null));
        $roadAccess = $this->clamp($roadAccess ?? 85, 40, 100);

        $latInput = array_key_exists('lat', $payload) ? $payload['lat'] : ($existing['lat'] ?? null);
        $lngInput = array_key_exists('lng', $payload) ? $payload['lng'] : ($existing['lng'] ?? null);
        $lat = float_or_null($latInput);
        $lng = float_or_null($lngInput);
        if (($latInput !== null && $latInput !== '' && $lat === null) || ($lngInput !== null && $lngInput !== '' && $lng === null)
            || ($lat === null) !== ($lng === null) || ($lat !== null && (!is_finite($lat) || !is_finite($lng) || abs($lat) > 90 || abs($lng) > 180))) {
            throw new InvalidArgumentException('Provide both valid latitude and longitude, or leave both blank.');
        }
        if ($area === null && $lat === null) {
            throw new InvalidArgumentException('Enter a positive area size or select the exact property location. Drawing a boundary is optional.');
        }
        // Preview, evidence and change detection must use the persisted coordinate precision.
        $lat = $lat === null ? null : round($lat, 6);
        $lng = $lng === null ? null : round($lng, 6);

        $imageUrl = string_or_null($payload['image_path'] ?? $payload['imageUrl'] ?? ($existing['image_url'] ?? null))
            ?? $this->defaultImagePath($type);

        $tags = $this->normalizeStringList(
            $payload['tags'] ?? $payload['tags_csv'] ?? $this->decodeExistingValue($existing['tags_json'] ?? null),
            []
        );
        $facilities = $this->normalizeStringList(
            $payload['facilities'] ?? $payload['facilities_csv'] ?? $this->decodeExistingValue($existing['facilities_json'] ?? null),
            []
        );
        $ownerContact = $this->normalizeOwnerContact(
            $payload,
            $existing ? $this->decodeExistingValue($existing['owner_contact_json'] ?? null) : null,
            $name
        );
        $documents = $this->normalizeDocumentStatuses(
            $payload['document_statuses'] ?? $payload['documentStatuses'] ?? $this->decodeExistingValue($existing['documents_json'] ?? null)
        );
        $sellerUserId = int_or_null($payload['seller_user_id'] ?? $payload['sellerUserId'] ?? ($existing['seller_user_id'] ?? null));
        $documentsReviewedAt = $this->normalizeFlagTimestamp(
            $payload['documents_reviewed'] ?? $payload['documentsReviewed'] ?? null,
            $payload['documents_reviewed_at'] ?? $payload['documentsReviewedAt'] ?? null,
            $existing['documents_reviewed_at'] ?? null
        );
        $siteVerifiedAt = $this->normalizeFlagTimestamp(
            $payload['site_verified'] ?? $payload['siteVerified'] ?? null,
            $payload['site_verified_at'] ?? $payload['siteVerifiedAt'] ?? null,
            $existing['site_verified_at'] ?? null
        );
        $lastConfirmedAvailableAt = $this->normalizeTimestampInput(
            $payload['last_confirmed_available_at'] ?? $payload['lastConfirmedAvailableAt'] ?? ($existing['last_confirmed_available_at'] ?? gmdate('Y-m-d H:i:s')),
            $existing['last_confirmed_available_at'] ?? null
        );
        $distToRoadKm = $this->normalizeDistanceInput(
            $payload['dist_to_road_km'] ?? $payload['distToRoadKm'] ?? ($existing['dist_to_road_km'] ?? null)
        );
        $utilityStatus = $this->normalizeUtilityStatus(
            $payload['utility_status'] ?? $payload['utilityStatus'] ?? ($existing['utility_status'] ?? null)
        );
        $zoningScore = $this->normalizeNullableScore(
            $payload['zoning_score'] ?? $payload['zoningScore'] ?? ($existing['zoning_score'] ?? null)
        );
        $existingLandUse = string_or_null($payload['existing_land_use'] ?? $payload['existingLandUse'] ?? ($existing['existing_land_use'] ?? null));
        $zoningClassification = string_or_null($payload['zoning_classification'] ?? $payload['zoningClassification'] ?? ($existing['zoning_classification'] ?? null));
        $clupAllowedUses = $this->normalizeStringList(
            $payload['clup_allowed_uses'] ?? $payload['clupAllowedUses'] ?? $this->decodeExistingValue($existing['clup_allowed_uses_json'] ?? null),
            []
        );
        $clupConditionalUses = $this->normalizeStringList(
            $payload['clup_conditional_uses'] ?? $payload['clupConditionalUses'] ?? $this->decodeExistingValue($existing['clup_conditional_uses_json'] ?? null),
            []
        );
        $clupRestrictedUses = $this->normalizeStringList(
            $payload['clup_restricted_uses'] ?? $payload['clupRestrictedUses'] ?? $this->decodeExistingValue($existing['clup_restricted_uses_json'] ?? null),
            []
        );
        $clupSourceReference = string_or_null($payload['clup_source_reference'] ?? $payload['clupSourceReference'] ?? ($existing['clup_source_reference'] ?? null));
        $clupVerifiedAt = $this->normalizeFlagTimestamp(
            $payload['clup_verified'] ?? $payload['clupVerified'] ?? null,
            $payload['clup_verified_at'] ?? $payload['clupVerifiedAt'] ?? null,
            $existing['clup_verified_at'] ?? null
        );
        $assessedValueSqm = $this->normalizeNullableInt(
            $payload['assessed_value_sqm'] ?? $payload['assessedValueSqm'] ?? ($existing['assessed_value_sqm'] ?? null)
        );
        $readinessNotes = string_or_null($payload['readiness_notes'] ?? $payload['readinessNotes'] ?? ($existing['readiness_notes'] ?? null));
        $rawSubcat = $payload['subcategory'] ?? ($existing['subcategory'] ?? null);
        if (is_array($rawSubcat)) {
            $rawSubcat = implode(', ', array_filter(array_map('trim', $rawSubcat), static fn ($s) => $s !== ''));
        }
        [$category, $subcategory] = PropertyCatalog::normalizeCategory(
            string_or_null($payload['category'] ?? ($existing['category'] ?? null)),
            string_or_null($rawSubcat),
            $type
        );
        $assessment = PropertyAssessment::normalize($this->decodeExistingValue($existing['assessment_json'] ?? null));
        $automaticJson = $existing['automatic_assessment_json'] ?? null;
        $legacyJson = $existing['legacy_assessment_json'] ?? null;
        [$oldCategory, $oldSubcategory] = PropertyCatalog::normalizeCategory(
            string_or_null($existing['category'] ?? null), string_or_null($existing['subcategory'] ?? null), (string) ($existing['type'] ?? $type)
        );
        $spatialChanged = $existing === null || $lat !== float_or_null($existing['lat'] ?? null)
            || $lng !== float_or_null($existing['lng'] ?? null)
            || $area !== float_or_null($existing['area'] ?? null)
            || $category !== $oldCategory || $subcategory !== $oldSubcategory;
        if ($spatialChanged || filter_var($payload['recalculate_assessment'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            if ($existing !== null && !$automaticJson && !$legacyJson && count(array_filter($assessment, static fn ($value): bool => $value !== null)) > 0) {
                $legacyJson = json_encode([
                    'assessmentMode' => 'legacy_manual', 'assessmentCriteria' => $assessment,
                    'assessmentMethod' => PropertyAssessment::scores($assessment)['assessmentMethod'],
                    'capturedAt' => gmdate('c'), 'inputs' => ['lat' => float_or_null($existing['lat'] ?? null), 'lng' => float_or_null($existing['lng'] ?? null),
                        'landArea' => float_or_null($existing['area'] ?? null), 'category' => $oldCategory, 'subcategory' => $oldSubcategory],
                ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            }
            $automatic = AutomaticPropertyAssessment::configured()->evaluate(['lat' => $lat, 'lng' => $lng, 'category' => $category, 'subcategory' => $subcategory, 'landArea' => $area]);
            $assessment = $automatic['assessmentCriteria'];
            $automaticJson = json_encode($automatic, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        }
        $nearbyProperties = PropertyNearby::normalize($payload['nearbyProperties'] ?? $this->decodeExistingValue($existing['nearby_properties_json'] ?? null));
        $assessmentTags = $this->normalizeStringList($payload['assessmentTags'] ?? $payload['assessment_tags'] ?? $this->decodeExistingValue($existing['assessment_tags_json'] ?? null), []);
        $assessmentTags = array_values(array_unique(array_map(static fn (string $tag): string => strtoupper(trim($tag)), $assessmentTags)));
        foreach ($assessmentTags as $tag) {
            if (!in_array($tag, PropertyCatalog::contextTags(), true)) {
                throw new InvalidArgumentException('Choose a valid property context tag.');
            }
        }
        $contactMode = (string) ($payload['contactMode'] ?? $payload['contact_mode'] ?? ($existing['contact_mode'] ?? 'open_listing'));
        if (!in_array($contactMode, ['open_listing', 'broker'], true)) {
            throw new InvalidArgumentException('Choose open listing or an approved broker.');
        }
        $contactBrokerUserId = int_or_null($payload['contactBrokerUserId'] ?? $payload['contact_broker_user_id'] ?? ($existing['contact_broker_user_id'] ?? null));
        if ($contactMode === 'open_listing') {
            $contactBrokerUserId = null;
        } else {
            $broker = $this->pdo->prepare("SELECT u.id FROM users u INNER JOIN seller_profiles sp ON sp.user_id = u.id WHERE u.id = :id AND u.role = 'seller' AND u.account_status = 'active' AND u.email_verified_at IS NOT NULL AND sp.prc_front_json IS NOT NULL AND sp.prc_back_json IS NOT NULL AND u.identity_verification_status = 'verified' AND sp.application_status = 'verified' AND sp.seller_type = 'broker' AND sp.prc_registration_no REGEXP '^[0-9]{1,20}$' AND sp.prc_valid_until >= DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))");
            $broker->execute(['id' => $contactBrokerUserId ?? 0]);
            if (!$broker->fetchColumn()) {
                throw new InvalidArgumentException('The contact must be an approved broker.');
            }
        }
        $reviewNote = string_or_null($payload['reviewNote'] ?? $payload['review_note'] ?? ($existing['review_note'] ?? null));
        if (strlen($reviewNote ?? '') > 3000 || strlen($readinessNotes ?? '') > 10000) {
            throw new InvalidArgumentException('The review or assessment note is too long.');
        }

        return [
            'name' => $name,
            'city' => $city,
            'lat' => $lat,
            'lng' => $lng,
            'area' => $area,
            'listing_purpose' => $listingPurpose,
            'price' => $price,
            'lease_price' => $leasePrice,
            'lease_period' => $leasePeriod,
            'lease_price_unit' => $leasePriceUnit,
            'price_per_sqm' => $listingPurpose === 'lease' ? null : $this->pricePerSqm($price, $area),
            'status' => $status,
            'approval_state' => $approvalState,
            'score' => $storedScore,
            'type' => $type,
            'corridor' => $corridor,
            'tags_json' => json_encode($tags, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'facilities_json' => json_encode($facilities, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'road_access' => $roadAccess,
            'image_url' => $imageUrl,
            'description' => $description,
            'barangay' => $barangay,
            'owner_contact_json' => json_encode($ownerContact, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'documents_json' => json_encode($documents, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'seller_user_id' => $sellerUserId,
            'documents_reviewed_at' => $documentsReviewedAt,
            'site_verified_at' => $siteVerifiedAt,
            'last_confirmed_available_at' => $status === 'Available' ? $lastConfirmedAvailableAt : null,
            'dist_to_road_km' => $distToRoadKm,
            'utility_status' => $utilityStatus,
            'zoning_score' => $zoningScore,
            'existing_land_use' => $existingLandUse,
            'zoning_classification' => $zoningClassification,
            'clup_allowed_uses_json' => json_encode($clupAllowedUses, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'clup_conditional_uses_json' => json_encode($clupConditionalUses, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'clup_restricted_uses_json' => json_encode($clupRestrictedUses, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'clup_source_reference' => $clupSourceReference,
            'clup_verified_at' => $clupVerifiedAt,
            'assessed_value_sqm' => $assessedValueSqm,
            'readiness_notes' => $readinessNotes,
            'category' => $category,
            'subcategory' => $subcategory,
            'assessment_json' => json_encode($assessment, JSON_UNESCAPED_UNICODE),
            'automatic_assessment_json' => $automaticJson,
            'legacy_assessment_json' => $legacyJson,
            'assessment_tags_json' => json_encode($assessmentTags, JSON_UNESCAPED_UNICODE),
            'nearby_properties_json' => json_encode($nearbyProperties, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'parcel_json' => json_encode($parcel, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'contact_mode' => $contactMode,
            'contact_broker_user_id' => $contactBrokerUserId,
            'review_note' => $reviewNote,
        ];
    }

    private function payloadValue(array $payload, array $keys, mixed $fallback): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $payload)) { return $payload[$key]; }
        }
        return $fallback;
    }

    private function normalizeListingChoice(mixed $value, array $allowed, string $label): string
    {
        if (!is_string($value) || !in_array(strtolower(trim($value)), $allowed, true)) {
            throw new InvalidArgumentException('Choose a valid ' . $label . '.');
        }
        return strtolower(trim($value));
    }

    private function normalizeNullableAmount(mixed $value, string $label): ?int
    {
        if ($value === null || (is_string($value) && trim($value) === '')) { return null; }
        if (is_int($value)) {
            if ($value >= 0) { return $value; }
        } elseif (is_float($value)) {
            if (is_finite($value) && $value >= 0 && $value < PHP_INT_MAX && floor($value) === $value) { return (int) $value; }
        } elseif (is_string($value)) {
            $text = trim($value);
            if (preg_match('/^(?:[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+)$/D', $text)) {
                $digits = ltrim(str_replace(',', '', $text), '0');
                $maximum = (string) PHP_INT_MAX;
                if ($digits === '' || strlen($digits) < strlen($maximum) || (strlen($digits) === strlen($maximum) && strcmp($digits, $maximum) <= 0)) {
                    return (int) $digits;
                }
            }
        }
        throw new InvalidArgumentException($label . ' must be blank or a non-negative whole PHP amount.');
    }

    private function decodeExistingValue(mixed $value): mixed
    {
        if (!is_string($value) || trim($value) === '') {
            return $value;
        }

        $decoded = json_decode($value, true);
        return $decoded !== null ? $decoded : $value;
    }

    private function normalizeLandAreaUnit(mixed $value): string
    {
        $normalized = strtolower(trim((string) ($value ?? 'ha')));
        return in_array($normalized, ['sqm', 'm2', 'square_meter', 'square_meters'], true)
            ? 'sqm'
            : 'ha';
    }

    private function normalizeLandAreaValue(mixed $value, string $unit = 'ha'): ?float
    {
        $area = float_or_null($value);
        if ($area === null) {
            return null;
        }

        if ($unit === 'sqm') {
            return $area / 10000;
        }

        return $area;
    }

    private function normalizeStringList(mixed $value, array $fallback): array
    {
        if (is_array($value)) {
            $items = $value;
        } elseif (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return $fallback;
            }

            $decoded = json_decode($trimmed, true);
            $items = is_array($decoded)
                ? $decoded
                : (preg_split('/\s*,\s*/', $trimmed) ?: []);
        } else {
            return $fallback;
        }

        $clean = array_values(array_unique(array_filter(array_map(
            static fn (mixed $item): string => trim((string) $item),
            $items
        ))));

        return $clean !== [] ? $clean : $fallback;
    }

    private function normalizeDocumentStatuses(mixed $value): array
    {
        $defaults = [];
        foreach (self::DOCUMENT_REQUIREMENTS as $document) {
            $defaults[$document['key']] = 'missing';
        }

        $items = [];
        if (is_array($value)) {
            $items = $value;
        } elseif (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $items = $decoded;
            }
        }
        foreach ($items as $key => $status) {
            $normalizedKey = trim((string) $key);
            if ($normalizedKey === '' || !array_key_exists($normalizedKey, $defaults)) {
                continue;
            }

            $normalizedStatus = strtolower(trim((string) $status));
            $defaults[$normalizedKey] = array_key_exists($normalizedStatus, self::DOCUMENT_PROGRESS)
                ? $normalizedStatus
                : 'missing';
        }

        return $defaults;
    }

    private function documentCompletenessPct(array $documents): int
    {
        if ($documents === []) {
            return 0;
        }

        $total = 0;
        foreach ($documents as $status) {
            $total += self::DOCUMENT_PROGRESS[$status] ?? 0;
        }

        return (int) round($total / count($documents));
    }

    private function normalizeOwnerContact(array $payload, mixed $existing, string $propertyName): array
    {
        $existingContact = is_array($existing) ? $existing : [];
        $payloadContact = [];

        if (isset($payload['owner_contact']) && is_array($payload['owner_contact'])) {
            $payloadContact = $payload['owner_contact'];
        } elseif (isset($payload['ownerContact']) && is_array($payload['ownerContact'])) {
            $payloadContact = $payload['ownerContact'];
        }

        $name = string_or_null($payloadContact['name'] ?? $payload['owner_name'] ?? ($existingContact['name'] ?? null))
            ?? '';
        $email = string_or_null($payloadContact['email'] ?? $payload['owner_email'] ?? ($existingContact['email'] ?? null))
            ?? '';
        $phone = string_or_null($payloadContact['phone'] ?? $payload['owner_phone'] ?? ($existingContact['phone'] ?? null))
            ?? '';
        $responseSla = string_or_null($payloadContact['responseSla'] ?? $payload['owner_response_sla'] ?? ($existingContact['responseSla'] ?? null))
            ?? '';

        return [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'responseSla' => $responseSla,
        ];
    }

    private function defaultTags(string $type, string $corridor, ?string $barangay): array
    {
        $tags = match ($type) {
            'logistics' => ['Logistics Fit', 'Truck Access', 'Industrial Scale'],
            'hotel' => ['Tourism Ready', 'Destination Potential', 'Hospitality Fit'],
            'bpo' => ['Office Ready', 'Talent Access', 'Fiber Ready'],
            'manufacturing' => ['Industrial Fit', 'Utility Ready', 'Expansion Capacity'],
            default => ['Commercial Ready', 'Investor Grade', 'Strategic Location'],
        };

        $tags[] = match ($corridor) {
            'coastal' => 'Coastal Exposure',
            'downtown' => 'City Core Access',
            default => 'Highway Visibility',
        };

        if ($barangay !== null) {
            $tags[] = $barangay;
        }

        return array_values(array_unique($tags));
    }

    private function defaultFacilities(string $corridor, string $type): array
    {
        $facilities = match ($corridor) {
            'coastal' => ['Beach Access', 'Tourism Strip', 'Airport 15km'],
            'downtown' => ['CBD Access', 'Banks', 'Food Cluster'],
            default => ['Highway Access', 'Utilities', 'Distribution Routes'],
        };

        if ($type === 'bpo') {
            $facilities[] = 'Fiber Backbone';
        }
        if ($type === 'hotel') {
            $facilities[] = 'Hospitality Demand';
        }

        return array_values(array_unique($facilities));
    }

    private function defaultImagePath(string $type): string
    {
        return match ($type) {
            'hotel' => 'assets/images/LaFinns.png',
            'logistics', 'manufacturing' => 'assets/images/Property1.png',
            'bpo' => 'assets/images/Property3.png',
            default => 'assets/images/Property10.png',
        };
    }

    private function defaultCoordinates(string $corridor): array
    {
        return match ($corridor) {
            'coastal' => ['lat' => 16.6178, 'lng' => 120.3174],
            'downtown' => ['lat' => 16.6208, 'lng' => 120.3218],
            default => ['lat' => 16.6217, 'lng' => 120.3232],
        };
    }

    private function normalizeApprovalState(string $state): string
    {
        $normalized = strtolower(trim($state));
        if (!in_array($normalized, self::APPROVAL_STATES, true)) {
            throw new InvalidArgumentException('Choose a valid listing review status.');
        }

        return $normalized;
    }

    private function normalizeIdentityVerificationStatus(string $state): string
    {
        $normalized = strtolower(trim($state));
        return in_array($normalized, ['unverified', 'pending', 'verified'], true)
            ? $normalized
            : 'unverified';
    }

    private function listingVerificationStatus(
        string $approvalState,
        bool $sellerVerified,
        string $documentsReviewedAt,
        string $siteVerifiedAt,
        int $documentCompletenessPct
    ): string {
        if (in_array($approvalState, ['draft', 'pending_review', 'rejected', 'archived'], true)) {
            return $approvalState;
        }

        if ($sellerVerified && $documentsReviewedAt !== '' && $siteVerifiedAt !== '') {
            return 'verified';
        }

        if ($sellerVerified || $documentsReviewedAt !== '' || $siteVerifiedAt !== '' || $documentCompletenessPct >= 50) {
            return 'partially_verified';
        }

        return 'unverified';
    }

    private function trustBadges(
        bool $sellerVerified,
        string $documentsReviewedAt,
        string $siteVerifiedAt,
        string $lastConfirmedAvailableAt,
        string $updatedAt
    ): array {
        $badges = [];
        if ($sellerVerified) {
            $badges[] = ['key' => 'verified_seller', 'label' => 'Verified Seller'];
        }
        if ($documentsReviewedAt !== '') {
            $badges[] = ['key' => 'documents_reviewed', 'label' => 'Documents Reviewed'];
        }
        if ($siteVerifiedAt !== '') {
            $badges[] = ['key' => 'site_verified', 'label' => 'Site Verified'];
        }
        if ($this->isRecentTimestamp($lastConfirmedAvailableAt ?: $updatedAt)) {
            $badges[] = ['key' => 'recently_updated', 'label' => 'Recently Updated'];
        }

        return $badges;
    }

    private function isRecentTimestamp(string $value, int $days = 14): bool
    {
        if ($value === '') {
            return false;
        }

        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return false;
        }

        return $timestamp >= strtotime(sprintf('-%d days', $days));
    }

    private function normalizeFlagTimestamp(mixed $flag, mixed $value, mixed $existing): ?string
    {
        if ($flag !== null && $flag !== '') {
            $flagText = strtolower(trim((string) $flag));
            if (in_array($flagText, ['0', 'false', 'no'], true)) {
                return null;
            }
            if (in_array($flagText, ['1', 'true', 'yes'], true)) {
                return $this->normalizeTimestampInput($value, $existing) ?? gmdate('Y-m-d H:i:s');
            }
        }

        return $this->normalizeTimestampInput($value, $existing);
    }

    private function normalizeTimestampInput(mixed $value, mixed $existing = null): ?string
    {
        if ($value === null || $value === '') {
            $value = $existing;
        }

        $normalized = trim((string) ($value ?? ''));
        if ($normalized === '') {
            return null;
        }

        $timestamp = strtotime($normalized);
        if ($timestamp === false) {
            return null;
        }

        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    private function normalizeDistanceInput(mixed $value): ?float
    {
        $distance = float_or_null($value);
        if ($distance === null || $distance < 0) {
            return null;
        }

        return round($distance, 2);
    }

    private function normalizeNullableScore(mixed $value): ?int
    {
        $score = int_or_null($value);
        if ($score === null) {
            return null;
        }

        return $this->clamp($score, 0, 100);
    }

    private function normalizeNullableInt(mixed $value): ?int
    {
        $number = int_or_null($value);
        if ($number === null || $number < 1) {
            return null;
        }

        return $number;
    }

    private function normalizeUtilityStatus(mixed $value): ?string
    {
        $normalized = strtolower(trim((string) ($value ?? '')));
        if ($normalized === '') {
            return null;
        }

        $normalized = str_replace(['-', ' '], '_', $normalized);
        return match ($normalized) {
            'full', 'ready', 'full_ready', 'full_fiber_/_power_/_water', 'full_fiber_power_water' => 'full_ready',
            'power_water', 'power_and_water' => 'power_water',
            'partial', 'partial_ready', 'partial_service' => 'partial',
            'limited', 'limited_service' => 'limited',
            'off_grid', 'offgrid' => 'off_grid',
            default => null,
        };
    }

    private function utilityStatusLabel(?string $status): string
    {
        return self::UTILITY_STATUS_LABELS[$status ?? ''] ?? 'Missing utility status';
    }

    private function dueDiligenceItems(): array
    {
        static $items = null;
        if ($items !== null) {
            return $items;
        }

        $meta = JsonData::meta();
        $rawItems = is_array($meta['dueDiligenceItems'] ?? null) ? $meta['dueDiligenceItems'] : [];
        $items = array_values(array_filter(array_map(static function (mixed $item): ?array {
            if (!is_array($item) || !isset($item['key'])) {
                return null;
            }

            return [
                'key' => (string) $item['key'],
                'label' => (string) ($item['label'] ?? self::humanizeIdentifier((string) $item['key'])),
            ];
        }, $rawItems)));

        return $items;
    }

    private function dueDiligencePct(array $state, array $items): int
    {
        if ($items === []) {
            return 0;
        }

        $complete = 0;
        foreach ($items as $item) {
            if (filter_var($state[$item['key']] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                $complete++;
            }
        }

        return (int) round(($complete / count($items)) * 100);
    }

    private function investmentReadiness(array $context): array
    {
        $spatialIndicators = [
            $this->readinessIndicator(
                'dist_to_road',
                'Distance to Primary Road',
                $context['distToRoadKm'] !== null ? sprintf('%.2f km', (float) $context['distToRoadKm']) : 'Missing',
                $context['distToRoadKm'] !== null
                    ? $this->clamp((int) round(100 - min(72, (float) $context['distToRoadKm'] * 18)), 28, 100)
                    : null
            ),
            $this->readinessIndicator(
                'corridor_quality',
                'Corridor Quality',
                self::humanizeIdentifier((string) $context['corridor']),
                match ((string) $context['corridor']) {
                    'highway' => 88,
                    'downtown' => 84,
                    'coastal' => 78,
                    default => 70,
                }
            ),
            $this->readinessIndicator(
                'location_clarity',
                'Location Clarity',
                $context['barangay'] !== null && $context['barangay'] !== '' ? (string) $context['barangay'] : 'Barangay missing',
                $context['barangay'] !== null && $context['barangay'] !== '' ? 96 : 52
            ),
            $this->readinessIndicator(
                'map_confidence',
                'Map Confidence',
                isset($context['lat'], $context['lng']) ? 'Mapped coordinates available' : 'Mapped coordinates missing',
                isset($context['lat'], $context['lng']) ? 95 : null
            ),
        ];

        $roadClass = $this->roadClassLabel((int) $context['roadAccess']);
        $utilityScore = $context['utilityStatus'] !== null ? (self::UTILITY_STATUS_SCORES[$context['utilityStatus']] ?? null) : null;
        $infrastructureIndicators = [
            $this->readinessIndicator(
                'road_access',
                'Road Access',
                sprintf('%d / 100', (int) $context['roadAccess']),
                (int) $context['roadAccess']
            ),
            $this->readinessIndicator(
                'road_class',
                'Road Class',
                $roadClass,
                $this->roadClassScore($roadClass)
            ),
            $this->readinessIndicator(
                'utility_status',
                'Utility Status',
                $this->utilityStatusLabel($context['utilityStatus']),
                $utilityScore
            ),
            $this->readinessIndicator(
                'service_coverage',
                'Service Coverage',
                $this->serviceCoverageLabel($context['facilities'] ?? []),
                $this->serviceCoverageScore($context['facilities'] ?? [], $context['utilityStatus'])
            ),
        ];

        $economicIndicators = [
            $this->readinessIndicator(
                'market_score',
                'Market Score',
                sprintf('%d / 100', (int) $context['marketScore']),
                (int) $context['marketScore']
            ),
            $this->readinessIndicator(
                'price_competitiveness',
                'Price Competitiveness',
                $context['pricePerSqm'] !== null ? sprintf('PHP %s / sqm', number_format((int) $context['pricePerSqm'])) : 'Price on request',
                $context['pricePerSqm'] !== null ? $this->priceCompetitivenessScore((int) $context['pricePerSqm'], is_array($context['priceBenchmark'] ?? null) ? $context['priceBenchmark'] : null) : null
            ),
            $this->readinessIndicator(
                'assessed_value_sqm',
                'Assessed Value / SQM',
                $context['assessedValueSqm'] !== null ? sprintf('PHP %s', number_format((int) $context['assessedValueSqm'])) : 'Missing assessed value',
                $context['assessedValueSqm'] !== null && $context['pricePerSqm'] !== null && $context['pricePerSqm'] > 0
                    ? $this->clamp((int) round(((int) $context['assessedValueSqm'] / max((int) $context['pricePerSqm'], 1)) * 100), 35, 100)
                    : null
            ),
            $this->readinessIndicator(
                'value_spread',
                'Value Spread',
                $context['assessedValueSqm'] !== null && $context['pricePerSqm'] !== null && $context['pricePerSqm'] > 0
                    ? sprintf('%s vs ask', ((int) $context['assessedValueSqm'] >= (int) $context['pricePerSqm']) ? 'At or above assessed' : 'Below assessed')
                    : 'Awaiting assessed benchmark',
                $context['assessedValueSqm'] !== null && $context['pricePerSqm'] !== null && $context['pricePerSqm'] > 0
                    ? $this->clamp((int) round(100 - (((int) $context['pricePerSqm'] - (int) $context['assessedValueSqm']) / max((int) $context['pricePerSqm'], 1)) * 100), 30, 100)
                    : null
            ),
        ];

        $institutionalIndicators = [
            $this->readinessIndicator(
                'zoning_score',
                'Zoning Score',
                $context['zoningScore'] !== null ? sprintf('%d / 100', (int) $context['zoningScore']) : 'Missing zoning score',
                $context['zoningScore']
            ),
            $this->readinessIndicator(
                'approval_state',
                'Approval State',
                self::humanizeIdentifier((string) $context['approvalState']),
                $this->approvalStateScore((string) $context['approvalState'])
            ),
            $this->readinessIndicator(
                'site_verified',
                'Site Verification',
                $context['siteVerifiedAt'] !== '' ? 'Site verified' : 'Site not verified',
                $context['siteVerifiedAt'] !== '' ? 100 : 34
            ),
            $this->readinessIndicator(
                'planning_fit',
                'Planning Fit',
                $this->planningFitLabel((string) $context['type'], (string) $context['corridor']),
                $this->planningFitScore((string) $context['type'], (string) $context['corridor'], $context['facilities'] ?? [])
            ),
        ];

        $legalIndicators = [
            $this->readinessIndicator(
                'dd_completion_pct',
                'Due Diligence Completion',
                sprintf('%d%% complete', (int) $context['dueDiligencePct']),
                (int) $context['dueDiligencePct']
            ),
            $this->readinessIndicator(
                'document_completeness_pct',
                'Document Completeness',
                sprintf('%d%% complete', (int) $context['documentCompletenessPct']),
                (int) $context['documentCompletenessPct']
            ),
            $this->readinessIndicator(
                'documents_reviewed',
                'Documents Reviewed',
                $context['documentsReviewedAt'] !== '' ? 'Reviewed by admin' : 'Pending review',
                $context['documentsReviewedAt'] !== '' ? 100 : 36
            ),
            $this->readinessIndicator(
                'legal_trust_state',
                'Legal Trust State',
                $this->legalTrustLabel((string) $context['listingVerificationStatus'], (string) $context['sellerIdentityStatus']),
                $this->legalTrustScore((string) $context['listingVerificationStatus'], (string) $context['sellerIdentityStatus'])
            ),
        ];

        $pillars = [
            'spatial' => $this->readinessPillar('spatial', 'Spatial', $spatialIndicators),
            'infrastructure' => $this->readinessPillar('infrastructure', 'Infrastructure', $infrastructureIndicators),
            'economic' => $this->readinessPillar('economic', 'Economic', $economicIndicators),
            'institutional' => $this->readinessPillar('institutional', 'Institutional', $institutionalIndicators),
            'legal' => $this->readinessPillar('legal', 'Legal', $legalIndicators),
        ];

        $weightedTotal = 0;
        $totalWeight = 0;
        $missingDataCount = 0;
        foreach ($pillars as $pillar) {
            $weightedTotal += (int) $pillar['score'] * (int) $pillar['weight'];
            $totalWeight += (int) $pillar['weight'];
            $missingDataCount += count($pillar['missingFields']);
        }

        $totalScore = $totalWeight > 0 ? (int) round($weightedTotal / $totalWeight) : 0;

        return [
            'totalScore' => $totalScore,
            'label' => $this->readinessLabel($totalScore),
            'status' => $this->readinessStatus($totalScore, $missingDataCount),
            'missingDataCount' => $missingDataCount,
            'lastComputedAt' => gmdate(DATE_ATOM),
            'pillars' => $pillars,
            'notes' => string_or_null($context['readinessNotes'] ?? null),
        ];
    }

    private function readinessPillar(string $key, string $label, array $indicators): array
    {
        $availableScores = [];
        $missingFields = [];
        foreach ($indicators as $indicator) {
            if ($indicator['missing']) {
                $missingFields[] = $indicator['label'];
                continue;
            }
            $availableScores[] = (int) $indicator['normalizedScore'];
        }

        $indicatorCount = max(count($indicators), 1);
        $availableCount = count($availableScores);
        $average = $availableCount > 0 ? (array_sum($availableScores) / $availableCount) : 0;
        $completenessRatio = $availableCount / $indicatorCount;
        $score = (int) round($average * $completenessRatio);

        return [
            'key' => $key,
            'label' => $label,
            'weight' => self::READINESS_PILLAR_WEIGHTS[$key] ?? 20,
            'score' => $score,
            'status' => $this->readinessStatus($score, count($missingFields)),
            'summary' => $this->pillarSummary($label, $score, count($missingFields)),
            'indicators' => $indicators,
            'missingFields' => $missingFields,
        ];
    }

    private function readinessIndicator(string $key, string $label, string $displayValue, ?int $normalizedScore): array
    {
        $score = $normalizedScore !== null ? $this->clamp($normalizedScore, 0, 100) : null;
        return [
            'key' => $key,
            'label' => $label,
            'displayValue' => $displayValue,
            'normalizedScore' => $score,
            'missing' => $score === null,
            'status' => $score === null ? 'missing' : $this->readinessStatus($score, 0),
        ];
    }

    private function readinessLabel(int $score): string
    {
        return match (true) {
            $score >= 80 => 'Highly Ready',
            $score >= 60 => 'Moderately Ready',
            default => 'Needs More Validation',
        };
    }

    private function readinessStatus(int $score, int $missingCount): string
    {
        if ($missingCount > 0 && $score < 70) {
            return 'incomplete';
        }

        return match (true) {
            $score >= 80 => 'strong',
            $score >= 60 => 'neutral',
            default => 'warning',
        };
    }

    private function pillarSummary(string $label, int $score, int $missingCount): string
    {
        if ($missingCount > 0) {
            return sprintf('%s has %d missing input%s.', $label, $missingCount, $missingCount === 1 ? '' : 's');
        }

        return match (true) {
            $score >= 80 => sprintf('%s is currently strong.', $label),
            $score >= 60 => sprintf('%s is usable but still uneven.', $label),
            default => sprintf('%s still needs validation.', $label),
        };
    }

    private function roadClassLabel(int $roadAccess): string
    {
        return match (true) {
            $roadAccess >= 90 => 'Primary',
            $roadAccess >= 75 => 'Secondary',
            default => 'Tertiary',
        };
    }

    private function roadClassScore(string $roadClass): int
    {
        return match (strtolower(trim($roadClass))) {
            'primary' => 100,
            'secondary' => 78,
            default => 58,
        };
    }

    private function serviceCoverageScore(array $facilities, ?string $utilityStatus): int
    {
        $keywords = ['utilities', 'fiber', 'power', 'water', 'backbone', 'transport', 'highway'];
        $hits = 0;
        foreach ($facilities as $facility) {
            $text = strtolower((string) $facility);
            foreach ($keywords as $keyword) {
                if (str_contains($text, $keyword)) {
                    $hits++;
                    break;
                }
            }
        }

        $utilityScore = $utilityStatus !== null ? (self::UTILITY_STATUS_SCORES[$utilityStatus] ?? 52) : 52;
        return $this->clamp((int) round(min(100, 48 + ($hits * 10) + ($utilityScore * 0.32))), 20, 100);
    }

    private function serviceCoverageLabel(array $facilities): string
    {
        $filtered = array_values(array_filter(array_map(static fn (mixed $value): string => trim((string) $value), $facilities)));
        if ($filtered === []) {
            return 'Facility coverage not detailed';
        }

        return implode(' / ', array_slice($filtered, 0, 3));
    }

    private function priceCompetitivenessScore(int $pricePerSqm, ?array $benchmark): int
    {
        if ($benchmark === null) {
            return 70;
        }

        $min = (int) ($benchmark['min'] ?? $pricePerSqm);
        $max = (int) ($benchmark['max'] ?? $pricePerSqm);
        if ($max <= $min) {
            return 100;
        }

        return $this->clamp((int) round((($max - $pricePerSqm) / ($max - $min)) * 100), 0, 100);
    }

    private function approvalStateScore(string $approvalState): int
    {
        return match ($approvalState) {
            'approved' => 100,
            'pending_review' => 70,
            'draft' => 45,
            'rejected' => 18,
            'archived' => 10,
            default => 40,
        };
    }

    private function planningFitScore(string $type, string $corridor, array $facilities): int
    {
        $base = match ([$type, $corridor]) {
            ['logistics', 'highway'], ['manufacturing', 'highway'] => 92,
            ['hotel', 'coastal'] => 90,
            ['commercial', 'downtown'], ['commercial', 'highway'] => 86,
            ['bpo', 'downtown'], ['bpo', 'highway'] => 88,
            default => 72,
        };

        $facilityBoost = 0;
        foreach ($facilities as $facility) {
            $text = strtolower((string) $facility);
            if (str_contains($text, 'fiber') || str_contains($text, 'highway') || str_contains($text, 'utilities')) {
                $facilityBoost += 3;
            }
        }

        return $this->clamp($base + min($facilityBoost, 8), 0, 100);
    }

    private function planningFitLabel(string $type, string $corridor): string
    {
        return sprintf('%s aligned with %s corridor', self::humanizeIdentifier($type), self::humanizeIdentifier($corridor));
    }

    private function legalTrustScore(string $listingVerificationStatus, string $sellerIdentityStatus): int
    {
        $base = match ($listingVerificationStatus) {
            'verified' => 100,
            'partially_verified' => 72,
            'unverified' => 45,
            'pending_review' => 36,
            'draft' => 28,
            'rejected' => 15,
            'archived' => 10,
            default => 40,
        };

        if ($sellerIdentityStatus === 'verified') {
            $base += 6;
        } elseif ($sellerIdentityStatus === 'pending') {
            $base += 2;
        }

        return $this->clamp($base, 0, 100);
    }

    private function legalTrustLabel(string $listingVerificationStatus, string $sellerIdentityStatus): string
    {
        if ($listingVerificationStatus === 'verified') {
            return 'Verified listing';
        }

        if ($sellerIdentityStatus === 'verified') {
            return 'Seller verified, listing still completing checks';
        }

        return 'Trust state still building';
    }

    private function clamp(int $value, int $min, int $max): int
    {
        return max($min, min($max, $value));
    }

    private function syncPrimaryMedia(int $propertyId, string $imageUrl, string $propertyName): void
    {
        $statement = $this->pdo->prepare(
            'SELECT id FROM property_media WHERE property_id = :property_id ORDER BY sort_order ASC, id ASC LIMIT 1'
        );
        $statement->execute(['property_id' => $propertyId]);
        $row = $statement->fetch();

        if ($row) {
            $update = $this->pdo->prepare(
                'UPDATE property_media
                 SET kind = :kind, source = :source, alt_text = :alt_text, sort_order = :sort_order
                 WHERE id = :id'
            );
            $update->execute([
                'id' => (int) $row['id'],
                'kind' => 'image',
                'source' => $imageUrl,
                'alt_text' => sprintf('%s listing image', $propertyName),
                'sort_order' => 0,
            ]);

            return;
        }

        $insert = $this->pdo->prepare(
            'INSERT INTO property_media (property_id, kind, source, alt_text, sort_order)
             VALUES (:property_id, :kind, :source, :alt_text, :sort_order)'
        );
        $insert->execute([
            'property_id' => $propertyId,
            'kind' => 'image',
            'source' => $imageUrl,
            'alt_text' => sprintf('%s listing image', $propertyName),
            'sort_order' => 0,
        ]);
    }

    private function ensureDueDiligenceRecord(int $propertyId): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO property_due_diligence (property_id, state_json)
             VALUES (:property_id, :state_json)
             ON DUPLICATE KEY UPDATE property_id = property_id'
        );
        $statement->execute([
            'property_id' => $propertyId,
            'state_json' => '{}',
        ]);
    }

    private function recordPropertyAudit(string $baseActionType, int $propertyId, ?array $beforeRow, ?array $afterRow, ?array $actor): void
    {
        if ($this->auditLogs === null) {
            return;
        }

        $before = $beforeRow !== null ? $this->auditSnapshot($beforeRow) : null;
        $after = $afterRow !== null ? $this->auditSnapshot($afterRow) : null;

        if ($baseActionType === 'EDIT' && $before === $after) {
            return;
        }

        $beforeApproval = strtolower((string) ($before['approvalState'] ?? ''));
        $afterApproval = strtolower((string) ($after['approvalState'] ?? ''));
        $actionType = $baseActionType;
        $eventType = 'DATA_EDIT';

        if ($baseActionType === 'CREATE') {
            $eventType = 'LISTING_CREATE';
        } elseif ($baseActionType === 'DELETE') {
            $eventType = 'LISTING_DELETE';
        } elseif ($baseActionType === 'RESTORE') {
            $eventType = 'LISTING_RESTORE';
        } elseif ($baseActionType === 'ARCHIVE' || $baseActionType === 'UNARCHIVE') {
            $eventType = 'LISTING_' . $baseActionType;
        } elseif ($beforeApproval !== $afterApproval && $afterApproval !== '') {
            $actionType = 'APPROVE';
            $eventType = 'LISTING_APPROVAL';
        }

        $changedFields = $this->changedFields($before ?? [], $after ?? []);
        $streamGroup = $actionType === 'APPROVE'
            ? 'moderation'
            : ($this->isFinancialAudit($changedFields) ? 'financials' : 'all');

        $this->auditLogs->record(
            isset($actor['id']) ? (int) $actor['id'] : null,
            $actionType,
            'PROPERTY',
            $propertyId,
            [
                'actorName' => (string) ($actor['name'] ?? 'Platform User'),
                'actorRole' => (string) ($actor['role'] ?? 'system'),
                'eventType' => $eventType,
                'targetLabel' => $this->propertyTargetLabel($propertyId),
                'summary' => $this->propertyAuditSummary($actionType, $before ?? [], $after ?? [], $changedFields),
                'before' => $before,
                'after' => $after,
                'changedFields' => $changedFields,
                'streamGroup' => $streamGroup,
                'badge' => $actionType === 'DELETE' ? 'CRITICAL' : ($actionType === 'APPROVE' ? 'VERIFIED' : 'TRACE'),
            ]
        );
    }

    private function auditSnapshot(array $row): array
    {
        $pricePerSqm = $this->effectivePricePerSqm($row);

        return [
            'name' => (string) ($row['name'] ?? ''),
            'city' => (string) ($row['city'] ?? self::DEFAULT_CITY),
            'barangay' => string_or_null($row['barangay'] ?? null),
            'lat' => float_or_null($row['lat'] ?? null),
            'lng' => float_or_null($row['lng'] ?? null),
            'area' => float_or_null($row['area'] ?? null),
            'listingPurpose' => (string) ($row['listing_purpose'] ?? 'sale'),
            'price' => isset($row['price']) ? (int) $row['price'] : null,
            'salePrice' => isset($row['price']) ? (int) $row['price'] : null,
            'leasePrice' => isset($row['lease_price']) ? (int) $row['lease_price'] : null,
            'leasePeriod' => (string) ($row['lease_period'] ?? 'month'),
            'leasePriceUnit' => (string) ($row['lease_price_unit'] ?? 'total'),
            'pricePerSqm' => $pricePerSqm,
            'status' => (string) ($row['status'] ?? ''),
            'approvalState' => (string) ($row['approval_state'] ?? ''),
            'deletedAt' => string_or_null($this->normalizeTimestamp($row['deleted_at'] ?? null)),
            'deletedByUserId' => int_or_null($row['deleted_by_user_id'] ?? null),
            'archivedAt' => string_or_null($this->normalizeTimestamp($row['archived_at'] ?? null)),
            'archivedByUserId' => int_or_null($row['archived_by_user_id'] ?? null),
            'marketScore' => isset($row['score']) ? (int) $row['score'] : 0,
            'type' => (string) ($row['type'] ?? ''),
            'corridor' => (string) ($row['corridor'] ?? ''),
            'tags' => $this->decodeJson($row['tags_json'] ?? '[]'),
            'facilities' => $this->decodeJson($row['facilities_json'] ?? '[]'),
            'roadAccess' => isset($row['road_access']) ? (int) $row['road_access'] : 0,
            'description' => (string) ($row['description'] ?? ''),
            'ownerContact' => $this->decodeJson($row['owner_contact_json'] ?? '{}'),
            'documents' => $this->normalizeDocumentStatuses($this->decodeJson($row['documents_json'] ?? '{}')),
            'sellerUserId' => isset($row['seller_user_id']) ? int_or_null($row['seller_user_id']) : null,
            'createdByUserId' => int_or_null($row['created_by_user_id'] ?? null),
            'documentsReviewedAt' => $this->normalizeTimestamp($row['documents_reviewed_at'] ?? null),
            'siteVerifiedAt' => $this->normalizeTimestamp($row['site_verified_at'] ?? null),
            'lastConfirmedAvailableAt' => $this->normalizeTimestamp($row['last_confirmed_available_at'] ?? null),
            'distToRoadKm' => float_or_null($row['dist_to_road_km'] ?? null),
            'utilityStatus' => string_or_null($row['utility_status'] ?? null),
            'zoningScore' => int_or_null($row['zoning_score'] ?? null),
            'assessedValueSqm' => $this->effectiveAssessedValueSqm($row['assessed_value_sqm'] ?? null, $pricePerSqm),
            'readinessNotes' => string_or_null($row['readiness_notes'] ?? null),
            'category' => string_or_null($row['category'] ?? null),
            'subcategory' => string_or_null($row['subcategory'] ?? null),
            'assessmentCriteria' => $this->decodeJson($row['assessment_json'] ?? '{}'),
            'automaticAssessment' => $this->decodeJson($row['automatic_assessment_json'] ?? '{}'),
            'legacyAssessment' => $this->decodeJson($row['legacy_assessment_json'] ?? '{}'),
            'assessmentTags' => $this->decodeJson($row['assessment_tags_json'] ?? '[]'),
            'nearbyProperties' => $this->decodeJson($row['nearby_properties_json'] ?? '[]'),
            'parcel' => $this->decodeJson($row['parcel_json'] ?? '{}'),
            'contactMode' => (string) ($row['contact_mode'] ?? 'open_listing'),
            'contactBrokerUserId' => int_or_null($row['contact_broker_user_id'] ?? null),
            'reviewNote' => string_or_null($row['review_note'] ?? null),
        ];
    }

    private function changedFields(array $before, array $after): array
    {
        $keys = array_values(array_unique([...array_keys($before), ...array_keys($after)]));
        $changed = [];
        foreach ($keys as $key) {
            $left = $before[$key] ?? null;
            $right = $after[$key] ?? null;
            if (json_encode($left, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) === json_encode($right, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) {
                continue;
            }
            $changed[] = (string) $key;
        }

        return $changed;
    }

    private function isFinancialAudit(array $changedFields): bool
    {
        $financialFields = ['listingPurpose', 'price', 'salePrice', 'leasePrice', 'leasePeriod', 'leasePriceUnit', 'pricePerSqm', 'assessedValueSqm'];
        foreach ($changedFields as $field) {
            if (in_array((string) $field, $financialFields, true)) {
                return true;
            }
        }

        return false;
    }

    private function propertyAuditSummary(string $actionType, array $before, array $after, array $changedFields): string
    {
        if ($actionType === 'CREATE') {
            return sprintf('Created listing %s for ledger monitoring.', (string) ($after['name'] ?? 'Untitled Property'));
        }

        if ($actionType === 'DELETE') {
            return sprintf('Moved listing %s to Recently deleted; its evidence and history are retained.', (string) ($before['name'] ?? 'Untitled Property'));
        }
        if ($actionType === 'RESTORE') {
            return sprintf('Restored listing %s with its previous availability and review state.', (string) ($after['name'] ?? 'Untitled Property'));
        }
        if ($actionType === 'ARCHIVE') {
            return sprintf('Archived listing %s; its availability, review state and history are retained.', (string) ($after['name'] ?? 'Untitled Property'));
        }
        if ($actionType === 'UNARCHIVE') {
            return sprintf('Unarchived listing %s with its retained availability; historical archives require review.', (string) ($after['name'] ?? 'Untitled Property'));
        }

        if ($actionType === 'APPROVE') {
            return sprintf(
                'Approval state changed from %s to %s.',
                self::humanizeIdentifier((string) ($before['approvalState'] ?? 'draft')),
                self::humanizeIdentifier((string) ($after['approvalState'] ?? 'approved'))
            );
        }

        $priorityFields = ['pricePerSqm', 'price', 'leasePrice', 'listingPurpose', 'roadAccess', 'zoningScore', 'status', 'utilityStatus'];
        foreach ($priorityFields as $field) {
            if (!in_array($field, $changedFields, true)) {
                continue;
            }

            return sprintf(
                '%s changed from %s to %s.',
                self::humanizeIdentifier($field),
                $this->auditValueLabel($before[$field] ?? null, $field),
                $this->auditValueLabel($after[$field] ?? null, $field)
            );
        }

        if ($changedFields !== []) {
            return sprintf(
                'Updated %s field%s on %s.',
                count($changedFields),
                count($changedFields) === 1 ? '' : 's',
                (string) ($after['name'] ?? $before['name'] ?? 'the listing')
            );
        }

        return sprintf('Reviewed %s with no material change.', (string) ($after['name'] ?? $before['name'] ?? 'the listing'));
    }

    private function auditValueLabel(mixed $value, string $field = ''): string
    {
        $normalizedField = strtolower(trim($field));

        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '[]';
        }

        if ($value === null || $value === '') {
            return 'empty';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (in_array($normalizedField, ['price', 'saleprice', 'leaseprice', 'pricepersqm', 'assessedvaluesqm'], true) && is_numeric($value)) {
            $suffix = in_array($normalizedField, ['pricepersqm', 'assessedvaluesqm'], true) ? ' / sqm' : '';
            return sprintf('PHP %s%s', number_format((int) $value), $suffix);
        }

        if ($normalizedField === 'approvalstate' || str_ends_with($normalizedField, 'status')) {
            return self::humanizeIdentifier((string) $value);
        }

        return (string) $value;
    }

    private function effectivePricePerSqm(array $row): ?int
    {
        if (($row['listing_purpose'] ?? 'sale') === 'lease') { return null; }
        return $this->pricePerSqm(isset($row['price']) ? (int) $row['price'] : null, float_or_null($row['area'] ?? null));
    }

    private function effectiveAssessedValueSqm(mixed $value, ?int $pricePerSqm): ?int
    {
        // Recorded valuation is independent of the listing's asking amounts.
        return int_or_null($value);
    }

    private function pricePerSqm(?int $price, ?float $area): ?int
    {
        if ($price === null || $area === null || $area <= 0) { return null; }
        // A one-square-metre parcel retains the exact integer, including large BIGINT values.
        if ($area === 0.0001) { return $price; }
        return $price === 0 ? 0 : max(1, (int) round($price / ($area * 10000)));
    }

    private function propertyTargetLabel(int $propertyId): string
    {
        return sprintf('PROP_ID: #SFLU-%03d', $propertyId);
    }

    private function decodeJson(?string $json): array
    {
        $decoded = json_decode((string) $json, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function normalizeTimestamp(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        return str_replace(' ', 'T', $value);
    }

    private static function humanizeIdentifier(string $value): string
    {
        $spaced = preg_replace('/([a-z])([A-Z])/', '$1 $2', $value) ?? $value;
        $normalized = trim(str_replace(['_', '-'], ' ', strtolower($spaced)));
        if ($normalized === '') {
            return '';
        }

        return preg_replace_callback('/\b([a-z])/', static fn (array $matches): string => strtoupper($matches[1]), $normalized) ?? $normalized;
    }
}
