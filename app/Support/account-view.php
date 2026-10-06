<?php
declare(strict_types=1);

function sfc_account_escape(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function sfc_account_field(string $name, string $label, string $type = 'text', bool $required = true, string $autocomplete = '', string $default = '', int $maxLength = 255): void
{
    $value = $type === 'password' ? '' : (string) ($_POST[$name] ?? $default);
    ?>
    <label class="account-field">
      <span><?= sfc_account_escape($label) ?></span>
      <input type="<?= sfc_account_escape($type) ?>" name="<?= sfc_account_escape($name) ?>" value="<?= sfc_account_escape($value) ?>" maxlength="<?= $maxLength ?>" <?= $required ? 'required' : '' ?> <?= $autocomplete !== '' ? 'autocomplete="' . sfc_account_escape($autocomplete) . '"' : '' ?> <?= $type === 'password' ? 'minlength="8"' : '' ?> <?= $type === 'tel' ? 'inputmode="tel"' : '' ?>>
    </label>
    <?php
}

function sfc_render_account_page(array $context, string $role, string $mode, string $error): void
{
    $label = match ($role) { 'seller' => 'Broker', 'admin' => 'City staff', default => 'Investor' };
    $signup = $mode === 'signup' && $role !== 'admin';
    $route = match ($role) { 'seller' => '/seller-login.php', 'admin' => '/admin-login.php', default => '/investor-login.php' };
    sfc_render_head($label . ($signup ? ' account' : ' sign in') . ' | LOCUS-SF', $context, ['page' => $role . '-login', 'role' => $role]);
    ?>
    <link rel="stylesheet" href="<?= sfc_account_escape($context['assetBase']) ?>/css/account.css<?= sfc_account_escape(sfc_asset_version('css/account.css')) ?>">
    <?php sfc_render_header($context); ?>
    <main class="account-page">
      <section class="account-card <?= $signup ? 'account-card-wide' : '' ?> <?= $role === 'admin' ? 'account-card-staff' : '' ?>" aria-labelledby="accountTitle">
        <?php if ($role !== 'admin'): ?>
        <nav class="account-roles" aria-label="Account type">
          <?php foreach (['investor' => ['Investor', '/investor-login.php'], 'seller' => ['Broker', '/seller-login.php'], 'admin' => ['City staff', '/admin-login.php']] as $key => [$title, $href]): ?>
          <a href="<?= sfc_account_escape(sfc_path($href . ($signup && $key !== 'admin' ? '?mode=signup' : ''))) ?>" <?= $role === $key ? 'aria-current="page"' : '' ?>><?= $title ?></a>
          <?php endforeach; ?>
        </nav>
        <p class="account-eyebrow">LOCUS-SF</p>
        <?php endif; ?>
        <h1 id="accountTitle"><?= $role === 'admin' ? 'City staff' : ($signup ? 'Create your account' : $label . ' sign in') ?></h1>
        <p class="account-intro"><?= match (true) { $role === 'admin' => 'CICTO · Assessors · LEBDO', $role === 'seller' && $signup => 'Your PRC registration will be reviewed by CICTO.', $role === 'seller' => 'Manage your listings and city review messages.', default => 'Find your next opportunity in San Fernando.' } ?></p>
        <?php if (($_GET['reason'] ?? '') === 'timeout'): ?><p class="account-message" role="status">Your session expired. Sign in again.</p><?php endif; ?>
        <?php if ($error !== ''): ?><p class="account-message is-error" role="alert"><?= sfc_account_escape($error) ?></p><?php endif; ?>
        <?php if ($role === 'admin'): ?>
        <div class="admin-tab-switcher" role="tablist" aria-label="City staff access">
          <button type="button" class="admin-tab-btn is-active" id="btnAdminSignInTab" role="tab" aria-selected="true" aria-controls="adminSignInSection">Sign in</button>
          <button type="button" class="admin-tab-btn" id="btnAdminOnboardTab" role="tab" aria-selected="false" aria-controls="adminOnboardSection" tabindex="-1">Activate account</button>
        </div>
        <div id="adminSignInSection" role="tabpanel" aria-labelledby="btnAdminSignInTab">
        <?php endif; ?>
        <form method="post" class="account-form <?= $signup ? 'account-form-grid' : '' ?>">
          <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
          <input type="hidden" name="mode" value="<?= $signup ? 'signup' : 'login' ?>">
          <?php if ($signup): ?>
            <?php sfc_account_field('name', 'Complete name', 'text', true, 'name', '', 140); ?>
            <?php sfc_account_field('phone', $role === 'seller' ? 'Contact number' : 'Contact number (optional)', 'tel', $role === 'seller', 'tel', '', 30); ?>
            <?php sfc_account_field($role === 'seller' ? 'address_line' : 'address', $role === 'seller' ? 'Complete address' : 'Address (optional)', 'text', $role === 'seller', 'street-address'); ?>
            <?php if ($role === 'seller'): ?>
              <input type="hidden" name="seller_type" value="broker">
              <?php sfc_account_field('city', 'City / municipality', 'text', true, 'address-level2', 'San Fernando, La Union', 120); ?>
              <?php sfc_account_field('prc_registration_no', 'PRC registration number', 'text', true, '', '', 20); ?>
              <?php sfc_account_field('prc_valid_until', 'PRC ID valid until', 'date'); ?>
              <?php sfc_account_field('company_name', 'Agency (optional)', 'text', false, 'organization', '', 190); ?>
            <?php endif; ?>
          <?php endif; ?>
          <?php sfc_account_field('email', 'Email', 'email', true, 'username', '', 190); ?>
          <?php sfc_account_field('password', 'Password', 'password', true, $signup ? 'new-password' : 'current-password'); ?>
          <?php if ($signup): ?>
            <?php sfc_account_field('confirm_password', 'Confirm password', 'password', true, 'new-password'); ?>
            <label class="account-consent">
              <input type="checkbox" name="privacy_consent" value="1" required>
              <span><?= sfc_account_escape(sfc_privacy_consent_text()) ?> <a href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noopener noreferrer">Read RA 10173</a></span>
            </label>
          <?php endif; ?>
          <button class="account-submit" type="submit"><?= $signup ? ($role === 'seller' ? 'Submit registration' : 'Create account') : 'Sign in' ?></button>
        </form>
        <?php if ($role !== 'admin'): ?>
        <p class="account-switch"><?= $signup ? 'Already registered?' : 'New to LOCUS-SF?' ?> <a href="<?= sfc_account_escape(sfc_path($route . ($signup ? '' : '?mode=signup'))) ?>"><?= $signup ? 'Sign in' : 'Create account' ?></a></p>
        <?php else: ?>
        <p class="account-staff-note">Need access? Contact CICTO.</p>
        </div>
        <div id="adminOnboardSection" role="tabpanel" aria-labelledby="btnAdminOnboardTab" hidden>
          <form id="adminOnboardForm" class="account-form">
            <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
            <label class="account-field"><span>Department</span><select name="department" id="onboardDepartment" required><option value="" selected disabled>Select department</option><option value="CICTO">CICTO</option><option value="ASSESSOR">Assessors</option><option value="LEBDO">LEBDO</option></select></label>
            <label class="account-field"><span>Full name</span><input type="text" name="name" required minlength="2" maxlength="140" autocomplete="name"></label>
            <label class="account-field"><span>Official email</span><input type="email" name="email" required maxlength="190" autocomplete="username"></label>
            <label class="account-field"><span>Password</span><input type="password" name="password" required minlength="8" maxlength="255" autocomplete="new-password" aria-describedby="staffPasswordHint"><small class="account-field-hint" id="staffPasswordHint">At least 8 characters.</small></label>
            <label class="account-field"><span>Confirm password</span><input type="password" name="confirm_password" required minlength="8" maxlength="255" autocomplete="new-password"></label>
            <label class="account-field"><span>City passkey</span><input type="password" name="city_passkey" id="onboardPasskey" required maxlength="255" autocomplete="off" aria-describedby="staffPasskeyHint"><small class="account-field-hint" id="staffPasskeyHint">Issued by CICTO.</small></label>
            <p class="admin-onboard-status" id="adminOnboardStatus" role="status" hidden></p>
            <button class="account-submit" type="submit" id="adminOnboardSubmitBtn">Activate account</button>
          </form>
        </div>
        <nav class="account-other-access" aria-label="Other account types"><a href="<?= sfc_account_escape(sfc_path('/investor-login.php')) ?>">Investor</a><a href="<?= sfc_account_escape(sfc_path('/seller-login.php')) ?>">Broker</a></nav>
        <script defer src="<?= sfc_account_escape($context['assetBase']) ?>/js/admin-onboard.js<?= sfc_account_escape(sfc_asset_version('js/admin-onboard.js')) ?>"></script>
        <?php endif; ?>
      </section>
    </main>
    <?php sfc_render_footer($context);
}
