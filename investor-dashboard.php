<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('investor', sfc_path('/investor-login.php'));
$context = sfc_web_context();
sfc_render_head('Investor Dashboard | LOCUS-SF', $context, ['page' => 'investor-dashboard', 'role' => 'investor']);
sfc_render_header($context, 'investor');
?>
<main class="page-shell dashboard-page investor-page">
  <template id="investorBlueButtonArt"><?= sfc_blue_button_art($context) ?></template>
  <section class="site-shell investor-hero" aria-labelledby="investorHeadline">
    <div class="investor-hero-copy">
      <div class="investor-hero-eyebrow"><span></span> Your investor workspace</div>
      <div class="investor-hero-location">San Fernando City, La Union</div>
      <h1 id="investorHeadline">Good places.<br><em>Better possibilities.</em></h1>
      <p>A considered view of your next investment. Discover local opportunities, compare what matters, and keep your best options close.</p>
      <div class="intro-actions">
        <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell locus-blue-button">
          <?= sfc_blue_button_art($context) ?>
          <span>Explore opportunities</span>
          <span class="investor-action-icon" aria-hidden="true"><?= sfc_icon('explorer') ?></span>
        </a>
        <a href="<?= htmlspecialchars(sfc_path('/investor-dashboard.php#investorCompareQueue'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell investor-glass-button">Your compare board <span aria-hidden="true">&rarr;</span></a>
      </div>
      <div class="investor-hero-footnote"><span></span> Local perspective. Informed decisions.</div>
    </div>
    <aside class="investor-hero-brief" id="investorHeroBrief" aria-label="Featured investment opportunity">
      <div class="investor-brief-kicker">Opportunity in focus</div>
      <div class="investor-brief-placeholder">Finding your next possibility&hellip;</div>
    </aside>
  </section>

  <section class="site-shell dashboard-root-grid" id="investorDashboardRoot">
    <div class="loading-panel" role="status">Preparing your investor workspace&hellip;</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
