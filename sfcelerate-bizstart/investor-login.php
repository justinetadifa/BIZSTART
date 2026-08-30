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
            sfc_register_investor(
                (string) ($_POST['name'] ?? ''),
                (string) ($_POST['email'] ?? ''),
                (string) ($_POST['password'] ?? ''),
                (string) ($_POST['confirm_password'] ?? '')
            );
            header('Location: ' . sfc_path('/investor-dashboard.php'));
            exit;
        } catch (InvalidArgumentException $exception) {
            $error = $exception->getMessage();
        }
    } else {
        $email = (string) ($_POST['email'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        if (sfc_login('investor', $email, $password)) {
            header('Location: ' . sfc_path('/investor-dashboard.php'));
            exit;
        }
        $error = 'Invalid investor credentials. Use the seeded account below or create a new investor profile.';
    }
}

sfc_render_head('Investor Login | SFCelerate BizStart', $context, ['page' => 'investor-login', 'role' => 'investor']);
sfc_render_header($context);
?>
<main class="page-shell auth-page auth-page-investor">
  <section class="site-shell auth-stage">
    <div class="auth-visual" style="--auth-image:url('<?= htmlspecialchars($sceneImage, ENT_QUOTES, 'UTF-8') ?>')">
      <div class="auth-visual-copy">
        <span class="auth-role-chip">Investor / Resident Access</span>
        <h1>Explore ranked opportunities and visible local demand.</h1>
        <p>Open a calmer investor workspace for property discovery, side-by-side comparison, and meaningful demand signals by location.</p>
      </div>
      <div class="auth-signal-row" aria-label="Investor portal highlights">
        <span class="auth-signal-pill">Ranked opportunities</span>
        <span class="auth-signal-pill">Demand signals</span>
        <span class="auth-signal-pill">Direct seller chat</span>
      </div>
      <div class="auth-scene-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="auth-visual-stack">
        <article class="auth-floating-card auth-floating-card-accent">
          <span>Investor flow</span>
          <strong>Rank, compare, vote</strong>
          <p>Shorter paths, clearer data, and a more premium environment for opportunity review.</p>
        </article>
        <article class="auth-floating-card">
          <span>What becomes visible</span>
          <strong>Property fit plus demand pulse</strong>
          <p>Move from exploration to conviction with cleaner ranking logic and area-based establishment signals.</p>
        </article>
      </div>
    </div>

    <div class="auth-surface">
      <div class="auth-brand-line">SFCelerate BizStart | Investor / Resident</div>
      <div class="auth-role-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link is-active">Investor</a>
        <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Seller</a>
        <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Admin</a>
      </div>
      <div class="auth-surface-head">
        <span class="panel-chip">Private access</span>
        <h2><?= $mode === 'signup' ? 'Create investor account' : 'Investor / Resident login' ?></h2>
        <p><?= $mode === 'signup' ? 'Register a unique investor account with your own shortlist, voting history, and seller chats.' : 'Use your investor account to access your personal shortlist, votes, and seller conversations.' ?></p>
      </div>
      <article class="auth-identity-card">
        <div class="auth-identity-head">
          <span>Current lane</span>
          <strong>Investor discovery cockpit</strong>
        </div>
        <div class="auth-identity-grid">
          <div><span>Primary flow</span><strong>Explore / Compare / Vote</strong></div>
          <div><span>Access</span><strong>Personal shortlist + threads</strong></div>
          <div><span>Reading mode</span><strong>Opportunity + demand</strong></div>
        </div>
      </article>
      <div class="auth-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-switch-link <?= $mode === 'login' ? 'is-active' : '' ?>">Login</a>
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php?mode=signup'), ENT_QUOTES, 'UTF-8') ?>" class="auth-switch-link <?= $mode === 'signup' ? 'is-active' : '' ?>">Sign Up</a>
      </div>
      <?php if ($error !== ''): ?><div class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <form method="post" class="auth-form">
        <input type="hidden" name="mode" value="<?= htmlspecialchars($mode, ENT_QUOTES, 'UTF-8') ?>">
        <?php if ($mode === 'signup'): ?>
        <label class="form-shell">
          <span>Full Name</span>
          <input type="text" name="name" class="input-shell" value="<?= htmlspecialchars((string) ($_POST['name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" required>
        </label>
        <?php endif; ?>
        <label class="form-shell">
          <span>Email</span>
          <input type="email" name="email" class="input-shell" value="<?= htmlspecialchars((string) ($_POST['email'] ?? ($mode === 'signup' ? '' : 'investor@sfcelerate.local')), ENT_QUOTES, 'UTF-8') ?>" required>
        </label>
        <label class="form-shell">
          <span>Password</span>
          <input type="password" name="password" class="input-shell" value="<?= $mode === 'signup' ? '' : 'Investor123!' ?>" required>
        </label>
        <?php if ($mode === 'signup'): ?>
        <label class="form-shell">
          <span>Confirm Password</span>
          <input type="password" name="confirm_password" class="input-shell" required>
        </label>
        <?php endif; ?>
        <button type="submit" class="btn-shell btn-shell-primary btn-full"><?= $mode === 'signup' ? 'Create Investor Account' : 'Enter Investor Dashboard' ?></button>
      </form>
      <div class="auth-form-note">
        Seeded investor access: <strong>investor@sfcelerate.local</strong> / <strong>Investor123!</strong><br>
        New investor accounts can now sign up with their own login and persistent shortlist activity.
      </div>
    </div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
