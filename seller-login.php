<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$sceneImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
$mode = ($_GET['mode'] ?? $_POST['mode'] ?? 'login') === 'signup' ? 'signup' : 'login';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($mode === 'signup') {
        try {
            sfc_register_seller(
                (string) ($_POST['name'] ?? ''),
                (string) ($_POST['email'] ?? ''),
                (string) ($_POST['password'] ?? ''),
                (string) ($_POST['confirm_password'] ?? '')
            );
            header('Location: ' . sfc_path('/seller-dashboard.php'));
            exit;
        } catch (InvalidArgumentException $exception) {
            $error = $exception->getMessage();
        }
    } else {
        $email = (string) ($_POST['email'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        if (sfc_login('seller', $email, $password)) {
            header('Location: ' . sfc_path('/seller-dashboard.php'));
            exit;
        }
        $error = 'Invalid seller credentials. Use the demo account below or create a new seller profile.';
    }
}

sfc_render_head('Seller Portal | SFCelerate BizStart', $context, ['page' => 'seller-login', 'role' => 'seller']);
sfc_render_header($context);
?>
<main class="page-shell auth-page auth-page-seller">
  <section class="site-shell auth-stage">
    <div class="auth-visual" style="--auth-image:url('<?= htmlspecialchars($sceneImage, ENT_QUOTES, 'UTF-8') ?>')">
      <div class="auth-visual-copy">
        <span class="auth-role-chip">Seller Access</span>
        <h1><?= $mode === 'signup' ? 'Join the verified commercial seller network.' : 'Present each property with clarity and confidence.' ?></h1>
        <p><?= $mode === 'signup' ? 'Create your seller account to list commercial parcels, track due diligence reviews, and connect directly with verified investors.' : 'Enter a focused seller workspace built for sharper submissions, stronger listing stories, and cleaner inquiry visibility.' ?></p>
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
        <h2><?= $mode === 'signup' ? 'Create seller account' : 'Seller login' ?></h2>
        <p><?= $mode === 'signup' ? 'Register as a property owner or broker to submit listings and receive investor inquiries.' : 'Use the seller credential set to open your listing workspace.' ?></p>
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
      <div class="auth-switch">
        <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-switch-link <?= $mode === 'login' ? 'is-active' : '' ?>">Login</a>
        <a href="<?= htmlspecialchars(sfc_path('/seller-login.php?mode=signup'), ENT_QUOTES, 'UTF-8') ?>" class="auth-switch-link <?= $mode === 'signup' ? 'is-active' : '' ?>">Sign Up</a>
      </div>
      <?php if ($error !== ''): ?><div class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post" class="auth-form">
        <input type="hidden" name="mode" value="<?= htmlspecialchars($mode, ENT_QUOTES, 'UTF-8') ?>">
        <?php if ($mode === 'signup'): ?>
        <label class="form-shell">
          <span>Full Name / Brokerage Name</span>
          <input type="text" name="name" class="input-shell" value="<?= htmlspecialchars((string) ($_POST['name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" placeholder="e.g. Juan dela Cruz / Prime Realty" required>
        </label>
        <?php endif; ?>
        <label class="form-shell">
          <span>Email</span>
          <input type="email" name="email" class="input-shell" value="<?= htmlspecialchars((string) ($_POST['email'] ?? ($mode === 'signup' ? '' : 'seller@sfcelerate.local')), ENT_QUOTES, 'UTF-8') ?>" placeholder="seller@domain.com" required>
        </label>
        <label class="form-shell">
          <span>Password</span>
          <input type="password" name="password" class="input-shell" value="<?= $mode === 'signup' ? '' : 'Seller123!' ?>" placeholder="••••••••" required>
        </label>
        <?php if ($mode === 'signup'): ?>
        <label class="form-shell">
          <span>Confirm Password</span>
          <input type="password" name="confirm_password" class="input-shell" placeholder="••••••••" required>
        </label>
        <?php endif; ?>
        <button type="submit" class="btn-shell btn-shell-primary btn-full"><?= $mode === 'signup' ? 'Create Seller Account' : 'Enter Seller Dashboard' ?></button>
      </form>
      <div class="auth-form-note">
        Demo access: <strong>seller@sfcelerate.local</strong> / <strong>Seller123!</strong><br>
        Property owners and brokers can also register a dedicated seller account to submit and manage listings.
      </div>
    </div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
