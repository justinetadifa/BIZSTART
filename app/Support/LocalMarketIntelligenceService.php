<?php
declare(strict_types=1);

namespace App\Support;

final class LocalMarketIntelligenceService
{
    private const DATA_FILE = __DIR__ . '/../../data/demographics-psa.json';

    /**
     * Retrieves market and demographic intelligence for a property
     *
     * @param array $property
     * @return array
     */
    public static function get(array $property): array
    {
        $filePath = realpath(self::DATA_FILE);
        if ($filePath === false || !is_file($filePath)) {
            return [
                'available' => false,
                'status' => 'Data Unavailable',
                'reason' => 'Official PSA demographic records could not be loaded.',
            ];
        }

        $raw = file_get_contents($filePath);
        $data = json_decode($raw, true);
        if (!is_array($data) || empty($data['scopes'])) {
            return [
                'available' => false,
                'status' => 'Data Unavailable',
                'reason' => 'PSA demographic datasets are malformed.',
            ];
        }

        $barangayName = trim((string) ($property['barangay'] ?? 'Barangay II'));
        if ($barangayName === '') {
            $barangayName = 'Barangay II';
        }

        // Adjust barangay scope label for this specific property
        $scopes = $data['scopes'];
        if (isset($scopes['barangay'])) {
            $scopes['barangay']['default_scope_name'] = $barangayName;
            $scopes['barangay']['coverage'] = $barangayName . ' (Local Commercial Catchment)';
        }

        return [
            'available' => true,
            'source' => $data['source'] ?? 'Philippine Statistics Authority (PSA)',
            'surveys' => $data['surveys'] ?? [],
            'selected_scope' => 'barangay',
            'available_scopes' => array_keys($scopes),
            'scopes' => $scopes,
            'connection_note' => 'Supporting market intelligence for Economic Viability (20% MCE weight). Informs commercial catchment size, purchasing power, and consumer spending without altering the physical site score.',
        ];
    }
}
