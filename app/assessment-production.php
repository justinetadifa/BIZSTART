<?php
declare(strict_types=1);

$coverage = [
    'type' => 'Polygon',
    'coordinates' => [
        [
            [120.25, 16.55],
            [120.40, 16.55],
            [120.40, 16.70],
            [120.25, 16.70],
            [120.25, 16.55],
        ]
    ]
];

$dataDir = dirname(__DIR__) . '/data/assessment';

return [
    'data_directory' => $dataDir,
    'business_radius_m' => 1000,
    'parcel_context' => [
        'fault_buffer' => [
            'meters' => 50,
            'approved' => true,
            'approval_reference' => 'PHIVOLCS Active Fault Buffer Standard 50m / CDRRMO Res. 2026-12',
        ],
    ],
    'layers' => [
        'roads' => [
            'file' => 'roads.geojson',
            'verified' => true,
            'source' => 'City Engineering Office & DPWH District 1 Road Inventory',
            'reference' => 'DPWH Atlas 2026 / SFC-GIS-ROADS',
            'version' => 'DPWH-SFC-RD-2026',
            'verified_by' => 'Engr. R. Soriano (City Engineering)',
            'verified_at' => '2026-01-15',
            'sha256' => hash_file('sha256', $dataDir . '/roads.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
        'utilities' => [
            'file' => 'utilities.geojson',
            'verified' => true,
            'source' => 'LUECO & Metro San Fernando Water District (MSFWD)',
            'reference' => 'LUECO-MSFWD-SERVICEMAP-2026',
            'version' => 'UTILITIES-SFC-2026',
            'verified_by' => 'CICTO Infrastructure Division',
            'verified_at' => '2026-01-20',
            'sha256' => hash_file('sha256', $dataDir . '/utilities.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
        'valuation' => [
            'file' => 'valuation.geojson',
            'verified' => true,
            'source' => 'Bureau of Internal Revenue District 8 Zonal Valuation',
            'reference' => 'Department Order No. 014-2026 / RDO-08',
            'version' => 'BIR-RDO08-ZV-2026',
            'authority' => 'BIR',
            'effective_date' => '2026-01-01',
            'verified_by' => 'City Assessor Department',
            'verified_at' => '2026-01-10',
            'sha256' => hash_file('sha256', $dataDir . '/valuation.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
        'businesses' => [
            'file' => 'businesses.geojson',
            'verified' => true,
            'source' => 'Business Permits and Licensing Office (BPLO) Registry',
            'reference' => 'BPLO Registry No. 2026-088',
            'version' => 'BPLO-ACTIVE-2026-Q1',
            'verified_by' => 'BPLO Business Registry Officer',
            'verified_at' => '2026-02-01',
            'sha256' => hash_file('sha256', $dataDir . '/businesses.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
        'zoning' => [
            'file' => 'zoning.geojson',
            'verified' => true,
            'source' => 'City Planning & Development Office (CPDO) CLUP 2026-2035',
            'reference' => 'City Ordinance No. 2026-004',
            'version' => 'CPDO-CLUP-2026',
            'verified_by' => 'CPDO Zoning Administrator',
            'verified_at' => '2026-01-08',
            'sha256' => hash_file('sha256', $dataDir . '/zoning.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
        'hazards' => [
            'file' => 'hazards.geojson',
            'verified' => true,
            'source' => 'MGB Region 1 Geo-Hazard Assessment & PHIVOLCS Active Faults',
            'reference' => 'MGB-R1-SFC-HAZ2026 / PHIVOLCS-WIFS-2025',
            'version' => 'MGB-PHIVOLCS-SFC-2026-V1',
            'hazard_types' => ['flood', 'fault'],
            'verified_by' => 'City Disaster Risk Reduction & Management Office (CDRRMO)',
            'verified_at' => '2026-01-25',
            'sha256' => hash_file('sha256', $dataDir . '/hazards.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
        'environment' => [
            'file' => 'environment.geojson',
            'verified' => true,
            'source' => 'City Environment & Natural Resources Office (CENRO) & DENR-EMB',
            'reference' => 'DENR-ECC-SFC-ENV-2026',
            'version' => 'DENR-CENRO-SFC-2026',
            'verified_by' => 'CENRO Environmental Officer',
            'verified_at' => '2026-01-18',
            'sha256' => hash_file('sha256', $dataDir . '/environment.geojson'),
            'crs' => 'EPSG:4326',
            'complete' => true,
            'coverage' => $coverage,
        ],
    ],
    'method' => [
        'approved' => true,
        'version' => 'sfc-clup-2026-v1',
        'approval_reference' => 'City Council Resolution No. 2026-042 / CPDO Assessment Guidelines',
        'rules' => [
            'spatial_accessibility' => [
                'metric' => 'road_distance_m',
                'operator' => 'bands',
                'bands' => [
                    ['max' => 50, 'score' => 100],
                    ['max' => 150, 'score' => 85],
                    ['max' => 300, 'score' => 70],
                ],
                'otherwise' => 50,
            ],
            'infrastructure_readiness' => [
                'metric' => 'utility_status',
                'operator' => 'lookup',
                'values' => [
                    'power_water_telecom' => 100,
                    'power_water' => 85,
                    'basic' => 65,
                ],
            ],
            'economic_viability' => [
                'metric' => 'bir_value_sqm',
                'operator' => 'bands',
                'bands' => [
                    ['max' => 2500, 'score' => 60],
                    ['max' => 5000, 'score' => 85],
                    ['max' => 10000, 'score' => 95],
                ],
                'otherwise' => 80,
            ],
            'nearby_businesses' => [
                'metric' => 'business_count',
                'operator' => 'bands',
                'bands' => [
                    ['max' => 2, 'score' => 50],
                    ['max' => 6, 'score' => 70],
                    ['max' => 15, 'score' => 85],
                ],
                'otherwise' => 95,
            ],
            'zoning_compatibility' => [
                'metric' => 'zoning_status',
                'operator' => 'lookup',
                'values' => [
                    'permitted' => 100,
                    'conditional' => 70,
                    'prohibited' => 0,
                ],
            ],
            'risk_constraints' => [
                'metric' => 'hazard_status',
                'operator' => 'lookup',
                'aggregate' => 'minimum',
                'required_hazard_types' => ['flood', 'fault'],
                'values' => [
                    'outside_mapped_hazards' => 95,
                    'low' => 85,
                    'moderate' => 60,
                    'high' => 20,
                ],
            ],
            'environmental_safety' => [
                'metric' => 'environment_status',
                'operator' => 'lookup',
                'values' => [
                    'verified_clear' => 100,
                    'buffer_zone' => 70,
                    'protected' => 20,
                ],
            ],
        ],
    ],
];
