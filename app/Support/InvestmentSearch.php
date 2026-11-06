<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

require_once __DIR__ . '/PropertyCatalog.php';
require_once __DIR__ . '/ListingPresentation.php';

/** Validated preference matching. This class never calculates investment suitability. */
final class InvestmentSearch
{
    public const MISSING = 'This information is not available in the current listing.';
    public const BUDGET_BASES = ['sale_total', 'sale_sqm', 'lease_month_total', 'lease_year_total', 'lease_day_total', 'lease_month_sqm', 'lease_year_sqm', 'lease_day_sqm'];
    public const EMPTY_CRITERIA = ['category' => null, 'subcategory' => null, 'purpose' => null, 'budget' => null, 'budgetBasis' => null, 'barangay' => null, 'minArea' => null, 'maxArea' => null, 'activity' => null];

    public static function options(): array
    {
        static $options = null;
        if ($options !== null) { return $options; }
        $barangays = PropertyCatalog::barangays();
        $isList = $barangays === [] || array_keys($barangays) === range(0, count($barangays) - 1);
        return $options = ['categories' => PropertyCatalog::categories(), 'barangays' => $isList ? $barangays : array_keys($barangays), 'budgetBases' => self::BUDGET_BASES];
    }

    public static function normalizeCriteria(array $input): array
    {
        if (array_diff(array_keys($input), array_keys(self::EMPTY_CRITERIA))) {
            throw new InvalidArgumentException('One or more search filters are not supported.');
        }
        $criteria = self::EMPTY_CRITERIA;
        foreach ($input as $key => $value) {
            if ($value === null || $value === '') { continue; }
            if (in_array($key, ['budget', 'minArea', 'maxArea'], true)) {
                if ((!is_int($value) && !is_float($value) && !is_string($value)) || !is_numeric($value)
                    || !is_finite((float) $value) || (float) $value <= 0 || (float) $value > 1000000000000) {
                    throw new InvalidArgumentException('Enter a positive, finite ' . ($key === 'budget' ? 'budget' : 'area in square metres') . ' no greater than 1 trillion.');
                }
                $criteria[$key] = (float) $value;
                continue;
            }
            if (!is_string($value) || mb_strlen($value) > ($key === 'activity' ? 100 : 120) || preg_match('/[\x00-\x1f\x7f]/u', $value)) {
                throw new InvalidArgumentException('Enter valid search filter text.');
            }
            $criteria[$key] = trim($value) ?: null;
        }
        $catalog = self::options();
        $criteria['category'] = self::enum($criteria['category'], array_keys($catalog['categories']), 'property type');
        $allSubcategories = array_merge(...array_values($catalog['categories']));
        $criteria['subcategory'] = self::enum($criteria['subcategory'], $allSubcategories, 'property subtype');
        if ($criteria['subcategory'] !== null) {
            $parent = null;
            foreach ($catalog['categories'] as $category => $subcategories) {
                if (in_array($criteria['subcategory'], $subcategories, true)) { $parent = $category; break; }
            }
            if ($criteria['category'] !== null && $criteria['category'] !== $parent) {
                throw new InvalidArgumentException('The property subtype must belong to the selected property type.');
            }
            $criteria['category'] = $parent;
        }
        $criteria['purpose'] = self::enum($criteria['purpose'], ['sale', 'lease'], 'sale or lease purpose');
        $criteria['budgetBasis'] = self::enum($criteria['budgetBasis'], self::BUDGET_BASES, 'budget basis');
        $criteria['barangay'] = self::enum($criteria['barangay'], $catalog['barangays'], 'San Fernando barangay');
        if ($criteria['budgetBasis'] !== null) {
            $purpose = str_starts_with($criteria['budgetBasis'], 'sale_') ? 'sale' : 'lease';
            if ($criteria['purpose'] !== null && $criteria['purpose'] !== $purpose) {
                throw new InvalidArgumentException('The budget basis must agree with sale or lease.');
            }
            $criteria['purpose'] = $purpose;
        }
        if ($criteria['minArea'] !== null && $criteria['maxArea'] !== null && $criteria['minArea'] > $criteria['maxArea']) {
            throw new InvalidArgumentException('Minimum lot area cannot exceed maximum lot area.');
        }
        return $criteria;
    }

