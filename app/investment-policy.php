<?php
declare(strict_types=1);

// One policy source for the public brief, activity mapping, estimator and reports.
// Scoring approval is independent of statutory incentive eligibility.
$sectors = [
    'Agriculture, Agribusiness & Fishery',
    'Tourism & Transportation',
    'Information & Communication Technology',
    'Manufacturing & Processing',
    'Infrastructure, Water, Sanitation & Property Development',
    'Ecological Solid Waste Management',
    'Support Facilities for Agriculture and Food Production',
];
return [
    'ordinance_number' => 'Ordinance No. 2024-41',
    'ordinance_title' => 'City Investment and Incentives Code',
    'source_url' => 'https://www.sanfernandocity.gov.ph/business-in-the-city/',
    'ordinance_url' => 'https://drive.google.com/file/d/1S5q2HOklGy4O692uYMgHrZNNXOpYqZ69/view',
    'verified_on' => '2026-10-07',
    'priority_sectors' => $sectors,
    // Enable only with a recorded approval reference for this research modifier.
    'priority_modifier_approved' => false,
    'priority_modifier_approval_reference' => null,
    'policy_priority_adjustment_percent' => 0.0,
    // Section 19, p15 of the published ordinance; potential eligibility only.
    'incentives_verified' => true,
    'incentive_thresholds' => [
        'tier1_min_capital' => 15000000.0,
        'tier1_exemption_years' => 1,
        'tier2_min_capital' => 3000000.0,
        'tier2_max_capital' => 14999999.0,
        'tier2_discount_percent' => 10,
    ],
    'business_types' => [
        ['id' => 'agriculture', 'label' => 'Agriculture / agribusiness / fishery', 'sector' => $sectors[0]],
        ['id' => 'tourism', 'label' => 'Tourism / visitor accommodation', 'sector' => $sectors[1]],
        ['id' => 'transport', 'label' => 'Transportation', 'sector' => $sectors[1]],
        ['id' => 'ict', 'label' => 'ICT / IT-BPM services for overseas clients', 'sector' => $sectors[2]],
        ['id' => 'manufacturing', 'label' => 'Manufacturing / processing', 'sector' => $sectors[3]],
        ['id' => 'infrastructure', 'label' => 'Infrastructure / water / sanitation', 'sector' => $sectors[4]],
        ['id' => 'development', 'label' => 'Property development', 'sector' => $sectors[4]],
        ['id' => 'waste', 'label' => 'Ecological solid waste management', 'sector' => $sectors[5]],
        ['id' => 'food-support', 'label' => 'Agriculture / food production support facilities', 'sector' => $sectors[6]],
        ['id' => 'retail', 'label' => 'General retail / services', 'sector' => null],
        ['id' => 'other', 'label' => 'Other activity / unsure', 'sector' => null],
    ],
    'compliance' => [
        ['title' => 'Local workforce · 70%', 'copy' => 'At least 70% of total manpower must be city residents. If the required skills are unavailable locally, obtain City PESO certification. (§14G, p12)'],
        ['title' => 'CSR commitment · 5%', 'copy' => 'Submit a CSR plan for Board review and allot 5% of incentives availed to eligible CSR activities. Local registrants must start CSR in their third year if incentives run for more than two years. (§16, pp12–13; §§23–24, pp16–17)'],
        ['title' => 'Zoning and land use', 'copy' => 'Comply with applicable zoning and land-use rules. A registered enterprise found guilty of violations faces a ₱5,000 fine upon CSF-IPAC recommendation. (§26, p18)'],
        ['title' => 'LGU eligibility review', 'copy' => 'Confirm the specific priority activity, capitalization basis and registration with LEBDO / CSF-IPAC. Regulatory fees, real property taxes and service charges are excluded from the local business tax incentive. (§§14, 18–19)'],
    ],
];
