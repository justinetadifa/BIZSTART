<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/ZoningRulesEngine.php';
$context = sfc_web_context();
$user = $context['user'];
$role = $user['role'] ?? 'guest';
$navigation = sfc_navigation_items($role);
$e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
sfc_render_head('Property Details | LOCUS-SF', $context, ['page' => 'city-details', 'role' => $role]);
?>
<main class="city-container city-workspace property-desk">
    <header class="listing-topbar no-print print:tw-hidden">
        <a class="listing-brand" href="<?= $e(sfc_path(sfc_navigation_home($role))) ?>" aria-label="LOCUS-SF home">
            <img src="<?= $e($context['assetBase']) ?>/images/logoLocusRedBlue.png" alt="" width="38" height="38">
        </a>
        <nav class="listing-tabs" aria-label="Property navigation">
            <a href="<?= $e(sfc_path('/property-explorer.php')) ?>">Property explorer</a>
            <span aria-current="page">Property details</span>
        </nav>
        <div class="listing-topbar-tools">
            <?php sfc_investor_view_control($context); ?>
            <details class="listing-workspace-menu" id="listingWorkspaceMenu">
                <summary aria-label="Workspace and account menu" title="Workspace and account menu"><?= sfc_icon('menu') ?></summary>
                <nav aria-label="Workspace and account">
                    <?php foreach ($navigation as [$label, $href]): ?>
                    <a href="<?= $e(sfc_path($href)) ?>"><?= $e($label) ?></a>
                    <?php endforeach; ?>
                    <div class="listing-menu-account">
                        <?php if ($user !== null): ?>
                        <button type="button" id="cityUpdatesButton" class="city-updates-button" aria-haspopup="dialog" aria-controls="cityUpdatesDialog">Updates <span id="cityUpdatesCount" hidden></span></button>
                        <a href="<?= $e(sfc_path('/profile.php')) ?>">Profile</a>
                        <a href="<?= $e(sfc_path('/logout.php')) ?>">Sign out</a>
                        <?php else: ?>
                        <a href="<?= $e(sfc_path('/investor-login.php')) ?>">Log in</a>
                        <a href="<?= $e(sfc_path('/investor-login.php?mode=register')) ?>">Create account</a>
                        <?php endif; ?>
                    </div>
                </nav>
            </details>
        </div>
    </header>
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
