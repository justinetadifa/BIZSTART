<?php
declare(strict_types=1);

namespace App\Support;

use PDO;
use InvalidArgumentException;
use DomainException;

require_once __DIR__ . '/V2StructuredFacts.php';
require_once __DIR__ . '/V2EligibilityEngine.php';
require_once __DIR__ . '/V2ScoringEngine.php';

final class V2PropertyAssessmentService
{
    public const VERSION = 'LOCUS-SF v2.0 Evidence-Backed Business Assessment';

    public static function defaultProjectProfile(): array
    {
        return [
            'id' => null,
            'name' => 'Default Commercial Assessment',
            'intended_business' => 'Retail / Commercial Goods',
            'transaction_type' => 'lease',
            'total_setup_budget' => 5000000.0,
            'required_usable_area' => 150.0,
            'opening_timeline' => '3_to_6_months',
            'essential_operational_requirements' => [
                'water_connection',
                'outside_high_flood',
            ],
            'preferred_barangays' => [],
        ];
    }

    public static function evaluate(array $property, ?array $profile = null, ?array $scenarioConfig = null, ?PDO $pdo = null): array
    {
        $profile = is_array($profile) && !empty($profile) ? $profile : self::defaultProjectProfile();
        $facts = $property['structured_facts'] ?? null;
        if (!is_array($facts)) {
            $raw = $property['structured_facts_json'] ?? null;
            $facts = is_string($raw) ? (json_decode($raw, true) ?: null) : null;
            if (!is_array($facts)) {
                $facts = V2StructuredFacts::generateBaselineFacts($property);
            }
        }
        $property['structured_facts'] = $facts;

        $evaluation = V2ScoringEngine::evaluate($property, $profile, $scenarioConfig);
        $evaluation['methodology_version'] = self::VERSION;
        $evaluation['profile_applied'] = [
            'id' => $profile['id'] ?? null,
            'name' => $profile['name'] ?? 'Custom Profile',
            'intended_business' => $profile['intended_business'] ?? 'Commercial',
            'transaction_type' => $profile['transaction_type'] ?? 'lease',
            'total_setup_budget' => $profile['total_setup_budget'] ?? 0,
            'required_usable_area' => $profile['required_usable_area'] ?? 0,
        ];

        return $evaluation;
    }

    public static function updatePropertyStructuredFacts(
        int $propertyId,
        array $updatedFacts,
        array $user,
        PDO $pdo
    ): array {
        $stmt = $pdo->prepare('SELECT id, name, area, price, lease_price, zoning_classification, structured_facts_json, seller_user_id FROM properties WHERE id = :id AND deleted_at IS NULL');
        $stmt->execute(['id' => $propertyId]);
        $property = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$property) {
            throw new DomainException('Property not found.');
        }

        $isBroker = ($user['role'] ?? '') === 'seller';
        $isAdmin = ($user['role'] ?? '') === 'admin';

        if ($isBroker) {
            if ((int) ($property['seller_user_id'] ?? 0) !== (int) ($user['id'] ?? 0)) {
                throw new DomainException('You may only update structured information for your own listings.');
            }
        } elseif (!$isAdmin) {
            throw new DomainException('Authorized city staff or approved listing broker credentials required.');
        }

        $existing = is_string($property['structured_facts_json'] ?? null)
            ? (json_decode($property['structured_facts_json'], true) ?: [])
            : [];
        $currentFacts = V2StructuredFacts::generateBaselineFacts($property, $existing);

        // Merge incoming domain updates
        foreach ($updatedFacts as $domain => $domainItems) {
            if (!isset(V2StructuredFacts::DOMAINS[$domain]) || !is_array($domainItems)) {
                continue;
            }
            foreach ($domainItems as $factKey => $factUpdate) {
                if (!is_array($factUpdate)) continue;

                $oldFact = $currentFacts[$domain][$factKey] ?? V2StructuredFacts::factTemplate();
                $value = array_key_exists('value', $factUpdate) ? $factUpdate['value'] : $oldFact['value'];
                $unit = array_key_exists('unit', $factUpdate) ? $factUpdate['unit'] : $oldFact['unit'];
                $source = trim((string) ($factUpdate['source'] ?? $oldFact['source']));
                $obsDate = $factUpdate['observation_date'] ?? $oldFact['observation_date'];
                $reviewer = $factUpdate['reviewer'] ?? $oldFact['reviewer'];
                $limitations = $factUpdate['limitations'] ?? $oldFact['limitations'];

                $requestedStatus = (string) ($factUpdate['verification_status'] ?? $oldFact['verification_status']);
                if (!in_array($requestedStatus, V2StructuredFacts::VERIFICATION_STATUSES, true)) {
                    $requestedStatus = V2StructuredFacts::STATUS_UNKNOWN;
                }

                // Security / Governance Rule:
                // Owner/broker submissions CANNOT set status to 'verified'.
                // If a broker updates, status is locked to 'unverified'.
                if ($isBroker) {
                    $verificationStatus = V2StructuredFacts::STATUS_UNVERIFIED;
                    $reviewer = null;
                    if (empty($source)) {
                        $source = 'Broker / Owner Submission';
                    }
                } else {
                    // Admin staff verification
                    $verificationStatus = $requestedStatus;
                    if ($verificationStatus === V2StructuredFacts::STATUS_VERIFIED && empty($reviewer)) {
                        $reviewer = ($user['name'] ?? 'Staff') . ' (' . ($user['department'] ?? 'LGU') . ')';
                    }
                }

                $currentFacts[$domain][$factKey] = V2StructuredFacts::factTemplate(
                    $value,
                    $unit,
                    $source,
                    $obsDate,
                    $verificationStatus,
                    $reviewer,
                    $limitations
                );
            }
        }

