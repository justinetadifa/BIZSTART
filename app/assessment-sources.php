<?php
declare(strict_types=1);

// Trusted server configuration only. See docs/automatic-assessment.md before importing layers.
// Existing map illustrations and business locator pins do not establish verified coverage.
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
];
