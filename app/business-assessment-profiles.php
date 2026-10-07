<?php
declare(strict_types=1);

// Trusted server configuration. No business-specific scoring method is approved here.
// See docs/property-business-preview.md before adding documented, approved profiles.
return [
    'approved' => false,
    'approval_reference' => null,
    'version' => null,
    'method_reference' => null,
    'source_reference' => null,
    'score_scale_reference' => null,
    'weights' => [
        'spatial_accessibility' => 20,
        'infrastructure_readiness' => 20,
        'economic_viability' => 20,
        'nearby_businesses' => 10,
        'zoning_compatibility' => 15,
        'risk_constraints' => 10,
        'environmental_safety' => 5,
    ],
    'profiles' => [],
];