    private static function enum(?string $value, array $allowed, string $label): ?string
    {
        if ($value === null) { return null; }
        foreach ($allowed as $canonical) {
            if (mb_strtolower($canonical) === mb_strtolower($value)) { return $canonical; }
        }
        throw new InvalidArgumentException('Choose a supported ' . $label . '.');
    }

    /** PropertyRepository's effective survey/estimated area is already expressed in hectares. */
    public static function areaSqm(array $property): ?float
    {
        $value = $property['area'] ?? $property['landArea'] ?? null;
        if (!self::positiveNumber($value) || ($property['areaKnown'] ?? true) === false) { return null; }
        return (float) $value * 10000;
    }

    private static function positiveNumber(mixed $value): bool
    {
        return !is_bool($value) && is_numeric($value) && is_finite((float) $value) && (float) $value > 0;
    }

    /** Never treat a building's land area as its offered floor area. */
    private static function offeredAreaSqm(array $property): ?float
    {
        $observations = $property['parcel']['observations'] ?? [];
        foreach (['offered_area_sqm', 'leasable_area_sqm'] as $key) {
            if (self::positiveNumber($observations[$key] ?? null)) { return (float) $observations[$key]; }
        }
        if (($observations['offered_space_scope'] ?? '') === 'entire_land'
            || (($property['category'] ?? '') === 'Land' && !in_array($observations['offered_space_scope'] ?? '', ['part_property', 'whole_building', 'unit'], true))) {
            return self::areaSqm($property);
        }
        return null;
    }

    /** Comparable amount plus its factual normalization; unknown/incompatible values remain null. */
    public static function comparablePrice(array $property, string $basis): array
    {
        $purpose = $property['listingPurpose'] ?? null;
        $note = null;
        if (str_starts_with($basis, 'sale_')) {
            if (!in_array($purpose, ['sale', 'sale_or_lease'], true)) { return [null, null]; }
            $price = ListingPresentation::salePrice($property);
            if ($price === null || $price <= 0) { return [null, null]; }
            if ($basis === 'sale_sqm') {
                $area = self::areaSqm($property);
                if ($area === null) { return [null, null]; }
                return [$price / $area, 'Sale asking price divided by recorded lot area'];
            }
            return [$price, null];
        }
        if (!in_array($purpose, ['lease', 'sale_or_lease'], true) || !self::positiveNumber($property['leasePrice'] ?? null)) { return [null, null]; }
        $parts = explode('_', $basis);
        if (count($parts) !== 3 || !in_array($parts[1], ['day', 'month', 'year'], true) || !in_array($parts[2], ['total', 'sqm'], true)) { return [null, null]; }
        $period = $property['leasePeriod'] ?? null;
        $unit = $property['leasePriceUnit'] ?? null;
        if (!in_array($period, ['day', 'month', 'year'], true) || !in_array($unit, ['total', 'sqm'], true)) { return [null, null]; }
        $amount = (float) $property['leasePrice'];
        if ($period !== $parts[1]) {
            if ($period === 'year' && $parts[1] === 'month') { $amount /= 12; $note = 'Monthly equivalent of the recorded annual rent'; }
            elseif ($period === 'month' && $parts[1] === 'year') { $amount *= 12; $note = 'Annual equivalent of the recorded monthly rent'; }
            else { return [null, null]; } // No guessed month/day conversion.
        }
        if ($unit !== $parts[2]) {
            $area = self::offeredAreaSqm($property);
            if ($area === null) { return [null, null]; }
            $amount = $unit === 'sqm' ? $amount * $area : $amount / $area;
            $note = trim(($note ? $note . '; ' : '') . ($unit === 'sqm' ? 'Total rent derived using the recorded offered area' : 'Per-m² rent derived using the recorded offered area'));
        }
        return [$amount, $note];
    }

