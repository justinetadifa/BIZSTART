<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/PropertyAssessment.php';

/** Approved business fit profiles consume server-owned automatic assessment evidence. */
final class PropertyBusinessProfiles
{
    private const NEXT_ACTIONS = [
        'spatial_accessibility' => 'Confirm road access and add the authoritative road reference.',
        'infrastructure_readiness' => 'Confirm utility services and add their source evidence.',
        'economic_viability' => 'Add a dated BIR zonal reference applicable to this property category.',
        'nearby_businesses' => 'Run the surroundings radar and confirm the operating-business inventory coverage.',
        'zoning_compatibility' => 'Add the CLUP or zoning reference and confirm permitted uses.',
        'risk_constraints' => 'Review available hazard evidence and confirm its coverage.',
        'environmental_safety' => 'Add the authoritative environmental classification reference.',
    ];

    public function __construct(private array $config)
    {
    }

    public static function configured(): self
    {
        return new self(require dirname(__DIR__) . '/business-assessment-profiles.php');
    }

    public function evaluate(array $assessment): array
    {
        $labels = PropertyCatalog::criteria();
        $criteria = $assessment['assessmentCriteria'] ?? [];
        $missing = [];
        foreach (PropertyAssessment::WEIGHTS as $key => $weight) {
            $value = self::number(is_array($criteria) ? ($criteria[$key] ?? null) : null);
            if ($value === null || $value < 0 || $value > 100) {
                $missing[] = ['key' => $key, 'label' => $labels[$key], 'nextAction' => self::NEXT_ACTIONS[$key]];
            }
        }
        $complete = ($assessment['assessmentMode'] ?? null) === 'automatic'
            && ($assessment['assessmentComplete'] ?? false) === true && !$missing;
        $issues = $this->configurationIssues();
        $result = [
            'matches' => [], 'status' => 'pending',
            'message' => 'Business matches await complete source evidence and approved business-specific scoring profiles.',
            'weights' => PropertyAssessment::WEIGHTS,
            'assessmentComplete' => $complete, 'completedCount' => 7 - count($missing), 'totalCount' => 7,
            'missingCriteria' => $missing, 'pendingReasons' => $issues,
            'metadata' => [
                'approved' => !$issues,
                'version' => !$issues ? $this->config['version'] : null,
                'methodReference' => !$issues ? $this->config['method_reference'] : null,
                'approvalReference' => !$issues ? $this->config['approval_reference'] : null,
                'sourceReference' => !$issues ? $this->config['source_reference'] : null,
                'scoreScaleReference' => !$issues ? $this->config['score_scale_reference'] : null,
                'scoreLabel' => 'Business fit score',
                'assessmentVersion' => $assessment['assessmentVersion'] ?? null,
                'assessmentRuleVersion' => $assessment['ruleVersion'] ?? null,
                'assessmentGeneratedAt' => $assessment['generatedAt'] ?? null,
                'limitations' => 'Model eligibility does not establish business permits, customer demand, legal road access or parcel-wide hazard clearance.',
            ],
        ];
        if (!$complete) {
            $result['pendingReasons'][] = 'Complete all seven source-based assessment criteria before ranking business options.';
        }
        if ($issues || !$complete) {
            return $result;
        }

        $matches = [];
        foreach ($this->config['profiles'] as $profile) {
            if (!$this->eligible($profile['eligibility'], $assessment)) {
                continue;
            }
            $rows = [];
            $reasons = [];
            $concerns = [];
            if (($assessment['criteriaDetails']['zoning_compatibility']['raw']['zoning_status'] ?? null) === 'conditional') {
                $concerns[] = 'The mapped property category is conditional. Confirm the proposed business use and obtain site-specific zoning clearance.';
            }
            $total = 0.0;
            foreach (PropertyAssessment::WEIGHTS as $key => $weight) {
                $input = (float) $criteria[$key];
                foreach ($profile['criteria_rules'][$key]['bands'] as $band) {
                    if ($input <= (float) $band['max']) {
                        $rating = round((float) $band['rating'], 1);
                        $contribution = $rating * $weight / 100;
                        $total += $contribution;
                        $rows[] = ['key' => $key, 'label' => $labels[$key], 'rating' => $rating,
                            'weight' => $weight, 'contribution' => round($contribution, 3),
                            'inputRating' => $input, 'ruleReference' => $profile['criteria_rules'][$key]['reference'],
                            'evidence' => $assessment['criteriaDetails'][$key]['evidence'] ?? []];
                        $reasons[] = $band['reason'];
                        if (trim($band['concern']) !== '') {
                            $concerns[] = $band['concern'];
                        }
                        break;
                    }
                }
            }
            $matches[] = [
                'id' => $profile['id'], 'label' => $profile['label'], 'score' => round($total, 1),
                'criteria' => $rows, 'reasons' => array_values(array_unique($reasons)),
                'concerns' => array_values(array_unique($concerns)),
                'metadata' => ['approvalReference' => $profile['approval_reference'],
                    'sourceReference' => $profile['source_reference'],
                    'eligibilityReference' => $profile['eligibility_reference']],
            ];
        }
        usort($matches, static fn (array $a, array $b): int => ($b['score'] <=> $a['score']) ?: strcmp($a['id'], $b['id']));
        $result['matches'] = array_slice($matches, 0, 3);
        foreach ($result['matches'] as $index => &$match) {
            $match['rank'] = $index + 1;
        }
        unset($match);
        $result['status'] = $matches ? 'ready' : 'no_eligible_matches';
        $result['message'] = $matches
            ? 'Business options meeting the approved model checks are ranked using seven weighted criteria.'
            : 'No business option meets the documented eligibility checks for this property.';
        return $result;
    }

