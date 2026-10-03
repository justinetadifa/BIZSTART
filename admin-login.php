<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$sceneImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!sfc_verify_csrf_request()) {
        $error = 'Your security token expired. Refresh the page and try again.';
    } else {
        $email = trim((string) ($_POST['email'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        if (sfc_login('admin', $email, $password)) {
            header('Location: ' . sfc_path('/admin-dashboard.php'));
            exit;
        }
        $error = 'Invalid administrator credentials. Verify your email and password, or use the demo account below.';
    }
}

sfc_render_head('Admin Login | LOCUS-SF', $context, ['page' => 'admin-login', 'role' => 'admin']);
sfc_render_header($context);
?>
<main class="page-shell auth-page auth-page-admin">
  <section class="site-shell auth-stage">
    <!-- Visual Side -->
    <div class="auth-visual" style="--auth-image:url('<?= htmlspecialchars($sceneImage, ENT_QUOTES, 'UTF-8') ?>')">
      <div class="auth-visual-copy">
        <span class="auth-role-chip">Municipal Administration</span>
        <h1>Platform governance with clarity and rigor.</h1>
        <p>Sign in to manage candidate-site evidence, CLUP zoning alignment, and municipal development priorities.</p>
      </div>

      <div class="auth-signal-row" aria-label="Portal highlights">
        <span class="auth-signal-pill">CLUP 2025–2035</span>
        <span class="auth-signal-pill">Site Prioritization</span>
        <span class="auth-signal-pill">CPDO Alignment</span>
      </div>

      <div class="auth-visual-stack">
        <article class="auth-floating-card auth-floating-card-accent">
          <span>Operational Oversight</span>
          <strong>Executive Back Office</strong>
          <p>Curate candidate sites, inspect suitability data, and prepare investment recommendations for the City of San Fernando.</p>
        </article>
      </div>
    </div>

    <!-- Surface Side -->
    <div class="auth-surface">
      <div class="auth-brand-line">LOCUS-SF</div>

      <!-- 2-Role Workspace Switch (Investor & Admin Only) -->
      <div class="auth-role-switch">
        <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link">Investor</a>
        <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="auth-role-switch-link is-active">Admin</a>
      </div>

      <div class="auth-surface-head">
        <h2>Admin login</h2>
        <p>Sign in with your authorized administrator credentials.</p>
      </div>

      <?php if ($error !== ''): ?>
      <div class="auth-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <form method="post" class="auth-form" id="adminLoginForm">
        <input type="hidden" name="_csrf" value="<?= htmlspecialchars(sfc_csrf_token(), ENT_QUOTES, 'UTF-8') ?>">

        <label class="form-shell" for="adminEmail">
          <span>Email address</span>
          <input 
            id="adminEmail" 
            type="email" 
            name="email" 
            class="input-shell" 
            value="<?= htmlspecialchars((string) ($_POST['email'] ?? 'admin@sfcelerate.local'), ENT_QUOTES, 'UTF-8') ?>" 
            autocomplete="username" 
            autocapitalize="off" 
            spellcheck="false" 
            inputmode="email" 
            required
          >
        </label>

        <label class="form-shell" for="adminPassword">
          <div class="auth-label-row">
            <span>Password</span>
            <button type="button" class="btn-pwd-toggle" id="btnTogglePassword" tabindex="-1">Show</button>
          </div>
          <input 
            id="adminPassword" 
            type="password" 
            name="password" 
            class="input-shell" 
            value="Admin123!" 
            autocomplete="current-password" 
            required
          >
          <div class="caps-warning" id="capsWarning" style="display:none;">Caps Lock is ON</div>
        </label>

        <label class="auth-checkbox-row">
          <input type="checkbox" name="remember" checked>
          <span>Remember this device</span>
        </label>

        <button type="submit" class="btn-shell btn-shell-primary btn-full" id="btnSubmit">
          <span id="btnSubmitText">Continue to dashboard &rarr;</span>
        </button>
      </form>

      <!-- Clean Demo Credential Assistant -->
      <div class="auth-demo-hint">
        <div class="demo-hint-copy">
          <span class="demo-hint-label">Demo access</span>
          <span><code>admin@sfcelerate.local</code> / <code>Admin123!</code></span>
        </div>
        <button type="button" class="btn-demo-autofill" id="btnAutoFill">Auto-fill</button>
      </div>

      <div class="auth-secondary-links">
        <a href="mailto:support@sfcelerate.local?subject=Admin%20Access%20Assistance">Need assistance?</a>
        <a href="<?= htmlspecialchars(sfc_path('/index.php'), ENT_QUOTES, 'UTF-8') ?>">&larr; Back to platform</a>
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
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 180ms ease;
}

.btn-pwd-toggle:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.caps-warning {
  margin-top: 4px;
  font-size: 11px;
  color: #b45309;
  font-weight: 600;
}

.auth-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  user-select: none;
  margin-top: -4px;
}

.auth-checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  cursor: pointer;
}

.auth-demo-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.05);
  border: 1px solid rgba(37, 99, 235, 0.12);
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
  color: #2563eb;
}

.demo-hint-copy code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  color: #1e293b;
  font-weight: 600;
}

.btn-demo-autofill {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;
}

.btn-demo-autofill:hover {
  background: #eff6ff;
  border-color: #93c5fd;
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
  color: #2563eb;
  text-decoration: underline;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function () {
  const pwdInput = document.getElementById('adminPassword');
  const toggleBtn = document.getElementById('btnTogglePassword');
  const capsWarning = document.getElementById('capsWarning');
  const emailInput = document.getElementById('adminEmail');
  const btnAutoFill = document.getElementById('btnAutoFill');
  const form = document.getElementById('adminLoginForm');
  const submitBtn = document.getElementById('btnSubmit');
  const submitText = document.getElementById('btnSubmitText');

  // Password toggle
  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', function () {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
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
      if (emailInput) emailInput.value = 'admin@sfcelerate.local';
      if (pwdInput) pwdInput.value = 'Admin123!';
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
      submitText.textContent = 'Authenticating...';
    });
  }
});
</script>
<?php sfc_render_footer($context); ?>
