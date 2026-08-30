<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$sceneImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = (string) ($_POST['email'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    if (sfc_login('admin', $email, $password)) {
        header('Location: ' . sfc_path('/admin-dashboard.php'));
        exit;
    }
    $error = 'Invalid admin credentials. Use the local demo account below.';
}

sfc_render_head('Admin Login | SFCelerate BizStart', $context, ['page' => 'admin-login', 'role' => 'admin']);
sfc_render_header($context);
?>
<main class="page-shell auth-page auth-page-admin">
  <section class="site-shell auth-stage">
    <div class="auth-visual" style="--auth-image:url('<?= htmlspecialchars($sceneImage, ENT_QUOTES, 'UTF-8') ?>')">
      <div class="auth-visual-copy">
        <span class="auth-role-chip">Admin Access</span>
        <h1>Platform control with investor-grade polish.</h1>
        <p>Step into a cleaner command surface for listings, sellers, voting demand, and performance visibility without the usual admin clutter.</p>
      </div>
      <div class="auth-signal-row" aria-label="Admin portal highlights">
        <span class="auth-signal-pill">Governance ledger</span>
        <span class="auth-signal-pill">Inventory control</span>
        <span class="auth-signal-pill">City showcase studio</span>
      </div>
      <div class="auth-scene-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="auth-visual-stack">
        <article class="auth-floating-card auth-floating-card-accent">
          <span>Oversight</span>
          <strong>Listings, votes, analytics</strong>
          <p>One role. One control surface. A much sharper operational view.</p>
        </article>
        <article class="auth-floating-card">
          <span>Admin scope</span>
          <strong>High-trust back office</strong>
          <p>Curate inventory quality, monitor demand signals, and keep the platform ready for investor-facing use.</p>
        </article>
      </div>
    </div>

    <div class="auth-surface">
      <div class="auth-brand-line">SFCelerate BizStart | Admin</div>
      <div class="auth-role-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Investor</a>
        <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Seller</a>
        <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link is-active">Admin</a>
      </div>
      <div class="auth-surface-head">
        <span class="panel-chip">Secure entry</span>
        <h2>Admin login</h2>
        <p>Use the admin credential set to open the platform oversight workspace.</p>
      </div>
      <article class="auth-identity-card">
        <div class="auth-identity-head">
          <span>Current lane</span>
          <strong>Admin control room</strong>
        </div>
        <div class="auth-identity-grid">
          <div><span>Primary flow</span><strong>Oversee / Curate / Moderate</strong></div>
          <div><span>Access</span><strong>Platform-wide control</strong></div>
          <div><span>Reading mode</span><strong>Signals + governance</strong></div>
        </div>
      </article>
      <?php if ($error !== ''): ?><div class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post" class="auth-form">
        <label class="form-shell">
          <span>Email</span>
          <input type="email" name="email" class="input-shell" value="admin@sfcelerate.local" required>
        </label>
        <label class="form-shell">
          <span>Password</span>
          <input type="password" name="password" class="input-shell" value="Admin123!" required>
        </label>
        <button type="submit" class="btn-shell btn-shell-primary btn-full">Enter Admin Dashboard</button>
      </form>
      <div class="auth-form-note">Demo access: <strong>admin@sfcelerate.local</strong> / <strong>Admin123!</strong></div>
    </div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
