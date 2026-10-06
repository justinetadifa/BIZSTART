<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('Investment Priority Board | LOCUS-SF', $context, ['page' => 'property-ranking', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'ranking');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/ranking-polish.css<?= htmlspecialchars(sfc_asset_version('css/ranking-polish.css'), ENT_QUOTES, 'UTF-8') ?>">
<main class="page-shell ranking-page ranking-page-shell">
  <template id="rankingBlueButtonArt"><?= sfc_blue_button_art($context) ?></template>
  <section class="site-shell ranking-site-shell page-intro-card page-command-intro ranking-command-intro ranking-intro-surface">
    <div class="page-intro-copy">
      <div class="eyebrow">Investment Priority Board</div>
      <h1>Find the right site for your <span class="ranking-headline-accent">next investment.</span></h1>
      <p>Explore the strongest candidates for your investment goals, with transparent multi-criteria scores, strategic corridor alignment, and land-use checks.</p>
    </div>
    <div class="intro-actions">
      <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="ranking-map-action locus-blue-button"><?= sfc_blue_button_art($context) ?><?= sfc_icon('explorer') ?><span>Explore the map</span></a>
      <a href="<?= htmlspecialchars(sfc_path('/compare-decision.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary"><?= sfc_icon('compare') ?>Compare sites</a>
      <button type="button" class="btn-shell btn-shell-ghost" id="rankingPrintBtn" onclick="window.print()" title="Print or save as PDF">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print Board
      </button>
    </div>
  </section>

  <section class="site-shell ranking-site-shell ranking-root-grid" id="rankingPageRoot">
    <div class="loading-panel">Loading rankings...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