    /** A diagnostic failure map also distinguishes missing data from known non-matches. */
    public static function failures(array $property, array $criteria): array
    {
        $criteria = self::normalizeCriteria($criteria);
        $failed = [];
        foreach (['category', 'barangay'] as $key) {
            if ($criteria[$key] !== null && mb_strtolower(trim((string) ($property[$key] ?? ''))) !== mb_strtolower($criteria[$key])) {
                $failed[$key] = empty($property[$key]) ? 'unknown' : 'mismatch';
            }
        }
        if ($criteria['subcategory'] !== null) {
            $types = array_map('mb_strtolower', array_map('trim', explode(',', (string) ($property['subcategory'] ?? ''))));
            if (!in_array(mb_strtolower($criteria['subcategory']), $types, true)) { $failed['subcategory'] = empty($property['subcategory']) ? 'unknown' : 'mismatch'; }
        }
        if ($criteria['purpose'] !== null && !in_array($property['listingPurpose'] ?? '', [$criteria['purpose'], 'sale_or_lease'], true)) {
            $failed['purpose'] = empty($property['listingPurpose']) ? 'unknown' : 'mismatch';
        }
        $area = self::areaSqm($property);
        if ($criteria['minArea'] !== null || $criteria['maxArea'] !== null) {
            if ($area === null) { $failed['area'] = 'unknown'; }
            elseif (($criteria['minArea'] !== null && $area + .000001 < $criteria['minArea']) || ($criteria['maxArea'] !== null && $area - .000001 > $criteria['maxArea'])) { $failed['area'] = 'mismatch'; }
        }
        if ($criteria['budget'] !== null && $criteria['budgetBasis'] !== null) {
            [$amount] = self::comparablePrice($property, $criteria['budgetBasis']);
            if ($amount === null) { $failed['budget'] = 'unknown'; }
            elseif ($amount > $criteria['budget'] + .000001) { $failed['budget'] = 'mismatch'; }
        }
        return $failed;
    }

    public static function matches(array $property, array $criteria): bool
    {
        return self::failures($property, $criteria) === [];
    }

