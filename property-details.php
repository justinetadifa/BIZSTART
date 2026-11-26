<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/ZoningRulesEngine.php';
$context = sfc_web_context();
$user = $context['user'];
$role = $user['role'] ?? 'guest';
$e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
sfc_render_head('Property Details | LOCUS-SF', $context, ['page' => 'city-details', 'role' => $role]);
sfc_render_header($context, $role === 'guest' ? 'properties' : 'explorer');
?>
<main class="city-container city-workspace property-desk">
    <div class="listing-topbar no-print print:tw-hidden">
        <nav class="listing-tabs" aria-label="Property navigation">
            <a href="<?= $e(sfc_path('/property-explorer.php')) ?>">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                <span>Property explorer</span>
            </a>
            <span class="listing-tabs-sep" aria-hidden="true">/</span>
            <span aria-current="page">Property details</span>
        </nav>
        <div class="listing-topbar-tools">
            <?php sfc_investor_view_control($context); ?>
        </div>
    </div>
    <div id="cityPropertyDetails" aria-live="polite"><div class="city-loading">Loading property…</div></div>
</main>
<script id="locusZoningEngineData" type="application/json">
<?= json_encode([
    'districts' => \App\Support\ZoningRulesEngine::getOfficialDistricts(),
    'catalog' => \App\Support\ZoningRulesEngine::getHierarchicalUseCatalog(),
    'rules' => \App\Support\ZoningRulesEngine::getAllRules(),
    'version' => \App\Support\ZoningRulesEngine::VERSION,
    'weight' => \App\Support\ZoningRulesEngine::ZONING_WEIGHT,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>
</script>
<script type="module" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php sfc_render_footer($context); ?>
