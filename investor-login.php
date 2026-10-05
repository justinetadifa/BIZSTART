<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$sceneImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
$mode = ($_GET['mode'] ?? $_POST['mode'] ?? 'login') === 'signup' ? 'signup' : 'login';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!sfc_verify_csrf_request()) {
        $error = 'Your security token expired. Refresh the page and try again.';
    } elseif ($mode === 'signup') {
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
        $email = trim((string) ($_POST['email'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        if (sfc_login('investor', $email, $password)) {
            header('Location: ' . sfc_path('/investor-dashboard.php'));
            exit;
        }
        $error = 'Invalid investor credentials. Use the demo account below or create a new investor profile.';
    }
}

sfc_render_head('Investor Login | LOCUS-SF', $context, ['page' => 'investor-login', 'role' => 'investor']);
sfc_render_header($context);
?>
<main class="page-shell auth-page auth-page-investor">
  <section class="site-shell auth-stage">
    <!-- Visual Side -->
    <div class="auth-visual" style="--auth-image:url('<?= htmlspecialchars($sceneImage, ENT_QUOTES, 'UTF-8') ?>')">
      <div class="auth-visual-copy">
        <span class="auth-role-chip">Investor / Resident</span>
        <span class="auth-location">SAN FERNANDO CITY, LA UNION</span>
        <h1 class="auth-poster-title"><span class="auth-title-lead">FROM SITE DATA TO</span> <strong class="auth-title-gold">INVESTMENT PRIORITY</strong></h1>
        <p>Compare candidate sites, evaluate site conditions, and continue towards stronger investment decisions across San Fernando City.</p>
      </div>

      <div class="auth-analysis-flow" aria-label="Site data feeds Multi-Criteria Evaluation and the Investment Attractiveness Index.">
        <div class="auth-data-icons">
          <span class="auth-data-icon"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/propertyinfo.png" alt="Property information" width="2000" height="2000"></span>
          <span class="auth-data-icon"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/accessibility.png" alt="Accessibility" width="2000" height="2000"></span>
          <span class="auth-data-icon"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/clupzoning.png" alt="CLUP zoning" width="2000" height="2000"></span>
          <span class="auth-data-icon"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/hazardsafety.png" alt="Hazard safety" width="2000" height="2000"></span>
        </div>
        <span class="auth-flow-arrow" aria-hidden="true"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/yellow_arrow.png" alt="" width="2000" height="2000"></span>
        <div class="auth-flow-output"><small>SITE DATA</small><strong>MCE &rarr; IAI</strong><span class="auth-flow-caption">INVESTMENT ATTRACTIVENESS INDEX</span></div>
      </div>

      <div class="auth-signal-row" aria-label="Portal highlights">
        <span class="auth-signal-pill">CLUP 2025–2035</span>
        <span class="auth-signal-pill">Candidate Sites</span>
        <span class="auth-signal-pill">Decision Matrix</span>
      </div>

      <div class="auth-visual-footer"><strong>LOCUS-SF</strong><span>SITE DATA &rarr; MCE &rarr; IAI</span></div>
    </div>

    <!-- Surface Side -->
    <div class="auth-surface">
      <div class="auth-brand-line">LOCUS-SF</div>

      <!-- 2-Role Workspace Switch (Investor & Admin Only) -->
      <div class="auth-role-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php' . ($mode === 'signup' ? '?mode=signup' : '')), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link <?= $mode === 'login' || $mode === 'signup' ? 'is-active' : '' ?>">Investor</a>
        <a href="<?= htmlspecialchars(sfc_path('/admin-login.php' . ($mode === 'signup' ? '?mode=signup' : '')), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Admin</a>
      </div>

      <div class="auth-surface-head">
        <h2><?= $mode === 'signup' ? 'Create account' : 'Investor login' ?></h2>
        <p><?= $mode === 'signup' ? 'Create an account to save candidate areas and CLUP comparisons.' : 'Use your account to continue your shortlist and suitability reviews.' ?></p>
      </div>

      <!-- Login / Signup Sub-tabs -->
      <div class="auth-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-switch-link <?= $mode === 'login' ? 'is-active' : '' ?>">Sign in</a>
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php?mode=signup'), ENT_QUOTES, 'UTF-8') ?>" class="auth-switch-link <?= $mode === 'signup' ? 'is-active' : '' ?>">Create account</a>
      </div>

      <?php if ($error !== ''): ?>
      <div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <form method="post" class="auth-form" id="investorForm">
        <input type="hidden" name="_csrf" value="<?= htmlspecialchars(sfc_csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
        <input type="hidden" name="mode" value="<?= htmlspecialchars($mode, ENT_QUOTES, 'UTF-8') ?>">

        <?php if ($mode === 'signup'): ?>
        <label class="form-shell" for="investorName">
          <span>Full name</span>
          <input 
            type="text" 
            id="investorName" 
            name="name" 
            class="input-shell" 
            value="<?= htmlspecialchars((string) ($_POST['name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" 
            autocomplete="name" 
            placeholder="e.g. Maria Santos" 
            required
          >
        </label>
        <?php endif; ?>

        <label class="form-shell" for="investorEmail">
          <span>Email address</span>
          <input 
            type="email" 
            id="investorEmail" 
            name="email" 
            class="input-shell" 
            value="<?= htmlspecialchars((string) ($_POST['email'] ?? ($mode === 'signup' ? '' : 'investor@sfcelerate.local')), ENT_QUOTES, 'UTF-8') ?>" 
            autocomplete="username" 
            autocapitalize="off" 
            spellcheck="false" 
            inputmode="email" 
            required
          >
        </label>

        <label class="form-shell" for="investorPassword">
          <div class="auth-label-row">
            <span>Password</span>
            <button type="button" class="btn-pwd-toggle" id="btnTogglePassword" aria-controls="investorPassword" aria-pressed="false">Show</button>
          </div>
          <input 
            type="password" 
            id="investorPassword" 
            name="password" 
            class="input-shell" 
            value="<?= $mode === 'signup' ? '' : 'Investor123!' ?>" 
            autocomplete="<?= $mode === 'signup' ? 'new-password' : 'current-password' ?>" 
            required
          >
          <div class="caps-warning" id="capsWarning" style="display:none;">Caps Lock is ON</div>
        </label>

        <?php if ($mode === 'signup'): ?>
        <label class="form-shell" for="investorConfirmPassword">
          <span>Confirm password</span>
          <input 
            type="password" 
            id="investorConfirmPassword" 
            name="confirm_password" 
            class="input-shell" 
            autocomplete="new-password" 
            required
          >
        </label>
        <?php endif; ?>

        <button type="submit" class="btn-shell btn-shell-primary btn-full auth-image-submit" id="btnSubmit">
          <span class="auth-blue-button-art" aria-hidden="true">
            <?php foreach (['left', 'center', 'right'] as $buttonPart): ?>
            <span class="auth-blue-part auth-blue-part-<?= $buttonPart ?>"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/blue_button.png" alt="" width="2000" height="2000"></span>
            <?php endforeach; ?>
          </span>
          <span id="btnSubmitText"><?= $mode === 'signup' ? 'Create account' : 'Continue to dashboard' ?></span>
          <span class="auth-submit-arrow" aria-hidden="true"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/yellow_arrow.png" alt="" width="2000" height="2000"></span>
        </button>
      </form>

      <?php if ($mode === 'login'): ?>
      <!-- Clean Demo Credential Assistant -->
      <div class="auth-demo-hint">
        <div class="demo-hint-copy">
          <span class="demo-hint-label">Demo access</span>
          <span><code>investor@sfcelerate.local</code> / <code>Investor123!</code></span>
        </div>
        <button type="button" class="btn-demo-autofill" id="btnAutoFill">Auto-fill</button>
      </div>
      <?php else: ?>
      <div class="auth-form-note">
        Investor accounts save candidate-site shortlists, suitability reviews, and comparison history.
      </div>
      <?php endif; ?>

      <div class="auth-secondary-links">
        <a href="mailto:support@sfcelerate.local?subject=Investor%20Access%20Assistance">Need assistance?</a>
        <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>">Browse rankings first &rarr;</a>
      </div>
    </div>
  </section>
</main>

<style>
.auth-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-pwd-toggle {
  background: transparent;
  border: none;
  padding: 0;
  color: #0f766e;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 180ms ease;
}

.btn-pwd-toggle:hover {
  color: #042f2e;
  text-decoration: underline;
}

.caps-warning {
  margin-top: 4px;
  font-size: 11px;
  color: #b45309;
  font-weight: 600;
}

.auth-demo-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(15, 118, 110, 0.05);
  border: 1px solid rgba(15, 118, 110, 0.12);
  margin-top: 4px;
}

.demo-hint-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #475569;
}

