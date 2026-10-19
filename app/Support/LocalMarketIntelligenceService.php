<?php
declare(strict_types=1);

namespace App\Support;

final class LocalMarketIntelligenceService
{
    private const DATA_FILE = __DIR__ . '/../../data/demographics-psa.json';

    /** Historical, sourced context only; never an input to the assessment engine. */
    public static function get(array $property): array
    {
        $raw = is_readable(self::DATA_FILE) ? file_get_contents(self::DATA_FILE) : false;
        $data = $raw !== false ? json_decode($raw, true) : null;
        if (!is_array($data) || ($data['schema_version'] ?? null) !== 2
            || empty($data['scopes']) || empty($data['sources'])) {
            return [
                'available' => false,
                'status' => 'Data unavailable',
                'reason' => 'The sourced market context dataset could not be loaded.',
                'scopes' => [],
            ];
        }

        $barangay = trim((string) ($property['barangay'] ?? ''));
        // Normalize spelling and common suffixes; never borrow another barangay's figures.
        $lookup = preg_replace('/\s*\((?:pob\.?|poblacion)\)\s*$/i', '', $barangay);
        $lookup = preg_replace('/\s+/', ' ', trim((string) $lookup));
        $lookup = strtolower($lookup);
        $lookup = $data['barangay_aliases'][$lookup] ?? $lookup;
        $entry = null;
        foreach ($data['barangays'] ?? [] as $name => $record) {
            if (strtolower($name) === $lookup) {
                $entry = $record;
                $barangay = $name;
                break;
            }
        }

        $scopes = [
            'barangay' => [
                'default_scope_name' => $barangay !== '' ? $barangay : 'Barangay not recorded',
                'coverage' => 'Administrative barangay boundary, San Fernando City, La Union',
                'population' => $entry ?? [
                    'total' => null,
                    'reason' => $barangay === ''
                        ? 'Record the property barangay to show its resident population.'
                        : 'A verified population record for this barangay has not been added.',
                ],
                'financial_reference' => 'province',
            ],
        ] + $data['scopes'];

        foreach ($scopes as $scopeKey => &$scope) {
            $population = $scope['population'] ?? [];
            $total = $population['total'] ?? null;
            $validPopulation = is_int($total) && $total >= 0
                && isset($data['sources'][$population['source_id'] ?? '']);
            $scope['population'] = [
                'available' => $validPopulation,
                'total' => $validPopulation ? $total : null,
                'total_formatted' => $validPopulation ? number_format($total) : null,
                'statistic' => 'resident_population',
                'unit' => 'people',
                'reference_year' => 2020,
                'reference_date' => '2020-05-01',
                'geography' => $scope['default_scope_name'],
                'source' => $data['sources'][$population['source_id'] ?? ''] ?? null,
                'reason' => $population['reason'] ?? 'A verified population record is unavailable.',
            ];

            $referenceKey = $scope['financial_reference'] ?? null;
            $reference = $data['financial_references'][$referenceKey] ?? [];
            foreach (['income' => 'annual_average_income', 'spending' => 'annual_average_expenditure'] as $metric => $field) {
                $value = $reference[$field] ?? null;
                $valid = is_numeric($value) && (float) $value >= 0
                    && isset($data['sources'][$reference['source_id'] ?? '']);
                $scope[$metric] = [
                    'available' => $valid,
                    'value' => $valid ? (float) $value : null,
                    'value_formatted' => $valid ? '₱' . number_format((float) $value) : null,
                    'statistic' => 'mean',
                    'period' => 'annual',
                    'unit' => 'PHP per family per year',
                    'currency' => 'PHP',
                    'reference_year' => $reference['reference_year'] ?? null,
                    'preliminary' => $reference['preliminary'] ?? false,
                    'geography' => $reference['geography'] ?? null,
                    'geographic_level' => $referenceKey,
                    'is_proxy' => $valid && $scopeKey !== $referenceKey,
                    'source' => $data['sources'][$reference['source_id'] ?? ''] ?? null,
                    'reason' => 'A sourced family finance reference is unavailable.',
                ];
            }
            unset($scope['financial_reference']);
        }
        unset($scope);

        return [
            'available' => true,
            'status' => 'Historical reference data',
            'verified_on' => $data['verified_on'] ?? null,
            'selected_scope' => 'barangay',
            'available_scopes' => array_keys($scopes),
            'scopes' => $scopes,
            'methodology_source' => $data['sources']['fies_methodology'] ?? null,
            'connection_note' => 'Market context only. These figures do not enter the MCE or IAI calculation. Property Cost & Market Competitiveness (20% MCE weight) uses property pricing and valuation evidence.',
        ];
    }
}
