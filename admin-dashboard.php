<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
sfc_render_head('Admin Dashboard | LOCUS-SF', $context, ['page' => 'admin-dashboard', 'role' => 'admin']);
sfc_render_header($context, 'admin');
?>
<main class="page-shell dashboard-page admin-dashboard-page">
  <section class="site-shell admin-command-header">
    <div class="admin-header-visual" aria-hidden="true">
      <img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/admin-city.jpg" alt="" width="1600" height="900" fetchpriority="high">
    </div>
    <div class="admin-header-copy">
      <div class="admin-eyebrow">
        <?= sfc_icon('admin') ?>
        <span class="admin-eyebrow-text">Administrator workspace</span>
      </div>
      <h1>San Fernando,<br><span>in focus.</span></h1>
      <p>Review sellers, keep conversations moving, and manage city opportunities.</p>
      <div class="admin-header-actions no-print">
        <a href="<?= htmlspecialchars(sfc_path('/admin-properties.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary admin-primary-btn">
          <?= sfc_icon('inventory') ?>
          Manage properties
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
    <div class="admin-hero-caption" aria-hidden="true"><span>City of San Fernando</span><strong>La Union, Philippines</strong></div>
  </section>

  <div class="admin-workspace-bar">
    <div class="admin-view-tabs" role="tablist" aria-label="Admin workspace">
      <button type="button" id="adminTab-overview" role="tab" aria-selected="true" aria-controls="adminPanel-overview" data-admin-view="overview">Overview</button>
      <button type="button" id="adminTab-inbox" role="tab" aria-selected="false" aria-controls="adminPanel-inbox" tabindex="-1" data-admin-view="inbox">Inbox <span data-admin-count="inbox" hidden></span></button>
      <button type="button" id="adminTab-sellers" role="tab" aria-selected="false" aria-controls="adminPanel-sellers" tabindex="-1" data-admin-view="sellers">Seller reviews <span data-admin-count="sellers" hidden></span></button>
      <button type="button" id="adminTab-activity" role="tab" aria-selected="false" aria-controls="adminPanel-activity" tabindex="-1" data-admin-view="activity">Activity</button>
    </div>
    <span class="admin-workspace-caption">City administration <span aria-hidden="true">/</span> Overview &amp; operations</span>
  </div>

  <section class="site-shell dashboard-root-grid" id="adminDashboardRoot">
    <div class="loading-panel">Loading admin dashboard...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
