<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('Property Explorer | SFCelerate BizStart', $context, ['page' => 'property-explorer', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'explorer');
?>
<main class="page-shell explorer-page">
  <section class="site-shell page-intro-card page-command-intro explorer-command-intro">
    <div class="page-intro-copy">
      <div class="eyebrow">Property Explorer</div>
      <div class="page-role-strip">
        <span class="page-role-pill is-role">Spatial Intelligence</span>
        <span class="page-role-pill">Live map + shortlist + compare</span>
      </div>
      <h1>Read the city like a living opportunity map.</h1>
      <p>Search properties, shift the investment lens, and move across map, shortlist, and comparison without losing the city context.</p>
    </div>
    <div class="intro-actions">
      <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open Rankings</a>
      <a href="<?= htmlspecialchars(sfc_path('/compare-decision.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Open Compare</a>
    </div>
  </section>

  <section class="site-shell explorer-root-grid" id="explorerAppRoot">
    <div class="loading-panel">Loading explorer...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
