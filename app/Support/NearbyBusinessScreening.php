<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/** An explicit operational screening model, separate from authenticated BPLO scoring. */
final class NearbyBusinessScreening
{
    public const VERSION = 'nearby-observed-screening-v1';
    public const BUSINESS_REFERENCE_COUNT = 20;
    public const COMPLEMENTARY_REFERENCE_COUNT = 5;
    public const ANCHOR_REFERENCE_COUNT = 3;
    public const RADIUS_METERS = 500;
    public const WEIGHTS = ['commercial_activity' => 25, 'complementary_businesses' => 30, 'competitive_pressure' => 30, 'activity_anchors' => 15];
    public const DISCLAIMER = 'Provisional operational model; reference counts await city calibration. Mapping is incomplete. This is not a certified BPLO score, proof of demand, or a profitability estimate.';

    public static function fromRadar(array $result, float $lat, float $lng, int $radius, string $businessType): array
    {
        $counts = ['places' => count($result['features'] ?? []), 'businesses' => 0, 'competitors' => 0, 'complementary' => 0, 'anchors' => 0];
        foreach ($result['features'] ?? [] as $feature) {
            $p = $feature['properties'] ?? [];
            $business = ($p['isBusiness'] ?? false) === true;
            if ($business) { $counts['businesses']++; }
            // Anchors and complementary places are disjoint in this screening model.
            if (($p['isAnchor'] ?? false) === true) { $counts['anchors']++; }
            elseif (($p['classification'] ?? '') === 'competitor' && $business) { $counts['competitors']++; }
            elseif (($p['classification'] ?? '') === 'complementary') { $counts['complementary']++; }
        }
        return self::evaluate([
            'business_type' => $businessType, 'radius_m' => $radius, 'reference_lat' => $lat, 'reference_lng' => $lng,
            'counts' => $counts, 'source' => $result['source'] ?? 'Mapped inventory',
            'observed_at' => $result['retrievalDate'] ?? 'Date not recorded', 'coverage' => $result['coverage'] ?? 'unknown',
        ]);
    }

    /** Recompute from observations; a submitted rating or verification flag is never trusted. */
    public static function evaluate(array $raw): array
    {
        $input = $raw['observations'] ?? $raw;
        if (!is_array($input)) { throw new InvalidArgumentException('Nearby screening observations must be an object.'); }
        $counts = $input['counts'] ?? null;
        if (!is_array($counts)) { throw new InvalidArgumentException('Nearby screening requires observed counts.'); }
        foreach (['places', 'businesses', 'competitors', 'complementary', 'anchors'] as $key) {
            if (!isset($counts[$key]) || !is_int($counts[$key]) || $counts[$key] < 0 || $counts[$key] > 100000) {
                throw new InvalidArgumentException('Nearby counts must be non-negative whole numbers.');
            }
        }
        $counts = array_intersect_key($counts, array_flip(['places', 'businesses', 'competitors', 'complementary', 'anchors']));
        if ($counts['businesses'] > $counts['places'] || $counts['competitors'] > $counts['businesses']
            || $counts['competitors'] + $counts['complementary'] + $counts['anchors'] > $counts['places']) {
            throw new InvalidArgumentException('Nearby classifications cannot exceed the observed inventory.');
        }
        foreach (['reference_lat' => 90, 'reference_lng' => 180] as $key => $limit) {
            if (!isset($input[$key]) || !is_numeric($input[$key]) || !is_finite((float) $input[$key]) || abs((float) $input[$key]) > $limit) {
                throw new InvalidArgumentException('Nearby screening requires valid reference coordinates.');
            }
        }
        if (!isset($input['radius_m']) || !is_int($input['radius_m']) || $input['radius_m'] < 100 || $input['radius_m'] > 1500) {
            throw new InvalidArgumentException('Nearby screening requires a valid radius.');
        }
        foreach (['business_type', 'source', 'observed_at', 'coverage'] as $key) {
            if (!is_string($input[$key] ?? null) || strlen($input[$key]) > 500) { throw new InvalidArgumentException('Nearby screening metadata is invalid.'); }
        }
        $observations = array_intersect_key($input, array_flip(['business_type', 'radius_m', 'reference_lat', 'reference_lng', 'source', 'observed_at', 'coverage']));
        $observations['counts'] = $counts;
        $supported = in_array($input['business_type'], ['cafe', 'retail', 'office', 'hospitality', 'industrial'], true);
        $complete = $supported && $input['radius_m'] === self::RADIUS_METERS && $counts['businesses'] > 0;
        $ratings = $complete ? [
            'commercial_activity' => min(100.0, $counts['businesses'] / self::BUSINESS_REFERENCE_COUNT * 100),
            'complementary_businesses' => min(100.0, $counts['complementary'] / self::COMPLEMENTARY_REFERENCE_COUNT * 100),
            'competitive_pressure' => (1 - $counts['competitors'] / $counts['businesses']) * 100,
            'activity_anchors' => min(100.0, $counts['anchors'] / self::ANCHOR_REFERENCE_COUNT * 100),
        ] : [];
        $rules = [
            'commercial_activity' => 'min(mapped businesses / ' . self::BUSINESS_REFERENCE_COUNT . ', 1) × 100',
            'complementary_businesses' => 'min(non-anchor complementary places / ' . self::COMPLEMENTARY_REFERENCE_COUNT . ', 1) × 100',
            'competitive_pressure' => '(1 − direct competitors / mapped businesses) × 100',
            'activity_anchors' => 'min(activity anchors / ' . self::ANCHOR_REFERENCE_COUNT . ', 1) × 100',
        ];
        $subcriteria = [];
        $sum = 0.0;
        foreach (self::WEIGHTS as $key => $weight) {
            $rating = $ratings[$key] ?? null;
            $points = $rating === null ? null : $rating * $weight / 100;
            $sum += $points ?? 0;
            $subcriteria[$key] = ['score' => $rating, 'weight' => $weight, 'weighted_score' => $points, 'rule' => $rules[$key]];
        }
        return [
            'model_version' => self::VERSION, 'score' => $complete ? $sum : null,
            'iai_contribution' => $complete ? round($sum * .15, 2) : null,
            'weight' => 15, 'is_complete' => $complete, 'is_verified' => false,
            'status_label' => $complete ? 'Provisional screening' : 'More observations needed',
            'verification_status' => 'reported_unverified', 'subcriteria' => $subcriteria, 'observations' => $observations,
            'disclaimer' => self::DISCLAIMER,
            'missing_requirements' => $complete ? [] : [!$supported ? 'Select a supported proposed business type.' : ($input['radius_m'] !== self::RADIUS_METERS ? 'Use the 500 m radar for this model.' : 'No usable mapped businesses. Check local coverage or add a documented inventory before scoring.')],
        ];
    }
}
