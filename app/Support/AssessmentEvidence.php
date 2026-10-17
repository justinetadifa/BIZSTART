<?php
declare(strict_types=1);

namespace App\Support;

/** Authentication is a recorded review, distinct from an asserted agency name or file integrity. */
final class AssessmentEvidence
{
    public static function authenticated(array $evidence): bool
    {
        if (($evidence['provenance_status'] ?? '') !== 'authenticated') {
            return false;
        }
        $record = $evidence['authentication_record'] ?? null;
        $hash = $evidence['sha256'] ?? null;
        if (!is_string($record) || !is_string($hash) || !preg_match('/^[a-f0-9]{64}$/i', $hash)) {
            return false;
        }
        // Only server-maintained review records can authenticate evidence. No request paths or URLs.
        $root = realpath(dirname(__DIR__, 2) . '/data/assessment/authentication');
        $path = $root === false ? false : realpath($root . DIRECTORY_SEPARATOR . $record);
        if ($path === false || !str_starts_with(strtolower($path), strtolower($root . DIRECTORY_SEPARATOR))
            || !is_file($path) || filesize($path) > 100000) {
            return false;
        }
        $review = json_decode((string) file_get_contents($path), true);
        $authenticated = is_array($review) && ($review['decision'] ?? '') === 'authenticated'
            && is_string($review['evidence_sha256'] ?? null)
            && hash_equals(strtolower($hash), strtolower($review['evidence_sha256']))
            && trim((string) ($review['reviewed_by'] ?? '')) !== ''
            && strtotime((string) ($review['reviewed_at'] ?? '')) !== false
            && trim((string) ($review['supporting_record'] ?? '')) !== '';
        if (!$authenticated) { return false; }
        // Dataset authentication cannot be reused as parcel-observation or ordinance-rule authentication.
        $fields = match ($evidence['scope'] ?? '') {
            'criterion_observations' => ['scope', 'criterion', 'input_sha256'],
            'zoning_rule' => ['scope', 'district', 'activity', 'rule_version'],
            'zoning_district' => ['scope', 'district', 'property_id'],
            default => [],
        };
        if (!$fields) { return true; }
        foreach ($review['claims'] ?? [] as $claim) {
            if (!is_array($claim)) { continue; }
            $matches = true;
            foreach ($fields as $field) {
                $valA = $evidence[$field] ?? null;
                $valB = $claim[$field] ?? null;
                if ($field === 'criterion') {
                    $aliasA = $valA === 'property_cost_market_competitiveness' ? 'economic_viability' : ($valA === 'economic_viability' ? 'property_cost_market_competitiveness' : $valA);
                    $matches = $matches && ($valA === $valB || $aliasA === $valB);
                } else {
                    $matches = $matches && isset($evidence[$field]) && $valA === $valB;
                }
            }
            if ($matches) { return true; }
        }
        return false;
    }

    /** Stable fingerprint of the observations actually scored, independent of object key order. */
    public static function inputHash(mixed $input): ?string
    {
        $canonicalize = static function (mixed $value) use (&$canonicalize): mixed {
            if (!is_array($value)) { return $value; }
            if (array_keys($value) !== ($value === [] ? [] : range(0, count($value) - 1))) { ksort($value); }
            return array_map($canonicalize, $value);
        };
        $json = json_encode($canonicalize($input), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        return $json === false ? null : hash('sha256', $json);
    }

    public static function supportsObservations(array $evidence, string $criterion, mixed $input): bool
    {
        $hash = self::inputHash($input);
        $aliasCriterion = $criterion === 'property_cost_market_competitiveness' ? 'economic_viability' : ($criterion === 'economic_viability' ? 'property_cost_market_competitiveness' : $criterion);
        foreach ($evidence as $item) {
            $itemCrit = $item['criterion'] ?? '';
            if (is_array($item) && ($item['scope'] ?? '') === 'criterion_observations'
                && ($itemCrit === $criterion || $itemCrit === $aliasCriterion)
                && $hash !== null && ($item['input_sha256'] ?? null) === $hash && self::authenticated($item)) { return true; }
        }
        return false;
    }

    public static function status(array $evidence): string
    {
        if (self::authenticated($evidence)) {
            return 'authenticated';
        }
        return ($evidence['provenance_status'] ?? '') === 'source_reported' && !empty($evidence['source'])
            ? 'source_reported' : 'unverified';
    }

    public static function complete(array $evidence): bool
    {
        if ($evidence === []) { return false; }
        foreach ($evidence as $item) {
            if (!is_array($item) || !self::authenticated($item)) { return false; }
        }
        return true;
    }
}
