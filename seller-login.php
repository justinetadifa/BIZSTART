<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$sceneImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = (string) ($_POST['email'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    if (sfc_login('seller', $email, $password)) {
        header('Location: ' . sfc_path('/seller-dashboard.php'));
        exit;
    }
    $error = 'Invalid seller credentials. Use the local demo account below.';
}

sfc_render_head('Seller Login | SFCelerate BizStart', $context, ['page' => 'seller-login', 'role' => 'seller']);
sfc_render_header($context);
?>
<main class="page-shell auth-page auth-page-seller">
  <section class="site-shell auth-stage">
    <div class="auth-visual" style="--auth-image:url('<?= htmlspecialchars($sceneImage, ENT_QUOTES, 'UTF-8') ?>')">
      <div class="auth-visual-copy">
        <span class="auth-role-chip">Seller Access</span>
        <h1>Present each property with clarity and confidence.</h1>
        <p>Enter a focused seller workspace built for sharper submissions, stronger listing stories, and cleaner inquiry visibility.</p>
      </div>
      <div class="auth-signal-row" aria-label="Seller portal highlights">
        <span class="auth-signal-pill">Listing control</span>
        <span class="auth-signal-pill">Readiness updates</span>
        <span class="auth-signal-pill">Investor replies</span>
      </div>
      <div class="auth-scene-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="auth-visual-stack">
        <article class="auth-floating-card auth-floating-card-accent">
          <span>Seller lane</span>
          <strong>Submit, manage, respond</strong>
          <p>Keep listings polished, pricing believable, and updates visible without touching the admin side.</p>
        </article>
        <article class="auth-floating-card">
          <span>Best use</span>
          <strong>Sharper submissions win attention</strong>
          <p>Strong photos, precise descriptions, and realistic pricing make the portfolio feel more investor-ready.</p>
        </article>
      </div>
    </div>

    <div class="auth-surface">
      <div class="auth-brand-line">SFCelerate BizStart | Seller</div>
      <div class="auth-role-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Investor</a>
        <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link is-active">Seller</a>
        <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Admin</a>
      </div>
      <div class="auth-surface-head">
        <span class="panel-chip">Seller portal</span>
        <h2>Seller login</h2>
        <p>Use the seller credential set to open your listing workspace.</p>
      </div>
      <article class="auth-identity-card">
        <div class="auth-identity-head">
          <span>Current lane</span>
          <strong>Seller listing studio</strong>
        </div>
        <div class="auth-identity-grid">
          <div><span>Primary flow</span><strong>Submit / Update / Reply</strong></div>
          <div><span>Access</span><strong>Owned listings + requests</strong></div>
          <div><span>Reading mode</span><strong>Trust + response rhythm</strong></div>
        </div>
      </article>
      <?php if ($error !== ''): ?><div class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post" class="auth-form">
        <label class="form-shell">
          <span>Email</span>
          <input type="email" name="email" class="input-shell" value="seller@sfcelerate.local" required>
        </label>
        <label class="form-shell">
          <span>Password</span>
          <input type="password" name="password" class="input-shell" value="Seller123!" required>
        </label>
        <button type="submit" class="btn-shell btn-shell-primary btn-full">Enter Seller Dashboard</button>
      </form>
      <div class="auth-form-note">Demo access: <strong>seller@sfcelerate.local</strong> / <strong>Seller123!</strong></div>
    </div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