    public static function card(array $property, array $criteria): array
    {
        $criteria = self::normalizeCriteria($criteria);
        $area = self::areaSqm($property);
        $prices = ListingPresentation::prices($property);
        $purpose = $criteria['purpose'] ?? ($property['listingPurpose'] ?? null);
        $priceKey = $purpose === 'lease' ? 'Lease price' : 'Sale price';
        $priceLabel = $purpose === 'sale_or_lease'
            ? 'Sale: ' . ($prices['Sale price'] ?? 'Price on request') . ' · Lease: ' . ($prices['Lease price'] ?? 'Price on request')
            : ($prices[$priceKey] ?? implode(' · ', $prices));
        $priceBasis = $purpose === 'lease'
            ? 'Recorded ' . (($property['leasePriceUnit'] ?? '') === 'sqm' ? 'rent per m²' : 'total rent') . ' / ' . ($property['leasePeriod'] ?? 'period unknown')
            : 'Total sale asking price';
        if ($purpose === 'sale_or_lease') {
            $priceBasis = 'Sale: total asking price · Lease: ' . (($property['leasePriceUnit'] ?? '') === 'sqm' ? 'per m²' : 'total') . ' / ' . ($property['leasePeriod'] ?? 'period unknown');
        }
        if ($criteria['budgetBasis'] !== null && $criteria['budget'] !== null) {
            [$amount, $normalization] = self::comparablePrice($property, $criteria['budgetBasis']);
            $priceBasis .= $normalization ? ' · ' . $normalization : '';
        }
        $reasons = [];
        if ($criteria['subcategory'] !== null) { $reasons[] = 'Recorded subtype includes ' . $criteria['subcategory'] . '.'; }
        elseif ($criteria['category'] !== null) { $reasons[] = 'Listed as ' . $criteria['category'] . '.'; }
        if ($criteria['barangay'] !== null) { $reasons[] = 'Recorded location is ' . $criteria['barangay'] . '.'; }
        if ($criteria['purpose'] !== null) { $reasons[] = 'Offered for ' . $criteria['purpose'] . '.'; }
        if ($criteria['budget'] !== null && $criteria['budgetBasis'] !== null) {
            [$amount, $normalization] = self::comparablePrice($property, $criteria['budgetBasis']);
            if ($amount !== null) { $reasons[] = ListingPresentation::money($amount) . ' on your ' . self::basisLabel($criteria['budgetBasis']) . ' basis is within your limit.' . ($normalization ? ' ' . $normalization . '.' : ''); }
        }
        if (($criteria['minArea'] !== null || $criteria['maxArea'] !== null) && $area !== null) { $reasons[] = number_format($area, 2) . ' m² recorded lot area meets your range.'; }
        if (!$reasons) { $reasons[] = 'Published listing; no additional preference filters yet.'; }
        $unknowns = [];
        if ($area === null) { $unknowns[] = 'Lot area is not recorded.'; }
        if ($priceLabel === '' || str_contains($priceLabel, 'Price on request')) { $unknowns[] = 'Asking price is not recorded; request it from the listing contact.'; }
        if (empty($property['barangay'])) { $unknowns[] = 'Barangay is not recorded.'; }
        if (empty($property['lastConfirmedAvailableAt'])) { $unknowns[] = 'Availability has no recorded confirmation date; confirm with the listing contact.'; }
        $clup = $property['clupProfile'] ?? [];
        if (empty($clup['verifiedAt'])) { $unknowns[] = 'Zoning has not been city validated in the stored profile.'; }
        if ($criteria['activity'] !== null) { $unknowns[] = 'Matching preferences does not verify permission or suitability for ' . $criteria['activity'] . '.'; }
        $image = (string) ($property['imageUrl'] ?? '');
        if ($image === '') {
            foreach (($property['media'] ?? []) as $media) {
                if (in_array($media['kind'] ?? '', ['image', 'photo'], true) && !empty($media['source'])) { $image = (string) $media['source']; break; }
            }
        }
        $v2 = $property['v2Assessment'] ?? null;
        $v2Status = $property['v2EligibilityStatus'] ?? ($v2['eligibility']['status'] ?? null);
        $v2Labels = [
            'meets_screened_requirements' => 'Meets screened requirements',
            'conditional' => 'Conditional',
            'does_not_meet_requirements' => 'Does not meet requirements',
            'insufficient_information' => 'Insufficient information',
        ];

        $assessment = self::assessment($property);
        $details = self::details($property, $priceLabel, $area, $assessment);
        return ['id' => (int) $property['id'], 'name' => (string) ($property['name'] ?? 'Property'), 'image' => $image,
            'href' => 'property-details.php?id=' . (int) $property['id'],
            'lat' => is_numeric($property['lat'] ?? null) ? (float) $property['lat'] : null,
            'lng' => is_numeric($property['lng'] ?? null) ? (float) $property['lng'] : null,
            'details' => $details,
            'verification' => ['status' => $property['listingVerificationStatus'] ?? null, 'sellerIdentityStatus' => $property['sellerIdentityStatus'] ?? null,
                'authorityToSellVerified' => $property['authorityToSellVerified'] ?? null, 'documentsReviewedAt' => $property['documentsReviewedAt'] ?? null,
                'siteVerifiedAt' => $property['siteVerifiedAt'] ?? null, 'lastConfirmedAvailableAt' => $property['lastConfirmedAvailableAt'] ?? null],
            'priceLabel' => $priceLabel ?: 'Price on request', 'priceBasis' => $priceBasis,
            'location' => implode(', ', array_filter([(string) ($property['barangay'] ?? ''), (string) ($property['city'] ?? '')])) ?: 'Location not recorded',
            'areaSqm' => $area, 'purpose' => (string) ($property['listingPurpose'] ?? ''), 'category' => $property['category'] ?? null,
            'subcategory' => $property['subcategory'] ?? null, 'reasons' => $reasons, 'unknowns' => $unknowns,
            'assessment' => $assessment, 'saved' => false,
            'v2Eligibility' => $v2Status,
            'v2EligibilityLabel' => $v2Labels[$v2Status ?? ''] ?? 'Unscreened',
            'v2IaiScore' => $property['v2IaiScore'] ?? ($v2['iai_score'] ?? null),
            'evidenceCoveragePct' => $v2['evidence_coverage_pct'] ?? null,
            'v2Strengths' => $v2['strengths'] ?? [],
            'v2Tradeoffs' => $v2['tradeoffs'] ?? [],
            'v2UnresolvedChecks' => $v2['unresolved_checks'] ?? [],
            'v2NextActions' => $v2['next_actions'] ?? [],
            'v2ScoreBreakdown' => $v2['score_breakdown'] ?? [],
        ];
    }

