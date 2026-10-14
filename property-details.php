<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/ZoningRulesEngine.php';
$context = sfc_web_context();
sfc_render_head('Property Details | LOCUS-SF', $context, ['page' => 'city-details', 'role' => $context['user']['role'] ?? 'guest']);
?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-details.css<?= sfc_asset_version('css/property-details.css') ?>">
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/business-opportunities.css<?= sfc_asset_version('css/business-opportunities.css') ?>">
<?php
sfc_render_header($context, 'explorer');
?>
<main class="city-container city-workspace">
    <div class="property-page-toolbar no-print print:tw-hidden">
        <p class="city-back-nav"><a class="city-link" href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>">← Properties</a></p>
        <?php sfc_investor_view_control($context); ?>
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
