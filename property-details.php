<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Property Details | LOCUS-SF', $context, ['page' => 'city-details', 'role' => $context['user']['role'] ?? 'guest']);
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/property-details.css<?= sfc_asset_version('css/property-details.css') ?>">
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
<script type="module" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php sfc_render_footer($context); ?>