    private function configurationIssues(): array
    {
        if (($this->config['approved'] ?? false) !== true) {
            return ['Business-specific scoring profiles require department approval.'];
        }
        foreach (['approval_reference', 'version', 'method_reference', 'source_reference', 'score_scale_reference'] as $field) {
            if (!self::text($this->config[$field] ?? null)) {
                return ['Approved profiles need a version, approval reference, method, sources and comparable score-scale documentation.'];
            }
        }
        $weights = $this->config['weights'] ?? null;
        if (!is_array($weights) || !self::sameKeys($weights, PropertyAssessment::WEIGHTS)) {
            return ['Business profiles must retain exactly the seven documented criterion weights.'];
        }
        foreach (PropertyAssessment::WEIGHTS as $key => $weight) {
            if (self::number($weights[$key]) !== (float) $weight) {
                return ['Business profiles must retain exactly the seven documented criterion weights.'];
            }
        }
        $profiles = $this->config['profiles'] ?? null;
        if (!is_array($profiles) || !$profiles || !self::isList($profiles)) {
            return ['No documented business-specific scoring profiles have been configured.'];
        }
        $ids = [];
        foreach ($profiles as $profile) {
            if (!$this->validProfile($profile) || isset($ids[$profile['id']])) {
                return ['A business profile lacks valid documented eligibility checks or complete seven-criterion score mappings.'];
            }
            $ids[$profile['id']] = true;
        }
        return [];
    }

    private function validProfile(mixed $profile): bool
    {
        if (!is_array($profile)) {
            return false;
        }
        foreach (['id', 'label', 'approval_reference', 'source_reference', 'eligibility_reference'] as $field) {
            if (!self::text($profile[$field] ?? null)) {
                return false;
            }
        }
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{0,79}$/', $profile['id'])) {
            return false;
        }
        $eligibility = $profile['eligibility'] ?? null;
        if (!is_array($eligibility) || !self::stringList($eligibility['categories'] ?? null)
            || array_diff($eligibility['categories'], array_keys(PropertyCatalog::categories()))
            || !self::stringList($eligibility['zoning_classifications'] ?? null)
            || !self::stringList($eligibility['zoning_statuses'] ?? null)
            || array_diff($eligibility['zoning_statuses'], ['permitted', 'conditional'])) {
            return false;
        }
        $minimum = self::number($eligibility['minimum_area_ha'] ?? null);
        $maximum = self::number($eligibility['maximum_area_ha'] ?? null);
        if ($minimum === null || $minimum <= 0 || $maximum === null || $maximum < $minimum) {
            return false;
        }
        $rules = $profile['criteria_rules'] ?? null;
        if (!is_array($rules) || !self::sameKeys($rules, PropertyAssessment::WEIGHTS)) {
            return false;
        }
        foreach ($rules as $rule) {
            if (!is_array($rule) || ($rule['operator'] ?? null) !== 'bands'
                || !self::text($rule['reference'] ?? null) || !is_array($rule['bands'] ?? null)
                || !$rule['bands'] || !self::isList($rule['bands'])) {
                return false;
            }
            $previous = -1.0;
            foreach ($rule['bands'] as $band) {
                if (!is_array($band)) {
                    return false;
                }
                $max = self::number($band['max'] ?? null);
                $rating = self::number($band['rating'] ?? null);
                if ($max === null || $max < 0 || $max > 100 || $max <= $previous
                    || $rating === null || $rating < 0 || $rating > 100
                    || !self::text($band['reason'] ?? null) || !is_string($band['concern'] ?? null)) {
                    return false;
                }
                $previous = $max;
            }
            if ($previous !== 100.0) {
                return false;
            }
        }
        return true;
    }

    private function eligible(array $eligibility, array $assessment): bool
    {
        $inputs = $assessment['inputs'] ?? [];
        $zoning = $assessment['criteriaDetails']['zoning_compatibility']['raw'] ?? [];
        $area = self::number($inputs['landArea'] ?? null);
        return $area !== null && $area >= (float) $eligibility['minimum_area_ha']
            && $area <= (float) $eligibility['maximum_area_ha']
            && in_array($inputs['category'] ?? null, $eligibility['categories'], true)
            && in_array($zoning['zoning_classification'] ?? null, $eligibility['zoning_classifications'], true)
            && in_array($zoning['zoning_status'] ?? null, $eligibility['zoning_statuses'], true);
    }

    private static function number(mixed $value): ?float
    {
        return !is_bool($value) && is_numeric($value) && is_finite((float) $value) ? (float) $value : null;
    }

    private static function text(mixed $value): bool
    {
        return is_string($value) && trim($value) !== '';
    }

    private static function stringList(mixed $values): bool
    {
        return is_array($values) && $values !== [] && self::isList($values)
            && count(array_filter($values, [self::class, 'text'])) === count($values);
    }

    private static function sameKeys(array $left, array $right): bool
    {
        return count($left) === count($right) && !array_diff_key($left, $right) && !array_diff_key($right, $left);
    }

    private static function isList(array $values): bool
    {
        return $values === [] || array_keys($values) === range(0, count($values) - 1);
    }
}
