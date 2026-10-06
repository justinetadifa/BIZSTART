<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$sceneImage = $context['assetBase'] . '/images/sfcpanoramicView.png';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (($_POST['mode'] ?? '') === 'signup') {
        http_response_code(403);
        $error = 'Administrator accounts must be provisioned by an authorized administrator.';
    } elseif (!sfc_verify_csrf_request()) {
        $error = 'Your security token expired. Refresh the page and try again.';
    } else {
        $email = trim((string) ($_POST['email'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        if (sfc_login('admin', $email, $password)) {
            header('Location: ' . sfc_path('/admin-dashboard.php'));
            exit;
        }
        $error = 'Invalid administrator credentials. Verify your email and password.';
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
        <span class="auth-role-chip">City Administration</span>
        <span class="auth-location">SAN FERNANDO CITY, LA UNION</span>
        <h1 class="auth-poster-title"><span class="auth-title-lead">FROM CITY DATA TO</span> <strong class="auth-title-gold">PLANNING PRIORITY</strong></h1>
        <p>Sign in to manage candidate-site evidence, CLUP zoning alignment, and city development priorities.</p>
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
        <span class="auth-signal-pill">Site Prioritization</span>
        <span class="auth-signal-pill">CPDO Alignment</span>
      </div>

      <div class="auth-visual-footer"><strong>LOCUS-SF</strong><span>SITE DATA &rarr; MCE &rarr; IAI</span></div>
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

      <?php if (($_GET['reason'] ?? '') === 'timeout'): ?>
      <div class="auth-notice is-timeout" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="auth-notice-icon" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div>
          <strong>Security Timeout</strong>
          <span>Your session was safely closed due to 15 minutes of inactivity to safeguard city municipal records. Please sign in again.</span>
        </div>
      </div>
      <?php endif; ?>

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
            value="<?= htmlspecialchars((string) ($_POST['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" 
            autocomplete="username" 
            autocapitalize="off" 
            spellcheck="false" 
            inputmode="email" 
            placeholder="Your administrator email"
            required
          >
        </label>

        <label class="form-shell" for="adminPassword">
          <div class="auth-label-row">
            <span>Password</span>
            <button type="button" class="btn-pwd-toggle" id="btnTogglePassword" aria-controls="adminPassword" aria-pressed="false">Show</button>
          </div>
          <input 
            id="adminPassword" 
            type="password" 
            name="password" 
            class="input-shell" 
            autocomplete="current-password"
            required
          >
          <div class="caps-warning" id="capsWarning" style="display:none;">Caps Lock is ON</div>
        </label>


        <button type="submit" class="btn-shell btn-shell-primary btn-full auth-image-submit" id="btnSubmit">
          <span class="auth-blue-button-art" aria-hidden="true">
            <?php foreach (['left', 'center', 'right'] as $buttonPart): ?>
            <span class="auth-blue-part auth-blue-part-<?= $buttonPart ?>"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/blue_button.png" alt="" width="2000" height="2000"></span>
            <?php endforeach; ?>
          </span>
          <span id="btnSubmitText">Continue to dashboard</span>
          <span class="auth-submit-arrow" aria-hidden="true"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/icons/yellow_arrow.png" alt="" width="2000" height="2000"></span>
        </button>
      </form>

      <div class="auth-form-note">
        Administrator access is managed by the platform owner. Contact your administrator if you need an account.
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

.auth-page-admin .auth-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 6px;
  border-radius: 18px;
  background: rgba(37, 99, 235, 0.05);
  border: 1px solid rgba(37, 99, 235, 0.12);
}

.auth-page-admin .auth-switch-link {
  min-height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-decoration: none;
  transition: all 180ms ease;
}

.auth-page-admin .auth-switch-link:hover {
  color: #1e293b;
}

.auth-page-admin .auth-switch-link.is-active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12);
}

.auth-form-note {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.04);
  border: 1px solid rgba(37, 99, 235, 0.12);
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.auth-page-admin select.input-shell,
.auth-page-admin .select-shell {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background-color: #ffffff;
  color: #0f172a;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: normal;
  padding: 0 42px 0 16px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2364748b' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 18px 18px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94), 0 8px 20px rgba(15, 23, 42, 0.04);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.auth-page-admin select.input-shell:hover,
.auth-page-admin .select-shell:hover {
  border-color: rgba(37, 99, 235, 0.28);
}

.auth-page-admin select.input-shell:focus,
.auth-page-admin .select-shell:focus {
  outline: none;
  background-color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14), 0 14px 32px rgba(37, 99, 235, 0.08);
}

.auth-page-admin select.input-shell option {
  padding: 10px 14px;
  color: #0f172a;
  background: #ffffff;
  font-size: 13.5px;
}

.auth-page-admin select.input-shell option:disabled {
  color: #94a3b8;
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
  const form = document.getElementById('adminLoginForm');
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
