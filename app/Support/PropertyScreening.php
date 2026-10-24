<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/AutomaticPropertyAssessment.php';
require_once __DIR__ . '/NearbyBusinessScreening.php';

/** Read-only preview from saved observations. Never substitutes for verified IAI or rankings. */
final class PropertyScreening
{
    public const VERSION = 'locus-saved-screening-v1';
    public const LABELS = [
        'spatial_accessibility' => 'Spatial access',
        'infrastructure_readiness' => 'Infrastructure',
        'property_cost_market_competitiveness' => 'Cost & market',
        'nearby_businesses' => 'Nearby businesses',
        'risk_constraints' => 'Risk & hazards',
    ];

    public static function fromProperty(array $property): array
    {
        $parcel = is_array($property['parcel'] ?? null) ? $property['parcel'] : [];
        $area = $parcel['surveyAreaSqm'] ?? $parcel['estimatedAreaSqm'] ?? null;
        if (!is_numeric($area) || (float) $area <= 0) { $area = isset($property['area']) ? (float) $property['area'] * 10000 : null; }
        $drawnArea = self::number($parcel['estimatedAreaSqm'] ?? null);
        $discrepancy = is_numeric($area) && $area > 0 && $drawnArea !== null && $drawnArea > 0
            && abs((float) $area - $drawnArea) / max((float) $area, $drawnArea) * 100 > 25;
        $observations = AutomaticPropertyAssessment::observations($parcel, [
            'land_area' => $area, 'asking_price' => $property['price'] ?? null,
            'lease_price' => $property['leasePrice'] ?? null, 'listing_purpose' => $property['listingPurpose'] ?? 'sale',
            'rent_period' => $property['leasePeriod'] ?? 'month', 'lease_price_unit' => $property['leasePriceUnit'] ?? 'total',
            'area_discrepancy' => $discrepancy,
        ]);
        $evaluations = [
            'spatial_accessibility' => PropertyAssessment::evaluateSpatialAccessibility($observations['spatial_accessibility']),
            'infrastructure_readiness' => PropertyAssessment::evaluateInfrastructureReadiness($observations['infrastructure_readiness']),
            'property_cost_market_competitiveness' => PropertyAssessment::evaluatePropertyCostMarketCompetitiveness($observations['property_cost_market_competitiveness'], ['preview_only' => true]),
            'nearby_businesses' => self::nearby($property, $parcel),
            'risk_constraints' => PropertyAssessment::evaluateRiskConstraints($observations['risk_constraints']),
        ];
        $criteria = $missing = [];
        $total = 0.0;
        $completed = 0;
        $weights = $property['weight_configuration'] ?? PropertyAssessmentService::weights();
        // A saved assessment keeps its recorded allocation; new previews use the active model.
        if (!isset($weights['property_cost_market_competitiveness']) && isset($weights['economic_viability'])) {
            $weights['property_cost_market_competitiveness'] = $weights['economic_viability'];
        }
        $weights = array_intersect_key($weights, PropertyAssessmentService::DEFAULT_WEIGHTS);
        try { PropertyAssessmentService::validateWeights($weights); }
        catch (\DomainException) {
            return ['version' => self::VERSION, 'score' => null, 'unrounded_total' => null,
                'completed_count' => 0, 'total_count' => 5, 'numerically_complete' => false,
                'is_verified' => false, 'rank_eligible' => false, 'status' => 'review_required',
                'reason' => 'The saved MCE weight configuration requires review.', 'criteria' => [],
                'weight_configuration' => $weights, 'formula' => '', 'technical_review_hold' => true];
        }
        foreach ($weights as $key => $weight) {
            $result = $evaluations[$key];
            $score = $result['score'] ?? null;
            $valid = is_numeric($score) && is_finite((float) $score) && $score >= 0 && $score <= 100;
            if ($valid) { $completed++; $total += (float) $score * $weight / 100; }
            else { $missing[] = self::LABELS[$key]; }
            $criteria[$key] = ['label' => self::LABELS[$key], 'score' => $valid ? (float) $score : null,
                'weight' => $weight, 'contribution' => $valid ? (float) $score * $weight / 100 : null,
                'missing' => $valid ? [] : ($result['missing_keys'] ?? $result['missing_requirements'] ?? $result['missing_subcriteria'] ?? [self::LABELS[$key] . ' observations']),
            ];
        }
        $clup = $property['clupProfile'] ?? [];
        $zoning = PropertyAssessment::evaluateZoningCompatibility([
            'zoning_classification' => $clup['zoningClassification'] ?? $property['zoningClassification'] ?? '',
            'proposed_activity' => $clup['proposedActivity'] ?? $property['proposedActivity'] ?? '',
        ]);
        $hasLocation = PropertyParcel::isInSanFernandoExtent(self::number($property['lat'] ?? null), self::number($property['lng'] ?? null));
        $hold = !empty($evaluations['risk_constraints']['technical_review_hold']) || !empty($evaluations['risk_constraints']['has_critical_constraint']);
        $prohibited = ($zoning['status'] ?? '') === 'prohibited';
        $complete = $completed === count(self::LABELS);
        $status = !$hasLocation ? 'location_needed' : ($prohibited ? 'prohibited' : ($hold ? 'technical_review_hold'
            : (!$complete ? 'incomplete' : (($zoning['status'] ?? '') === 'undetermined' ? 'zoning_pending' : 'provisional'))));
        $reason = match ($status) {
            'location_needed' => 'Confirm coordinates within San Fernando City.',
            'prohibited' => 'Proposed activity is prohibited in the recorded zone.',
            'technical_review_hold' => 'High or critical hazard findings require technical review.',
            'incomplete' => 'Complete ' . implode(', ', $missing) . '.',
            'zoning_pending' => 'Five criteria calculated. Confirm CLUP zoning and the proposed activity.',
            default => ($zoning['status'] ?? '') === 'conditional' ? 'Conditional zoning; clearance requirements remain outstanding.' : 'Five criteria calculated. City evidence review pending.',
        };
        return [
            'version' => self::VERSION, 'score' => $complete && $hasLocation && !$hold && !$prohibited ? round($total, 1, PHP_ROUND_HALF_UP) : null,
            'unrounded_total' => $complete ? $total : null, 'completed_count' => $completed, 'total_count' => count(self::LABELS),
            'numerically_complete' => $complete, 'is_verified' => false, 'rank_eligible' => false,
            'status' => $status, 'reason' => $reason, 'criteria' => $criteria,
            'zoning_status' => $zoning['status'] ?? 'undetermined', 'technical_review_hold' => $hold,
            'business_type' => $parcel['observations']['nearby_screening']['observations']['business_type'] ?? null,
            'weight_configuration' => $weights,
            'formula' => implode(' + ', array_map(static fn ($key) => self::LABELS[$key] . ' × ' . (float) $weights[$key] . '%', array_keys($weights))),
            'disclaimer' => 'Provisional calculation from saved observations. Final IAI and ranking require authorized evidence verification. Nearby reference counts await city calibration.',
        ];
    }

    private static function nearby(array $property, array $parcel): array
    {
        $missing = ['score' => null, 'missing_requirements' => ['Run and save the 500 m nearby search.']];
        $raw = $parcel['observations']['nearby_screening'] ?? null;
        if (!is_array($raw)) { return $missing; }
        try { $screening = NearbyBusinessScreening::evaluate($raw); }
        catch (\InvalidArgumentException) { return $missing; }
        $record = $screening['observations'];
        $reference = $parcel['referencePoint'] ?? [];
        if (($reference['label'] ?? '') === 'location') { $reference = ['lat' => $property['lat'] ?? null, 'lng' => $property['lng'] ?? null]; }
        if (self::number($reference['lat'] ?? null) === null || self::number($reference['lng'] ?? null) === null
            || abs((float) $reference['lat'] - (float) $record['reference_lat']) > .0000005
            || abs((float) $reference['lng'] - (float) $record['reference_lng']) > .0000005) {
            return $missing;
        }
        return $screening;
    }

    private static function number(mixed $value): ?float
    {
        return is_numeric($value) && is_finite((float) $value) ? (float) $value : null;
    }
}
