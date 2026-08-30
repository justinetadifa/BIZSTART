<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
sfc_render_head('Admin Dashboard | SFCelerate BizStart', $context, ['page' => 'admin-dashboard', 'role' => 'admin']);
sfc_render_header($context, 'admin');
?>
<main class="page-shell dashboard-page">
  <section class="site-shell page-intro-card">
    <div>
      <div class="eyebrow">Admin Dashboard</div>
      <div class="page-role-strip">
        <span class="page-role-pill is-role">Admin Workspace</span>
        <span class="page-role-pill">Curation + governance</span>
      </div>
      <h1>Platform oversight without the noise.</h1>
      <p>Monitor listings, sellers, investor interest, voting demand, and analytics from one structured control surface.</p>
    </div>
    <div class="intro-actions">
      <a href="<?= htmlspecialchars(sfc_path('/admin-properties.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Manage Listings</a>
      <a href="<?= htmlspecialchars(sfc_path('/voting-dashboard.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">View Voting</a>
    </div>
  </section>

  <section class="site-shell dashboard-root-grid" id="adminDashboardRoot">
    <div class="loading-panel">Loading admin dashboard...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
