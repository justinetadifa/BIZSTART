<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('Property Rankings | SFCelerate BizStart', $context, ['page' => 'property-ranking', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'ranking');
?>
<main class="page-shell ranking-page">
  <section class="site-shell page-intro-card page-command-intro ranking-command-intro">
    <div class="page-intro-copy">
      <div class="eyebrow">Property Rankings</div>
      <div class="page-role-strip">
        <span class="page-role-pill is-role">Decision Board</span>
        <span class="page-role-pill">Lens-led scoring + editorial ranking</span>
      </div>
      <h1>The city’s strongest opportunities, arranged with conviction.</h1>
      <p>See the top-ranked properties by investment lens, corridor strength, pricing posture, and visible local demand in one polished decision surface.</p>
    </div>
    <div class="intro-actions">
      <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Open Explorer</a>
      <a href="<?= htmlspecialchars(sfc_path('/compare-decision.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Compare Selection</a>
    </div>
  </section>

  <section class="site-shell ranking-root-grid" id="rankingPageRoot">
    <div class="loading-panel">Loading rankings...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