        $factsJson = json_encode($currentFacts, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $property['structured_facts'] = $currentFacts;
        $property['structured_facts_json'] = $factsJson;

        // Run evaluation
        $evaluation = self::evaluate($property, null, null, $pdo);
        $v2AssessmentJson = json_encode($evaluation, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $eligibilityStatus = $evaluation['eligibility']['status'] ?? null;
        $iaiScore = $evaluation['iai_score'] ?? null;

        // Save to properties table
        $updateStmt = $pdo->prepare(
            'UPDATE properties
            SET structured_facts_json = :facts_json,
                v2_assessment_json = :v2_json,
                v2_eligibility_status = :eligibility_status,
                v2_iai_score = :iai_score
            WHERE id = :id'
        );
        $updateStmt->execute([
            'facts_json' => $factsJson,
            'v2_json' => $v2AssessmentJson,
            'eligibility_status' => $eligibilityStatus,
            'iai_score' => $iaiScore,
            'id' => $propertyId,
        ]);

        // Record in property_assessment_versions table for audit
        $verStmt = $pdo->prepare(
            'INSERT INTO property_assessment_versions
            (property_id, assessment_version, scenario_key, eligibility_status, non_negotiable_results_json, mce_score, iai_score, evidence_coverage_pct, strengths_json, tradeoffs_json, unresolved_checks_json, next_actions_json, score_breakdown_json, validation_status, is_authoritative, assessed_by_user_id)
            VALUES
            (:property_id, :assessment_version, :scenario_key, :eligibility_status, :non_negotiable_results_json, :mce_score, :iai_score, :evidence_coverage_pct, :strengths_json, :tradeoffs_json, :unresolved_checks_json, :next_actions_json, :score_breakdown_json, :validation_status, :is_authoritative, :assessed_by_user_id)'
        );
        $verStmt->execute([
            'property_id' => $propertyId,
            'assessment_version' => 'v2',
            'scenario_key' => $evaluation['scenario_key'] ?? 'default',
            'eligibility_status' => $eligibilityStatus ?? 'unknown',
            'non_negotiable_results_json' => json_encode($evaluation['eligibility']['checks'] ?? [], JSON_UNESCAPED_UNICODE),
            'mce_score' => $evaluation['raw_composite_score'] ?? null,
            'iai_score' => $iaiScore,
            'evidence_coverage_pct' => $evaluation['evidence_coverage_pct'] ?? 0.0,
            'strengths_json' => json_encode($evaluation['strengths'] ?? [], JSON_UNESCAPED_UNICODE),
            'tradeoffs_json' => json_encode($evaluation['tradeoffs'] ?? [], JSON_UNESCAPED_UNICODE),
            'unresolved_checks_json' => json_encode($evaluation['unresolved_checks'] ?? [], JSON_UNESCAPED_UNICODE),
            'next_actions_json' => json_encode($evaluation['next_actions'] ?? [], JSON_UNESCAPED_UNICODE),
            'score_breakdown_json' => json_encode($evaluation['score_breakdown'] ?? [], JSON_UNESCAPED_UNICODE),
            'validation_status' => $evaluation['validation_status'] ?? 'draft',
            'is_authoritative' => ($evaluation['is_authoritative'] ?? false) ? 1 : 0,
            'assessed_by_user_id' => (int) ($user['id'] ?? 0) ?: null,
        ]);

        // Audit log
        $auditStmt = $pdo->prepare(
            'INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, metadata)
            VALUES (:actor_id, :action_type, :entity_type, :entity_id, :metadata)'
        );
        $auditStmt->execute([
            'actor_id' => (int) ($user['id'] ?? 0) ?: null,
            'action_type' => $isBroker ? 'SUBMIT_STRUCTURED_FACTS' : 'VERIFY_STRUCTURED_FACTS',
            'entity_type' => 'PROPERTY',
            'entity_id' => $propertyId,
            'metadata' => json_encode([
                'user_role' => $user['role'] ?? 'unknown',
                'eligibility_status' => $eligibilityStatus,
                'iai_score' => $iaiScore,
                'evidence_coverage_pct' => $evaluation['evidence_coverage_pct'] ?? 0.0,
            ], JSON_UNESCAPED_UNICODE),
        ]);

        return [
            'property_id' => $propertyId,
            'structured_facts' => $currentFacts,
            'evaluation' => $evaluation,
        ];
    }
}