    /** Read only existing investor-visible presentation; never derive zoning or hazard findings. */
    private static function details(array $property, string $price, ?float $area, array $assessment): array
    {
        $amenities = [];
        foreach (($property['facilities'] ?? []) as $facility) {
            $label = is_array($facility) ? ($facility['name'] ?? $facility['label'] ?? null) : $facility;
            $text = self::safeText($label, 180);
            if ($text !== '') $amenities[] = $text;
        }
        $features = [];
        foreach (['parking', 'water', 'electricity', 'internet', 'pool', 'elevator', 'bedrooms', 'bathrooms'] as $feature) {
            $recorded = array_values(array_filter($amenities, static fn (string $label): bool => (bool) preg_match('/\b' . preg_quote($feature, '/') . '\b/iu', $label)));
            $utility = $property['utilities'][$feature] ?? null;
            if (is_array($utility)) {
                $parts = [];
                foreach (['status', 'connection_status', 'provider', 'source', 'primary_supply', 'backup_supply', 'capacity', 'capacity_reliability', 'technology', 'quality', 'download_speed_mbps'] as $key) {
                    $value = self::safeText($utility[$key] ?? null, 160);
                    if ($value !== '') $parts[] = str_replace('_', ' ', $key) . ': ' . $value;
                }
                foreach (['sources', 'providers', 'connection_types'] as $key) {
                    $values = array_filter(array_map(static fn (mixed $value): string => self::safeText($value, 160), (array) ($utility[$key] ?? [])), static fn (string $value): bool => $value !== '');
                    if ($values) $parts[] = str_replace('_', ' ', $key) . ': ' . implode(', ', $values);
                }
                if (in_array($utility['status'] ?? 'unknown', ['unknown', 'not_verified', 'not_assessed', ''], true)) $parts[] = self::MISSING;
                if ($parts) $recorded[] = implode('; ', $parts);
            }
            $features[$feature] = $recorded ? implode(', ', $recorded) : self::MISSING;
        }
        $clup = is_array($property['clupProfile'] ?? null) ? $property['clupProfile'] : [];
        $zone = self::safeText($clup['zoningClassification'] ?? null, 180);
        $zoning = ($zone === '' ? self::MISSING : $zone) . '; verification: ' . self::safeText($clup['statusLabel'] ?? 'No verification status recorded', 180)
            . (!empty($clup['existingLandUse']) ? '; existing land use: ' . self::safeText($clup['existingLandUse'], 180) : '')
            . (!empty($clup['sourceReference']) ? '; source: ' . self::safeText($clup['sourceReference'], 300) : '')
            . (!empty($clup['verifiedAt']) ? '; verified at: ' . self::safeText($clup['verifiedAt'], 80) : '') . '. This recorded classification does not establish permission for a proposed business.';
        if ($clup === []) $zoning = self::MISSING;
        $hazards = [];
        foreach (($property['hazardScreening'] ?? []) as $kind => $finding) {
            if (!is_array($finding) || !isset($finding['status'])) continue;
            $status = self::safeText($finding['status'], 100);
            $hazards[] = ucfirst((string) $kind) . ': ' . $status . '; ' . (in_array($status, ['', 'unknown', 'not_assessed'], true) ? self::MISSING : self::safeText($finding['details'] ?? self::MISSING, 600))
                . (!empty($finding['evidence_status']) ? '; evidence status: ' . self::safeText($finding['evidence_status'], 100) : '')
                . (!empty($finding['source']) ? '; source: ' . self::safeText($finding['source'], 180) : '')
                . (!empty($finding['reference']) ? '; reference: ' . self::safeText($finding['reference'], 180) : '');
        }
        $screening = is_array($property['hazardScreening'] ?? null) ? $property['hazardScreening'] : [];
        if (!empty($screening['status_label'])) $hazards[] = 'Screening status: ' . self::safeText($screening['status_label'], 300);
        if (array_key_exists('validated', $screening)) $hazards[] = 'Validated: ' . ($screening['validated'] === true ? 'yes' : 'no');
        if (!empty($screening['technical_review_hold'])) $hazards[] = 'Technical review hold: yes';
        $verification = self::safeText($property['listingVerificationStatus'] ?? null, 180);
        $assessmentText = 'Status: ' . $assessment['status'] . '. ';
        if ($assessment['score'] !== null) $assessmentText .= 'IAI: ' . $assessment['score'] . ' / 100. ';
        else $assessmentText .= self::MISSING . ' ';
        if ($assessment['mceScore'] !== null) $assessmentText .= 'MCE: ' . $assessment['mceScore'] . ' / 100. ';
        $assessmentText .= $assessment['note'];
        $prices = ListingPresentation::prices($property);
        return array_merge($features, ['price' => $price === '' ? self::MISSING : str_replace('Price on request', self::MISSING, $price),
            'salePrice' => str_replace('Price on request', self::MISSING, $prices['Sale price'] ?? self::MISSING),
            'leasePrice' => str_replace('Price on request', self::MISSING, $prices['Lease price'] ?? self::MISSING),
            'location' => implode(', ', array_filter([self::safeText($property['barangay'] ?? null, 120), self::safeText($property['city'] ?? null, 150)])) ?: self::MISSING,
            'type' => implode(' / ', array_filter([self::safeText($property['category'] ?? null, 100), self::safeText($property['subcategory'] ?? null, 180)])) ?: self::MISSING,
            'purpose' => in_array($property['listingPurpose'] ?? null, ['sale', 'lease', 'sale_or_lease'], true) ? ListingPresentation::purpose($property) : self::MISSING,
            'area' => $area === null ? self::MISSING : number_format($area, 2) . ' m² recorded land area',
            'amenities' => $amenities ? implode(', ', $amenities) : self::MISSING,
            'availability' => !empty($property['lastConfirmedAvailableAt']) ? 'Listing status: ' . self::safeText($property['status'] ?? '', 80) . '; last confirmed available at: ' . self::safeText($property['lastConfirmedAvailableAt'], 80) . '. Confirm current availability with the listing contact.' : self::MISSING,
            'zoning' => $zoning, 'hazards' => $hazards ? implode('. ', $hazards) : self::MISSING,
            'assessment' => $assessmentText, 'verification' => $verification !== '' ? $verification : self::MISSING]);
    }

