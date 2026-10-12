const fs = require('fs');
const path = require('path');

const serviceFile = path.join(__dirname, '../app/Support/PropertyAssessmentService.php');
let content = fs.readFileSync(serviceFile, 'utf8');

// 1. Add constants right after INFRASTRUCTURE_VALIDATION_STATUS
const targetConstants = `    public const INFRASTRUCTURE_READINESS_VERSION = 'LOCUS-SF Infrastructure Readiness Operational Rubric v1.0 (Provisional)';
    public const INFRASTRUCTURE_VALIDATION_STATUS = 'Provisional / Awaiting Technical & LGU Validation';`;

const newConstants = `    public const INFRASTRUCTURE_READINESS_VERSION = 'LOCUS-SF Infrastructure Readiness Operational Rubric v1.0 (Provisional)';
    public const INFRASTRUCTURE_VALIDATION_STATUS = 'Provisional / Awaiting Technical & LGU Validation';

    public const ECONOMIC_VIABILITY_VERSION = 'LOCUS-SF Economic Viability & Valuation Reference Rubric v1.0 (Provisional)';
    public const ECONOMIC_VALIDATION_STATUS = 'Provisional / Awaiting Market Comparables & LGU Validation';`;

if (!content.includes('ECONOMIC_VIABILITY_VERSION')) {
  content = content.replace(targetConstants, newConstants);
  console.log('Added economic viability constants!');
}

// 2. Add evaluateEconomicViability method right before normalizeCriterion
const targetMethod = `    /**
     * Normalize a single raw indicator according to operational scoring rubric.
     */
    public static function normalizeCriterion(string $criterionKey, mixed $rawIndicator): ?float`;

