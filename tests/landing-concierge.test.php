<?php
declare(strict_types=1);

$_SERVER['REQUEST_URI'] = '/index.php';
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['REQUEST_METHOD'] = 'GET';

ob_start();
require __DIR__ . '/../index.php';
$html = ob_get_clean();

$checks = [
    'Rizalyn D. Medrano, EnP in Concierge & Office' => str_contains($html, 'Rizalyn D. Medrano, EnP'),
    'Irish Dominique D. Halabaso in Concierge & Office' => str_contains($html, 'Irish Dominique D. Halabaso'),
    'Mobile 0917 572 1230 in Concierge & Action buttons' => str_contains($html, '0917 572 1230'),
    'Mobile 0916 386 1007 in Concierge & Action buttons' => str_contains($html, '0916 386 1007'),
    'Landline (072) 619 - 7170 in Hero, Concierge & Hotlines' => str_contains($html, '(072) 619 - 7170'),
    'Permanent Business One Stop Shop Building' => str_contains($html, 'Permanent Business One Stop Shop Building'),
    'Dedicated Investment Concierge Section exists' => str_contains($html, 'id="investment-concierge"'),
    'Concierge Section is positioned BELOW Featured Properties' => strpos($html, 'id="properties"') !== false && strpos($html, 'id="investment-concierge"') !== false && (strpos($html, 'id="properties"') < strpos($html, 'id="investment-concierge"')),
    'Concierge Section is positioned ABOVE About LOCUS' => strpos($html, 'id="investment-concierge"') !== false && strpos($html, 'id="about"') !== false && (strpos($html, 'id="investment-concierge"') < strpos($html, 'id="about"')),
    'Catalyst Incentive Recipients Section exists' => str_contains($html, 'id="incentive-recipients"'),
    'Catalyst Recipients positioned BELOW San Fernando at a Glance' => strpos($html, 'id="at-a-glance"') !== false && strpos($html, 'id="incentive-recipients"') !== false && (strpos($html, 'id="at-a-glance"') < strpos($html, 'id="incentive-recipients"')),
    'Catalyst Recipients positioned ABOVE Why San Fernando' => strpos($html, 'id="incentive-recipients"') !== false && strpos($html, 'id="why-invest"') !== false && (strpos($html, 'id="incentive-recipients"') < strpos($html, 'id="why-invest"')),
    'Incentive Recipients include TaskUs La Union' => str_contains($html, 'TASKUS LA UNION'),
    'Incentive Recipients include Robinsons La Union' => str_contains($html, 'ROBINSONS LA UNION'),
    'Incentive Recipients include LUCS' => str_contains($html, 'LUCS'),
    'Incentive Recipients include SM City La Union' => str_contains($html, 'SM CITY LA UNION'),
    'Cost of Doing Business Card has accurate Non-Agri wage ₱468.00' => str_contains($html, '₱468.00'),
    'Cost of Doing Business Card has accurate Agri/Micro wage ₱435.00' => str_contains($html, '₱435.00'),
    'Cost of Doing Business has direct Official Portal button' => str_contains($html, 'https://www.sanfernandocity.gov.ph/business-in-the-city/'),
    'Cost category selector exists with Wage Rates default' => str_contains($html, 'id="cityCostCategory"'),
    'Card 4 LEBDO concierge callout exists' => str_contains($html, 'city-why-concierge-callout'),
    'Global footer concierge meta exists' => str_contains($html, 'city-footer-concierge-meta'),
    'Setting Up a Business Portal inside Card 6' => str_contains($html, 'id="setting-up-business"') && str_contains($html, 'city-bizsetup-wrapper'),
    'Granting of Building Permits link' => str_contains($html, '1DloBykQcchM_UEEnc2lz6LyAoir6QOjx'),
    'Granting of Certificate of Occupancy link' => str_contains($html, '1ZE53YIu8rp3oV7-OodebVfu2xn2o8ClY'),
    'Issuance of Business Permits link' => str_contains($html, '1Qz_wQBGbFNXBS4AOtjrAZhETPMOPFOXQ'),
    'Issuance of Business Permits Online link' => str_contains($html, '16xVoUMdnBWc9YcmWHV_hl6FooQKf9sSs'),
    'Issuance of Individual Work Permit link' => str_contains($html, '1JANXE1aKykLYTFXV-4-ziP1QoNNFz880'),
    'Downloadable Forms Header' => str_contains($html, 'Downloadable Forms'),
    'Business Permit Unified Form link' => str_contains($html, '1fJzaahmyEG_YKI5Y-p04NrF1m1PvekiC'),
    'Individual Work Permit Form link' => str_contains($html, '1SjDDUy7WW-PFPHzvYO__T9o7ZoTAAv7V'),
    'Building Permit Application Form link' => str_contains($html, '1A-7d8BW_Z7qk2c-0IF93ukmNFy1oqis6'),
    'Architectural Permit Form link' => str_contains($html, '1ysv0MfAet6MStOQg3kXymb2BmGJlayXk'),
    'Demolition Permit Form link' => str_contains($html, '1lMrNo0IceVlaGq4y_b8RYltzJlBSS3Kx'),
];

$allPassed = true;
foreach ($checks as $name => $pass) {
    echo ($pass ? "✅ [PASS] " : "❌ [FAIL] ") . $name . PHP_EOL;
    if (!$pass) {
        $allPassed = false;
    }
}

if (!$allPassed) {
    exit(1);
}
echo "🎉 ALL " . count($checks) . " LANDING CONCIERGE & BUSINESS SETUP CHECKS PASSED PERFECTLY!" . PHP_EOL;