    private static function assessment(array $property): array
    {
        $status = (string) ($property['assessmentStatus'] ?? 'not_assessed');
        // A numeric legacy/default/partial zero is not a completed scientific index.
        $complete = ($property['assessmentComplete'] ?? false) === true && ($property['rank_eligible'] ?? false) === true;
        $value = $property['iaiScore'] ?? null;
        $score = $complete && is_numeric($value) && is_finite((float) $value) && (float) $value >= 0 && (float) $value <= 100 ? (float) $value : null;
        $mceValue = $property['mceScore'] ?? null;
        $mceScore = $complete && is_numeric($mceValue) && is_finite((float) $mceValue) && (float) $mceValue >= 0 && (float) $mceValue <= 100 ? (float) $mceValue : null;
        $evidence = [];
        foreach (($property['criteria'] ?? []) as $criterion) {
            if (!is_array($criterion)) { continue; }
            $label = (string) ($criterion['display_name'] ?? $criterion['key'] ?? 'Assessment criterion');
            $criterionScore = $criterion['score'] ?? null;
            $verification = (string) ($criterion['verification_status'] ?? 'not_assessed');
            $details = 'Score: ' . (is_numeric($criterionScore) ? (string) $criterionScore . ' / 100' : 'not available') . '; evidence: ' . str_replace('_', ' ', $verification) . '.';
            $raw = $criterion['raw_value'] ?? null;
            if ($raw !== null && $raw !== []) { $details .= ' Recorded inputs: ' . self::measurementText($raw) . '.'; }
            $records = is_array($criterion['evidence'] ?? null) ? $criterion['evidence'] : [];
            $sources = [];
            $reference = self::safeText($criterion['source_reference'] ?? null, 500);
            if ($reference !== '') { $sources[] = $reference; }
            foreach ($records as $record) {
                if (!is_array($record)) { continue; }
                $source = trim(implode(' — ', array_filter([self::safeText($record['source'] ?? null, 180), self::safeText($record['reference'] ?? null, 180)])));
                if ($source !== '') { $sources[] = $source; }
            }
            $source = $sources ? implode('; ', array_unique($sources)) : 'No supporting source recorded';
            $evidence[] = ['label' => self::safeText($label, 150), 'value' => self::safeText($details, 800), 'source' => self::safeText($source, 500)];
            if (count($evidence) >= 6) { break; }
        }
        $note = self::safeText($property['reason'] ?? $property['note'] ?? null, 600);
        $missing = array_values(array_filter((array) ($property['missing_requirements'] ?? $property['missingRequirements'] ?? []), 'is_string'));
        if ($score === null && $note === '') { $note = 'A completed comparable assessment is not available.'; }
        if ($missing) { $note .= ' Missing requirements: ' . implode('; ', array_slice($missing, 0, 3)) . '.'; }
        $note .= ' These are the existing system assessment and its recorded evidence, not a new suitability assessment for your proposed business.';
        return ['score' => $score, 'mceScore' => $mceScore, 'label' => $score === null ? 'Assessment pending or under review' : 'Recorded IAI / 100', 'status' => $status,
            'evidence' => $evidence, 'note' => mb_substr(trim($note), 0, 1200)];
    }