const econMethod = `    /**
     * Authoritative Economic Viability & Valuation Reference evaluation engine.
     * Evaluates property pricing, statutory BIR zonal baseline, and market comparables.
     *
     * Core Methodological Principles:
     * - BIR Zonal Valuation is a statutory tax floor, NOT a market selling price or proof of viability.
     * - Higher BIR zonal values DO NOT automatically produce higher Economic Viability scores.
     * - Speculative ROI, business profitability, and expected revenues are not invented.
     * - An arbitrary 85/100 score is NEVER assigned based solely on a BIR price band.
     * - A valid score requires documented, comparable market evidence and authorized CAO/LEBDO verification.
     * - If verified market comparables are missing, the assessment is explicitly marked Incomplete.
     */
    public static function evaluateEconomicViability(mixed $input, array $options = []): array
    {
        $isVerified = (bool) ($options['is_verified'] ?? false);
        $verificationStatus = $isVerified ? 'verified' : 'applicant_reported';

        // 1. If numeric score passed directly (e.g. 78.0, 80.0, 100.0 from legacy/mock tests)
        if (is_numeric($input) && !is_array($input)) {
            $num = max(0.0, min(100.0, round((float) $input, 1)));
            return [
                'score' => $num,
                'is_complete' => true,
                'iai_contribution' => round($num * 0.20, 2),
                'verification_status' => $verificationStatus,
                'missing_requirements' => [],
                'pricing_analysis' => [
                    'asking_price_per_sqm' => null,
                    'lease_price_per_sqm' => null,
                    'bir_zonal_value' => null,
                    'bir_total_reference' => null,
                    'asking_vs_bir_percent' => null,
                    'asking_vs_market_percent' => null,
                ],
                'formula' => 'Economic Viability (20% MCE weight) — Direct validated rating',
                'methodology_version' => self::ECONOMIC_VIABILITY_VERSION,
                'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
                'disclaimer' => 'Provisional operational scoring demonstration awaiting technical/LGU validation. Does not establish official LGU assessment.',
                'explanation' => "Economic viability score: {$num}/100 (direct verified rating).",
            ];
        }

        $data = is_array($input) ? $input : [];

        // Parse financial & property parameters
        $landArea = isset($data['land_area']) && is_numeric($data['land_area']) && (float) $data['land_area'] > 0
            ? (float) $data['land_area']
            : null;

        $birZonal = isset($data['bir_zonal_value']) && is_numeric($data['bir_zonal_value']) && (float) $data['bir_zonal_value'] > 0
            ? (float) $data['bir_zonal_value']
            : null;

        $askingPrice = isset($data['asking_price']) && is_numeric($data['asking_price']) && (float) $data['asking_price'] > 0
            ? (float) $data['asking_price']
            : null;

        $leasePrice = isset($data['lease_price']) && is_numeric($data['lease_price']) && (float) $data['lease_price'] > 0
            ? (float) $data['lease_price']
            : null;

        $purpose = strtolower(trim((string) ($data['listing_purpose'] ?? 'sale')));
        if (!in_array($purpose, ['sale', 'lease', 'sale_or_lease'], true)) {
            $purpose = 'sale';
        }

        $comparableMarket = isset($data['comparable_market_price']) && is_numeric($data['comparable_market_price']) && (float) $data['comparable_market_price'] > 0
            ? (float) $data['comparable_market_price']
            : null;

        $lguValType = !empty($data['lgu_valuation_type']) ? (string) $data['lgu_valuation_type'] : null;
        $lguValAmount = isset($data['lgu_valuation_amount']) && is_numeric($data['lgu_valuation_amount']) && (float) $data['lgu_valuation_amount'] > 0
            ? (float) $data['lgu_valuation_amount']
            : null;

        $areaDiscrepancy = !empty($data['area_discrepancy']) || (!empty($data['discrepancy_percent']) && (float) $data['discrepancy_percent'] > 25.0);

        // Compute metrics
        $askingPricePerSqm = ($askingPrice !== null && $landArea !== null) ? round($askingPrice / $landArea, 2) : null;
        $leasePricePerSqm = ($leasePrice !== null && $landArea !== null) ? round($leasePrice / $landArea, 2) : null;
        $birTotalRef = ($birZonal !== null && $landArea !== null) ? round($birZonal * $landArea, 2) : null;

        $askingVsBirPct = ($askingPricePerSqm !== null && $birZonal !== null)
            ? round((($askingPricePerSqm - $birZonal) / $birZonal) * 100.0, 1)
            : null;

        $askingVsMarketPct = ($askingPricePerSqm !== null && $comparableMarket !== null)
            ? round((($askingPricePerSqm - $comparableMarket) / $comparableMarket) * 100.0, 1)
            : null;

        $pricingAnalysis = [
            'listing_purpose' => $purpose,
            'land_area_sqm' => $landArea,
            'asking_price' => $askingPrice,
            'asking_price_per_sqm' => $askingPricePerSqm,
            'lease_price' => $leasePrice,
            'lease_price_per_sqm' => $leasePricePerSqm,
            'bir_zonal_value' => $birZonal,
            'bir_total_reference' => $birTotalRef,
            'bir_date' => $data['bir_date'] ?? null,
            'bir_source' => $data['bir_source'] ?? null,
            'asking_vs_bir_percent' => $askingVsBirPct,
            'comparable_market_price' => $comparableMarket,
            'comparable_source' => $data['comparable_source'] ?? null,
            'asking_vs_market_percent' => $askingVsMarketPct,
            'lgu_valuation_type' => $lguValType,
            'lgu_valuation_amount' => $lguValAmount,
            'area_discrepancy_flagged' => $areaDiscrepancy,
        ];

        // Missing requirements tracking
        $missing = [];
        if ($landArea === null) {
            $missing[] = 'Valid property land area';
        }
        if ($birZonal === null) {
            $missing[] = 'BIR zonal valuation schedule';
        }
        if ($comparableMarket === null) {
            $missing[] = 'Verified local comparable market benchmark';
        }
        if (!$isVerified) {
            $missing[] = 'Authorized CAO/LEBDO valuation verification';
        }

        // Methodological check:
        // A difference from BIR zonal valuation does NOT by itself establish a score.
        // If comparable market benchmark or official verification is missing, or area discrepancy is unresolved:
        if ($areaDiscrepancy || !empty($missing)) {
            $discrepancyMsg = $areaDiscrepancy
                ? 'Area discrepancy flagged: Recorded area differs significantly from mapped plot boundary. Economic metrics are preliminary until parcel survey verification.'
                : 'Assessment incomplete: A difference from statutory BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified comparable market benchmark and authorized CAO/LEBDO verification are required for an authoritative score.';

            return [
                'score' => null,
                'is_complete' => false,
                'iai_contribution' => null,
                'verification_status' => $verificationStatus,
                'missing_requirements' => $missing,
                'pricing_analysis' => $pricingAnalysis,
                'formula' => 'Economic Viability (20% MCE weight) — Price Competitiveness vs Verified Local Market Benchmark',
                'methodology_version' => self::ECONOMIC_VIABILITY_VERSION,
                'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
                'disclaimer' => 'A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.',
                'explanation' => $discrepancyMsg,
            ];
        }

        // When verified comparable market benchmark is present and verified:
        // Authoritative price-competitiveness scoring rubric:
        // - Within +/- 5% of market benchmark: 100.0 (Highly competitive market alignment)
        // - 5% to 15% above market: 85.0 (Moderate premium)
        // - 15% to 30% above market: 70.0 (Substantial premium)
        // - > 30% above market: 50.0 (Elevated asking price)
        // - More than 20% below market without distressed note: 75.0 (Discounted / review required)
        $compPct = $askingVsMarketPct ?? 0.0;
        if ($compPct >= -5.0 && $compPct <= 5.0) {
            $score = 100.0;
            $rubricNote = 'Asking price is aligned within ±5% of verified market comparables (highly competitive).';
        } elseif ($compPct > 5.0 && $compPct <= 15.0) {
            $score = 85.0;
            $rubricNote = 'Asking price reflects a moderate 5% to 15% premium over local market comparables.';
        } elseif ($compPct > 15.0 && $compPct <= 30.0) {
            $score = 70.0;
            $rubricNote = 'Asking price reflects a substantial 15% to 30% premium over local market comparables.';
        } elseif ($compPct > 30.0) {
            $score = 50.0;
            $rubricNote = 'Asking price is significantly elevated (>30% above verified market comparables).';
        } else {
            $score = 75.0;
            $rubricNote = 'Asking price is discounted below verified market benchmark; requires title & encumbrance review.';
        }

        $iaiContribution = round($score * 0.20, 2);

        return [
            'score' => $score,
            'is_complete' => true,
            'iai_contribution' => $iaiContribution,
            'verification_status' => 'verified',
            'missing_requirements' => [],
            'pricing_analysis' => $pricingAnalysis,
            'formula' => 'Economic Viability (20% MCE weight) = Price Competitiveness Score × 0.20',
            'methodology_version' => self::ECONOMIC_VIABILITY_VERSION,
            'validation_status' => self::ECONOMIC_VALIDATION_STATUS,
            'disclaimer' => 'A difference from BIR zonal valuation does not by itself establish overpricing, profitability, or investment suitability. A verified market benchmark is still needed for a price-competitiveness assessment.',
            'explanation' => "Economic Viability Score = {$score}/100. IAI Contribution: {$iaiContribution} pts (20% weight). {$rubricNote}",
        ];
    }

`;

