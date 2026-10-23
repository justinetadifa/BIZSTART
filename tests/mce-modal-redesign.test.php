<?php
declare(strict_types=1);

/**
 * MCE Modal Visual & Structural Redesign Verification Suite
 */

echo "=== Running LOCUS-SF MCE Modal Redesign Verification Suite ===\n\n";

$dashFile = __DIR__ . '/../admin-dashboard.php';
$dashContent = file_get_contents($dashFile);
if ($dashContent === false) {
    fwrite(STDERR, "[FAIL] Cannot read admin-dashboard.php\n");
    exit(1);
}

$cssFile = __DIR__ . '/../assets/css/admin-workspace.css';
$cssContent = file_get_contents($cssFile);
if ($cssContent === false) {
    fwrite(STDERR, "[FAIL] Cannot read admin-workspace.css\n");
    exit(1);
}

$jsFile = __DIR__ . '/../assets/js/admin-mce-weights.js';
$jsContent = file_get_contents($jsFile);
if ($jsContent === false) {
    fwrite(STDERR, "[FAIL] Cannot read admin-mce-weights.js\n");
    exit(1);
}

$checks = [
    // Modal Structural Checks
    'Top jewel brand accent in dialog' => str_contains($dashContent, 'tw-bg-gradient-to-r tw-from-[#9E1B22] tw-via-[#11224d] tw-to-[#0284c7]'),
    'Executive modal header icon badge' => str_contains($dashContent, 'mce-modal-icon-badge'),
    'Title: Spatial Multi-Criteria Evaluation (MCE)' => str_contains($dashContent, 'Spatial Multi-Criteria Evaluation (MCE)'),
    'Governance Engine badge in header' => str_contains($dashContent, 'Governance Engine'),
    'Telemetry HUD container with executive class' => str_contains($dashContent, 'mce-telemetry-hud'),
    'Allocation Total display container' => str_contains($dashContent, 'id="mceTotalDisplay"'),
    'Total status badge container' => str_contains($dashContent, 'id="mceTotalStatusBadge"'),
    'Segmented cumulative stacked bar container' => str_contains($dashContent, 'mce-stacked-bar-container') && str_contains($dashContent, 'id="mceStackedBar"'),
    'Auto-balance breakdown suggestion assistant' => str_contains($dashContent, 'id="mceBalanceAssistant"') && str_contains($dashContent, 'id="mceApplySuggestionBtn"'),
    'Quick Model Presets toolbar' => str_contains($dashContent, 'data-mce-preset="baseline"') && str_contains($dashContent, 'data-mce-preset="logistics"'),
    'Active criteria header with permitted bounds badge' => str_contains($dashContent, 'Bounds: 5.0% – 60.0%'),
    'Reason for adjustment input preserved' => str_contains($dashContent, 'id="mceReasonInput"'),
    'Reference input preserved' => str_contains($dashContent, 'id="mceReferenceInput"'),
    'Restore Approved Baseline button with icon' => str_contains($dashContent, 'id="restoreMceBaselineBtn"') && str_contains($dashContent, 'Restore Approved Baseline'),
    'Simulate impact button with icon' => str_contains($dashContent, 'id="previewMceConfigBtn"') && str_contains($dashContent, 'Simulate Impact'),
    'Apply Weights primary button with San Fernando Crimson' => str_contains($dashContent, 'id="applyMceConfigBtn"') && str_contains($dashContent, 'Apply Weights'),
    'Dialog uses fixed header, scrollable body, and sticky footer classes' => str_contains($dashContent, 'mce-dialog-header') && str_contains($dashContent, 'mce-dialog-body') && str_contains($dashContent, 'mce-dialog-footer'),

    // CSS Checks
    'Modal backdrop blur filter' => str_contains($cssContent, '#mceWeightConfigDialog::backdrop') && str_contains($cssContent, 'backdrop-filter: blur(10px)'),
    'Dialog rounded 24px and box-shadow' => str_contains($cssContent, '#mceWeightConfigDialog {') && str_contains($cssContent, 'border-radius: 24px'),
    'Dialog flex container constrained height (min(92vh, 900px))' => str_contains($cssContent, 'height: min(92vh, 900px)'),
    'Scrollable body has flex: 1 1 auto, min-height: 0, and overflow-y: auto' => str_contains($cssContent, '.mce-dialog-body') && str_contains($cssContent, 'overflow-y: auto !important') && str_contains($cssContent, 'min-height: 0 !important'),
    'Header and footer have flex-shrink: 0' => str_contains($cssContent, '.mce-dialog-header') && str_contains($cssContent, '.mce-dialog-footer') && str_contains($cssContent, 'flex-shrink: 0 !important'),
    'Modal fade-in keyframe animation' => str_contains($cssContent, '@keyframes mceModalFadeIn'),
    'Custom slim scrollbar styling' => str_contains($cssContent, '#mceWeightConfigDialog .tw-overflow-y-auto::-webkit-scrollbar'),
    'Executive Telemetry HUD CSS styling' => str_contains($cssContent, '.mce-telemetry-hud') && str_contains($cssContent, 'linear-gradient'),
    'Stacked bar CSS styling' => str_contains($cssContent, '.mce-stacked-bar') && str_contains($cssContent, '.mce-stacked-segment'),
    'Auto-balance assistant CSS styling' => str_contains($cssContent, '.mce-assistant-card') && str_contains($cssContent, '.mce-btn-apply-suggestion'),
    'Custom slider input styling (.mce-slider-input)' => str_contains($cssContent, '.mce-slider-input') && str_contains($cssContent, '::-webkit-slider-thumb'),
    'Webkit runnable track centering' => str_contains($cssContent, '::-webkit-slider-runnable-track') && str_contains($cssContent, 'margin-top: -7px'),
    'Custom slider thumb hover highlight (#9E1B22)' => str_contains($cssContent, '.mce-slider-input::-webkit-slider-thumb:hover') && str_contains($cssContent, '#9E1B22'),
    'Explicit Apply Weights button styles in San Fernando Crimson' => str_contains($cssContent, '#applyMceConfigBtn') && str_contains($cssContent, 'background: #9E1B22'),
    'Gamified NEW WEIGHTS APPLIED celebration CSS styling' => str_contains($cssContent, '.mce-celebration-overlay') && str_contains($cssContent, '.mce-celebration-card'),
    'Micro-confetti particle animation rules' => str_contains($cssContent, '.mce-confetti-particle') && str_contains($cssContent, '@keyframes mceConfettiDrop'),

    // JS Checks
    'getDeltaBadgeHTML helper defined' => str_contains($jsContent, 'function getDeltaBadgeHTML('),
    'Category tags mapped (Spatial Connectivity, etc.)' => str_contains($jsContent, 'Spatial Connectivity') && str_contains($jsContent, 'Utilities & Telecom'),
    'Sleek governance standard banner with CLUP calibration' => str_contains($jsContent, 'LOCUS-SF Methodological Standard') && str_contains($jsContent, 'CLUP 2017-2027 Calibrated'),
    'Zoning exclusion binary gate badge' => str_contains($jsContent, 'Zoning Exclusion: Binary Pre-qualification Gate'),
    'Slider class uses mce-slider-input' => str_contains($jsContent, 'class="mce-slider-input"'),
    'Numeric input stepper box' => str_contains($jsContent, 'mce-number-box'),
    'Card footer shows clean CSFP 6-Criterion Ref' => str_contains($jsContent, 'CSFP 6-Criterion Ref:'),
    'Balanced badge uses executive emerald HUD theme' => str_contains($jsContent, 'tw-bg-emerald-500/20') && str_contains($jsContent, 'tw-text-emerald-300'),
    'Excess/remaining badge with live percentage' => str_contains($jsContent, '% remaining') && str_contains($jsContent, '% excess'),
    'calculateSuggestedBreakdown auto-balance algorithm' => str_contains($jsContent, 'function calculateSuggestedBreakdown('),
    'applySuggestedBreakdown function' => str_contains($jsContent, 'function applySuggestedBreakdown('),
    'renderStackedBar live visual bar' => str_contains($jsContent, 'function renderStackedBar('),
    'applyPreset quick archetype handler' => str_contains($jsContent, 'function applyPreset('),
    'showCelebrationEffect gamified celebration in JS' => str_contains($jsContent, 'function showCelebrationEffect(') && str_contains($jsContent, 'NEW WEIGHTS'),
    'Sound effect trigger on weight application' => str_contains($jsContent, 'LocusSound.play'),
    'Live character count listener for reason input' => str_contains($jsContent, 'mceReasonCharCount'),
];

$passed = 0;
$failed = 0;

foreach ($checks as $name => $ok) {
    if ($ok) {
        echo "  [PASS] $name\n";
        $passed++;
    } else {
        echo "  [FAIL] $name\n";
        $failed++;
    }
}

echo "\n=======================================================\n";
echo "  RESULTS: $passed PASSED, $failed FAILED\n";
echo "=======================================================\n";

if ($failed > 0) {
    exit(1);
}
echo "All MCE Modal redesign checks passed successfully.\n";
