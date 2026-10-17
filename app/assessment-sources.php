<?php
declare(strict_types=1);

// Trusted server configuration only. See docs/automatic-assessment.md before importing layers.
// Existing map illustrations and business locator pins do not establish verified coverage.
// The v3 adapter supplies measurements to PropertyAssessmentService; legacy method rules do not score them.
// Authentication records and scoped observation reviews are documented in docs/assessment-protocol-v3.md.
return [
    'data_directory' => dirname(__DIR__) . '/data/assessment',
    'layers' => [],
    'method' => [
        'approved' => false,
        'version' => null,
        'approval_reference' => null,
        'rules' => [],
    ],
    'business_radius_m' => 1000,
    'parcel_context' => [
        // The relevant office must approve the parcel-wide active fault review buffer.
        'fault_buffer' => ['meters' => null, 'approved' => false, 'approval_reference' => null],
    ],
];