    private static function measurementText(mixed $value): string
    {
        if (is_array($value)) {
            $parts = [];
            foreach ($value as $key => $item) {
                if (is_scalar($item) || $item === null) { $parts[] = str_replace('_', ' ', (string) $key) . ': ' . ($item === null || $item === '' ? 'unknown' : self::safeText(is_bool($item) ? ($item ? 'yes' : 'no') : (string) $item, 140)); }
                if (count($parts) >= 6) { break; }
            }
            return implode('; ', $parts) ?: 'See assessment details';
        }
        return self::safeText($value, 300);
    }

    private static function safeText(mixed $value, int $limit): string
    {
        return is_scalar($value) ? mb_substr(trim((string) $value), 0, $limit) : '';
    }

    public static function basisLabel(string $basis): string
    {
        if ($basis === 'sale_total') { return 'total purchase price'; }
        if ($basis === 'sale_sqm') { return 'sale price per m²'; }
        $parts = explode('_', $basis);
        return 'rent ' . (($parts[2] ?? '') === 'sqm' ? 'per m² ' : 'total ') . '/ ' . ($parts[1] ?? 'period');
    }

    /** $properties must already have passed the investor visibility policy. */
    public static function summarize(array $properties, array $criteria, int $limit = 6, ?array $candidateIds = null): array
    {
        $criteria = self::normalizeCriteria($criteria);
        $candidateSet = $candidateIds === null ? null : array_fill_keys(array_map('intval', $candidateIds), true);
        $matches = [];
        $counts = [];
        foreach ($properties as $property) {
            $failures = self::failures($property, $criteria);
            foreach ($failures as $criterion => $failure) {
                $counts[$criterion] ??= ['excluded' => 0, 'unknown' => 0];
                $counts[$criterion]['excluded']++;
                if ($failure === 'unknown') { $counts[$criterion]['unknown']++; }
            }
            if ($failures === [] && ($candidateSet === null || isset($candidateSet[(int) $property['id']]))) { $matches[] = $property; }
        }
        $limitations = [];
        $labels = ['category' => 'Property type', 'subcategory' => 'Property subtype', 'purpose' => 'Sale or lease', 'barangay' => 'Barangay', 'area' => 'Lot area', 'budget' => 'Comparable price'];
        foreach ($counts as $criterion => $count) {
            $limitations[] = ($labels[$criterion] ?? $criterion) . ' excludes ' . $count['excluded'] . ' published ' . ($count['excluded'] === 1 ? 'listing' : 'listings')
                . ($count['unknown'] ? ', including ' . $count['unknown'] . ' with missing or incompatible data' : '') . '.';
        }
        if ($criteria['budget'] !== null && $criteria['budgetBasis'] === null) { $limitations[] = 'The budget is not applied until you choose its purchase/rent and total/per-m² basis.'; }
        $suggestions = [];
        if (!$matches && $properties) {
            $relaxations = [
                ['label' => 'Search all barangays', 'patch' => ['barangay' => null]],
                ['label' => 'Remove the budget limit', 'patch' => ['budget' => null]],
                ['label' => 'Remove the lot-size range', 'patch' => ['minArea' => null, 'maxArea' => null]],
                ['label' => 'Include all subtypes', 'patch' => ['subcategory' => null]],
                ['label' => 'Include all property types', 'patch' => ['category' => null, 'subcategory' => null]],
                ['label' => 'Include sale and lease', 'patch' => ['purpose' => null, 'budget' => null, 'budgetBasis' => null]],
            ];
            foreach ($relaxations as $relaxation) {
                $broader = self::normalizeCriteria(array_replace($criteria, $relaxation['patch']));
                if ($broader === $criteria) { continue; }
                $count = count(array_filter($properties, static fn (array $property): bool => self::matches($property, $broader)));
                if ($count > 0) { $suggestions[] = ['label' => $relaxation['label'] . ' (' . $count . ')', 'patch' => $relaxation['patch'], 'count' => $count]; }
                if (count($suggestions) >= 3) { break; }
            }
            $suggestions[] = ['label' => 'Start over with all ' . count($properties) . ' published listings', 'patch' => self::EMPTY_CRITERIA, 'count' => count($properties)];
        }
        return ['results' => array_map(static fn (array $property): array => self::card($property, $criteria), array_slice($matches, 0, max(1, min(12, $limit)))),
            'total' => count($matches), 'suggestions' => $suggestions, 'limitations' => $limitations, 'constraintCounts' => $counts,
            'publishedTotal' => count($properties)];
    }
}