.demo-hint-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f766e;
}

.demo-hint-copy code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: #134e4a;
  font-weight: 600;
}

.btn-demo-autofill {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #99f6e4;
  color: #0f766e;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;
}

.btn-demo-autofill:hover {
  background: #f0fdfa;
  border-color: #5eead4;
}

.auth-secondary-links {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 4px;
}

.auth-secondary-links a {
  font-size: 12.5px;
  color: #64748b;
  text-decoration: none;
  font-weight: 600;
  transition: color 180ms ease;
}

.auth-secondary-links a:hover {
  color: #0f766e;
  text-decoration: underline;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function () {
  const pwdInput = document.getElementById('investorPassword');
  const toggleBtn = document.getElementById('btnTogglePassword');
  const capsWarning = document.getElementById('capsWarning');
  const emailInput = document.getElementById('investorEmail');
  const btnAutoFill = document.getElementById('btnAutoFill');
  const form = document.getElementById('investorForm');
  const submitBtn = document.getElementById('btnSubmit');
  const submitText = document.getElementById('btnSubmitText');

  // Password toggle
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', function () {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
      toggleBtn.setAttribute('aria-pressed', String(isPwd));
      pwdInput.focus();
    });
  }

  // Caps lock warning
  if (pwdInput && capsWarning) {
    const checkCaps = function (e) {
      capsWarning.style.display = (e.getModifierState && e.getModifierState('CapsLock')) ? 'block' : 'none';
    };
    pwdInput.addEventListener('keydown', checkCaps);
    pwdInput.addEventListener('keyup', checkCaps);
    pwdInput.addEventListener('blur', function () {
      capsWarning.style.display = 'none';
    });
  }

  // Auto fill demo credentials
  if (btnAutoFill) {
    btnAutoFill.addEventListener('click', function () {
      if (emailInput) emailInput.value = 'investor@sfcelerate.local';
      if (pwdInput) pwdInput.value = 'Investor123!';
      btnAutoFill.textContent = '✓ Filled';
      setTimeout(function () {
        btnAutoFill.textContent = 'Auto-fill';
      }, 1800);
      pwdInput?.focus();
    });
  }

  // Submit loading state
  if (form && submitBtn && submitText) {
    form.addEventListener('submit', function () {
      submitBtn.disabled = true;
      submitText.textContent = 'Signing in...';
    });
  }
});
</script>
<?php sfc_render_footer($context); ?>
