<?php
declare(strict_types=1);

// Static accessibility and integration contracts. Runtime behavior is covered by
// mce-weights-editor.test.cjs, including balancing, failed saves and stale previews.
$dashboard = file_get_contents(__DIR__ . '/../admin-dashboard.php');
$css = file_get_contents(__DIR__ . '/../assets/css/admin-mce-weights.css');
$js = file_get_contents(__DIR__ . '/../assets/js/admin-mce-weights.js');

$checks = [
    'MCE has dedicated styles independent of generated utilities' => str_contains($dashboard, '/css/admin-mce-weights.css') && str_contains($css, '#mceWeightConfigDialog.mce-editor'),
    'Arithmetic module loads before the editor' => strpos($dashboard, '/js/mce-weights-model.js') < strpos($dashboard, '/js/admin-mce-weights.js'),
    'Dialog provides an accessible name and description' => str_contains($dashboard, 'aria-labelledby="mceConfigModalTitle" aria-describedby="mceConfigDescription"'),
    'Fixed header, scrolling content and persistent action footer' => str_contains($dashboard, 'class="mce-dialog-header"') && str_contains($dashboard, 'class="mce-dialog-body"') && str_contains($dashboard, 'class="mce-dialog-footer"'),
    'Automatic balancing is enabled by default and explained' => str_contains($dashboard, 'id="mceAutoBalance" type="checkbox" checked') && str_contains($dashboard, 'Other weights adjust proportionally.'),
    'Preset controls expose selected state' => str_contains($dashboard, 'aria-label="Weight presets"') && str_contains($js, "button.setAttribute('aria-pressed'"),
    'Criterion sliders and numbers both use server precision' => substr_count($js, 'step="0.01"') === 2,
    'Criterion fields have accessible labels and individual errors' => str_contains($js, 'label for="mce-weight-') && str_contains($js, 'aria-describedby="mce-help-') && str_contains($js, "input.setAttribute('aria-invalid'"),
    'Source reference is required and constrained to database limit' => str_contains($dashboard, 'id="mceReferenceInput" required minlength="5" maxlength="255"'),
    'Methodology and history remain available in disclosures' => str_contains($dashboard, 'Methodology &amp; zoning safeguards') && str_contains($dashboard, 'Configuration history'),
    'Active configuration version is inspectable' => str_contains($dashboard, 'id="mceCurrentVersionBadge"'),
    'Save result is announced in a persistent live region' => str_contains($dashboard, 'id="mceConfigStatusMessage" class="mce-status" role="status" aria-live="polite"'),
    'Successful saves notify the current page and other tabs' => str_contains($js, "new CustomEvent('locus:mce-weights-updated'") && str_contains($js, "localStorage.setItem('locus:mce-weights-updated'"),
    'Small screens use viewport-safe dimensions' => str_contains($css, '@media (max-width: 600px)') && str_contains($css, '100dvh - 16px'),
    'Keyboard focus is visible and reduced motion respected' => str_contains($css, ':focus-visible') && str_contains($css, 'prefers-reduced-motion: reduce'),
    'Hidden status, errors and previews do not occupy layout space' => str_contains($css, '[hidden] { display: none !important; }'),
];

$failures = 0;
foreach ($checks as $description => $passed) {
    echo ($passed ? '[PASS] ' : '[FAIL] ') . $description . PHP_EOL;
    if (!$passed) $failures++;
}
echo count($checks) . ' checks; ' . $failures . ' failed.' . PHP_EOL;
exit($failures ? 1 : 0);