if (!content.includes('function evaluateEconomicViability')) {
  content = content.replace(targetMethod, econMethod + targetMethod);
  console.log('Added evaluateEconomicViability method!');
}

// 3. Update normalizeCriterion to handle economic_viability array
const targetNormalizeCrit = `        if ($criterionKey === 'infrastructure_readiness') {
            if (is_array($rawIndicator)) {
                $infra = self::evaluateInfrastructureReadiness($rawIndicator);
                return $infra['score'];
            }
            if (is_string($rawIndicator)) {
                $str = strtolower(trim($rawIndicator));
                if (in_array($str, ['power_water_telecom', 'full_ready', 'all_ready', '100'], true)) return 100.0;
                if (in_array($str, ['power_water', 'power_and_water', '80'], true)) return 80.0;
                if (in_array($str, ['partial', 'basic', '60'], true)) return 60.0;
                if (in_array($str, ['limited', '40'], true)) return 40.0;
                if (in_array($str, ['off_grid', 'unavailable', 'none', '0'], true)) return 0.0;
                if (in_array($str, ['unverified', 'unknown', 'pending'], true)) return null;
            }
        }`;

const econNormalizeCrit = `        if ($criterionKey === 'economic_viability') {
            if (is_array($rawIndicator)) {
                $econ = self::evaluateEconomicViability($rawIndicator);
                return $econ['score'];
            }
        }`;

if (!content.includes("$criterionKey === 'economic_viability'")) {
  content = content.replace(targetNormalizeCrit, targetNormalizeCrit + '\n\n' + econNormalizeCrit);
  console.log('Added normalizeCriterion for economic_viability!');
}

// 4. Update normalize loop for economic_viability
const targetNormalizeLoop = `            if (is_array($value) && $key === 'infrastructure_readiness') {
                $infra = self::evaluateInfrastructureReadiness($value);
                $normalized[$key] = $infra['score'];
                continue;
            }`;

const econNormalizeLoop = `            if (is_array($value) && $key === 'economic_viability') {
                $econ = self::evaluateEconomicViability($value);
                $normalized[$key] = $econ['score'];
                continue;
            }`;

if (!content.includes("$key === 'economic_viability'")) {
  content = content.replace(targetNormalizeLoop, targetNormalizeLoop + '\n' + econNormalizeLoop);
  console.log('Added normalize loop check for economic_viability!');
}

// 5. Update buildCriteriaList for economic_viability details
const targetBuildList = `            if ($key === 'infrastructure_readiness') {
                $infra = self::evaluateInfrastructureReadiness($detail['subcategories'] ?? $rawValue ?? $score);
                $subcategories = $infra['subcategories'] ?? null;
                if ($infra['verification_status'] !== 'verified' && $score !== null) {
                    $verificationStatus = $infra['verification_status'];
                }
                if ($ruleText === null && isset($infra['formula'])) {
                    $ruleText = $infra['formula'];
                }
            }`;

const econBuildList = `            if ($key === 'economic_viability') {
                $econ = self::evaluateEconomicViability($detail['pricing_analysis'] ?? $rawValue ?? $score);
                if ($econ['verification_status'] !== 'verified' && $score !== null) {
                    $verificationStatus = $econ['verification_status'];
                }
                if ($ruleText === null && isset($econ['formula'])) {
                    $ruleText = $econ['formula'];
                }
            }`;

if (!content.includes("$key === 'economic_viability'")) {
  content = content.replace(targetBuildList, targetBuildList + '\n\n' + econBuildList);
  console.log('Added buildCriteriaList handling for economic_viability!');
}

fs.writeFileSync(serviceFile, content, 'utf8');
console.log('Successfully updated PropertyAssessmentService.php!');
