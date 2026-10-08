<?php
declare(strict_types=1);

function sfc_account_escape(mixed $value): string
{
    return htmlspecialchars(is_scalar($value) ? (string) $value : '', ENT_QUOTES, 'UTF-8');
}

function sfc_account_field(string $name, string $label, string $type = 'text', bool $required = true, string $autocomplete = '', string $default = '', int $maxLength = 255): void
{
    $prefix = $GLOBALS['sfc_account_form_prefix'] ?? 'login';
    $error = (string) ($GLOBALS['sfc_account_field_errors'][$name] ?? '');
    $id = $prefix . '-' . $name;
    $posted = $_POST[$name] ?? $default;
    $value = $type === 'password' || !is_scalar($posted) ? '' : (string) $posted;
    $newPassword = $type === 'password' && $name !== 'city_passkey' && $prefix !== 'login';
    $hint = $newPassword && $name === 'password' ? 'At least 8 characters.' : ($name === 'city_passkey' ? 'Use the activation code issued by CICTO.' : '');
    ?>
    <label class="account-field <?= $name === 'company_name' ? 'account-field-full' : '' ?>" for="<?= sfc_account_escape($id) ?>">
      <span><?= sfc_account_escape($label) ?></span>
      <input id="<?= sfc_account_escape($id) ?>" type="<?= sfc_account_escape($type) ?>" name="<?= sfc_account_escape($name) ?>" value="<?= sfc_account_escape($value) ?>" maxlength="<?= $maxLength ?>" <?= $required ? 'required' : '' ?> <?= $autocomplete !== '' ? 'autocomplete="' . sfc_account_escape($autocomplete) . '"' : '' ?> <?= $newPassword ? 'minlength="8"' : '' ?> <?= $type === 'tel' ? 'inputmode="tel"' : '' ?> <?= $name === 'prc_registration_no' ? 'inputmode="numeric" pattern="[0-9]{1,20}"' : '' ?> <?= $name === 'prc_valid_until' ? 'min="' . (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d') . '"' : '' ?> aria-invalid="<?= $error !== '' ? 'true' : 'false' ?>" aria-describedby="<?= sfc_account_escape($id) ?>-error<?= $hint !== '' ? ' ' . sfc_account_escape($id) . '-hint' : '' ?>">
      <?php if ($hint !== ''): ?><small class="account-field-hint" id="<?= sfc_account_escape($id) ?>-hint"><?= sfc_account_escape($hint) ?></small><?php endif; ?>
      <small class="account-field-error" id="<?= sfc_account_escape($id) ?>-error" <?= $error === '' ? 'hidden' : '' ?>><?= sfc_account_escape($error) ?></small>
    </label>
    <?php
}

function sfc_account_consent(string $name, string $label): void
{
    $id = ($GLOBALS['sfc_account_form_prefix'] ?? 'signup') . '-' . $name;
    $error = (string) ($GLOBALS['sfc_account_field_errors'][$name] ?? '');
    $checked = is_scalar($_POST[$name] ?? null) && filter_var($_POST[$name], FILTER_VALIDATE_BOOLEAN);
    ?>
    <div class="account-consent-row">
      <label class="account-consent" for="<?= sfc_account_escape($id) ?>">
        <input id="<?= sfc_account_escape($id) ?>" type="checkbox" name="<?= sfc_account_escape($name) ?>" value="1" required <?= $checked ? 'checked' : '' ?> aria-invalid="<?= $error !== '' ? 'true' : 'false' ?>" aria-describedby="<?= sfc_account_escape($id) ?>-error">
        <span><?= sfc_account_escape($label) ?><?php if ($name === 'privacy_consent'): ?> <a href="<?= sfc_account_escape(sfc_path('/privacy.php')) ?>" target="_blank" rel="noopener">Read Privacy Notice<span class="account-sr-only"> (opens in a new tab)</span></a><?php endif; ?></span>
      </label>
      <small class="account-field-error" id="<?= sfc_account_escape($id) ?>-error" <?= $error === '' ? 'hidden' : '' ?>><?= sfc_account_escape($error) ?></small>
    </div>
    <?php
}

function sfc_account_submit(string $label, string $loading): void
{
    ?><button class="account-submit" type="submit" data-loading-label="<?= sfc_account_escape($loading) ?>"><span data-submit-label><?= sfc_account_escape($label) ?></span><svg class="account-submit-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="account-submit-spinner" aria-hidden="true"></span></button><?php
}

function sfc_account_assets(array $context): void
{
    foreach (['account', 'auth-interface'] as $style) {
        ?><link rel="stylesheet" href="<?= sfc_account_escape($context['assetBase']) ?>/css/<?= $style ?>.css<?= sfc_account_escape(sfc_asset_version('css/' . $style . '.css')) ?>"><?php
    }
}

function sfc_account_art(array $context): string
{
    $file = is_file(dirname(__DIR__, 2) . '/assets/images/mapgraphicstyle.png') ? 'mapgraphicstyle.png' : 'locusherosec.png';
    return $context['assetBase'] . '/images/' . $file;
}

function sfc_render_account_page(array $context, string $role, string $mode, string $error = '', array $fieldErrors = []): void
{
    $signup = $mode === 'signup' && $role !== 'admin';
    $activation = $role === 'admin' && $mode === 'activate';
    $label = match ($role) { 'seller' => 'Broker', 'admin' => 'City staff', default => 'Investor' };
    $route = '/' . ($role === 'seller' ? 'seller' : ($role === 'admin' ? 'admin' : 'investor')) . '-login.php';
    $GLOBALS['sfc_account_field_errors'] = $fieldErrors;
    sfc_render_head($label . ($signup ? ' registration' : ' sign in') . ' | LOCUS-SF', $context, ['page' => $role . '-login', 'role' => $role]);
    sfc_account_assets($context);
    sfc_render_header($context);
    ?>
    <main class="account-page account-auth" data-account-role="<?= sfc_account_escape($role) ?>" style="--account-map: url('<?= sfc_account_escape(sfc_account_art($context)) ?>')">
      <div class="account-shell <?= $signup || $activation ? 'is-registering' : '' ?>">
        <aside class="account-scene" aria-label="LOCUS-SF, San Fernando City">
          <div class="account-scene-brand"><img src="<?= sfc_account_escape($context['assetBase']) ?>/images/logoLocusRedBlue.png" width="45" height="36" alt=""><span>LOCUS-SF</span></div>
          <div class="account-scene-copy">
            <p class="account-scene-kicker">SAN FERNANDO CITY, LA UNION</p>
            <h2><?= match ($role) { 'seller' => 'Local expertise.<br> New possibilities.', 'admin' => 'One city.<br> A shared vision.', default => 'Your next move<br> starts here.' } ?></h2>
            <p><?= match ($role) { 'seller' => 'Connect the right spaces with the people who see their potential.', 'admin' => 'Supporting informed decisions for the city we serve.', default => 'Discover spaces, explore opportunities, and invest in the city.' } ?></p>
          </div>
          <div class="account-scene-foot"><span class="account-scene-dot" aria-hidden="true"></span> A clearer view of opportunity.</div>
        </aside>
        <section class="account-card <?= $signup ? 'account-card-wide' : '' ?> <?= $role === 'admin' ? 'account-card-staff' : '' ?>" aria-labelledby="accountTitle">
          <nav class="account-roles" aria-label="Account type">
            <?php foreach (['investor' => 'Investor', 'seller' => 'Broker', 'admin' => 'City staff'] as $key => $title): ?>
            <a href="<?= sfc_account_escape(sfc_path('/' . $key . '-login.php' . ($signup && $key !== 'admin' ? '?mode=signup' : ''))) ?>" <?= $role === $key ? 'aria-current="page"' : '' ?>><?= $title ?></a>
            <?php endforeach; ?>
          </nav>
          <p class="account-eyebrow"><?= $role === 'admin' ? 'CITY WORKSPACE' : ($signup ? 'GET STARTED' : 'YOUR LOCUS-SF ACCOUNT') ?></p>
          <h1 id="accountTitle"><?= $role === 'admin' ? 'City staff access' : ($signup ? ($role === 'seller' ? 'Broker registration' : 'Create your account') : 'Welcome back') ?></h1>
          <p class="account-intro"><?= match (true) { $role === 'admin' => 'CICTO · City Assessor · LEBDO', $role === 'seller' && $signup => 'Submit your PRC credentials for CICTO verification.', $role === 'seller' => 'Sign in to your listings and verification status.', $signup => 'A few details to make your next move.', default => 'Sign in to explore your next opportunity.' } ?></p>
          <?php if (($_GET['reason'] ?? '') === 'timeout'): ?><p class="account-message" role="status">Your session expired. Sign in again.</p><?php endif; ?>
          <?php if ($error !== ''): ?><p class="account-message is-error" role="alert"><?= sfc_account_escape($error) ?></p><?php endif; ?>
          <p class="account-validation-summary account-sr-only" data-validation-summary role="alert"><?= $fieldErrors !== [] ? 'Please check the highlighted fields.' : '' ?></p>
          <?php if ($role === 'admin'): ?>
          <div class="admin-tab-switcher" role="tablist" aria-label="City staff access">
            <button type="button" class="admin-tab-btn <?= !$activation ? 'is-active' : '' ?>" id="btnAdminSignInTab" role="tab" aria-selected="<?= !$activation ? 'true' : 'false' ?>" aria-controls="adminSignInSection" <?= $activation ? 'tabindex="-1"' : '' ?>>Sign in</button>
            <button type="button" class="admin-tab-btn <?= $activation ? 'is-active' : '' ?>" id="btnAdminOnboardTab" role="tab" aria-selected="<?= $activation ? 'true' : 'false' ?>" aria-controls="adminOnboardSection" <?= !$activation ? 'tabindex="-1"' : '' ?>>Activate account</button>
          </div>
          <noscript><p class="account-switch"><a href="<?= sfc_account_escape(sfc_path($route . ($activation ? '' : '?mode=activate'))) ?>"><?= $activation ? 'Sign in' : 'Activate account' ?></a></p></noscript>
          <div id="adminSignInSection" role="tabpanel" aria-labelledby="btnAdminSignInTab" <?= $activation ? 'hidden' : '' ?>>
          <?php endif; ?>
          <?php $GLOBALS['sfc_account_form_prefix'] = $signup ? 'signup' : 'login'; if ($activation) { $GLOBALS['sfc_account_field_errors'] = []; } ?>
          <form method="post" action="<?= sfc_account_escape(sfc_path($route)) ?>" class="account-form <?= $signup ? 'account-form-grid' : '' ?>" data-account-form novalidate>
            <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
            <input type="hidden" name="mode" value="<?= $signup ? 'signup' : 'login' ?>">
            <?php if ($signup): ?>
              <?php sfc_account_field('first_name', 'First name', 'text', true, 'given-name', '', 70); ?>
              <?php sfc_account_field('last_name', 'Last name', 'text', true, 'family-name', '', 70); ?>
              <?php sfc_account_field('email', 'Email', 'email', true, 'email', '', 190); ?>
              <?php sfc_account_field('phone', $role === 'seller' ? 'Contact number' : 'Contact number (optional)', 'tel', $role === 'seller', 'tel', '', 30); ?>
              <?php if ($role === 'seller'): ?>
                <input type="hidden" name="seller_type" value="broker">
                <?php sfc_account_field('address_line', 'Complete address', 'text', true, 'street-address'); ?>
                <?php sfc_account_field('city', 'City / Municipality', 'text', true, 'address-level2', '', 120); ?>
                <?php sfc_account_field('prc_registration_no', 'PRC Registration No.', 'text', true, '', '', 20); ?>
                <?php sfc_account_field('prc_valid_until', 'PRC ID valid until', 'date'); ?>
                <?php sfc_account_field('company_name', 'Agency / Firm (optional)', 'text', false, 'organization', '', 190); ?>
              <?php else: ?>
                <?php sfc_account_field('profession', 'Profession (optional)', 'text', false, 'organization-title', '', 120); ?>
                <?php sfc_account_field('city', 'City / Municipality (optional)', 'text', false, 'address-level2', '', 120); ?>
              <?php endif; ?>
            <?php else: sfc_account_field('email', 'Email', 'email', true, 'username', '', 190); endif; ?>
            <?php sfc_account_field('password', 'Password', 'password', true, $signup ? 'new-password' : 'current-password'); ?>
            <?php if ($signup): ?>
              <?php sfc_account_field('confirm_password', 'Confirm password', 'password', true, 'new-password'); ?>
              <div class="account-consents">
                <?php if ($role === 'investor'): sfc_account_consent('adult_confirmation', 'I confirm that I am 18 years old or above.'); endif; ?>
                <?php sfc_account_consent('privacy_consent', 'I agree to the Privacy Notice.'); ?>
              </div>
            <?php endif; ?>
            <?php sfc_account_submit($signup ? ($role === 'seller' ? 'Submit for verification' : 'Create account') : 'Sign in', $signup ? ($role === 'seller' ? 'Submitting application…' : 'Creating your account…') : 'Signing in…'); ?>
          </form>
          <?php if ($role !== 'admin'): ?>
          <p class="account-switch"><?= $signup ? 'Already have an account?' : 'New to LOCUS-SF?' ?> <a href="<?= sfc_account_escape(sfc_path($route . ($signup ? '' : '?mode=signup'))) ?>"><?= $signup ? 'Sign in' : 'Create account' ?></a></p>
          <?php else: ?>
          <p class="account-staff-note">Need an activation code? Contact CICTO.</p>
          </div>
          <div id="adminOnboardSection" role="tabpanel" aria-labelledby="btnAdminOnboardTab" <?= !$activation ? 'hidden' : '' ?>>
            <?php $GLOBALS['sfc_account_form_prefix'] = 'activation'; $GLOBALS['sfc_account_field_errors'] = $activation ? $fieldErrors : []; $departmentError = (string) ($GLOBALS['sfc_account_field_errors']['department'] ?? ''); ?>
            <form method="post" action="<?= sfc_account_escape(sfc_path($route)) ?>" id="adminOnboardForm" class="account-form account-form-grid" data-account-form novalidate>
              <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
              <input type="hidden" name="mode" value="activate">
              <label class="account-field account-field-full" for="activation-department"><span>Department</span><select name="department" id="activation-department" required aria-invalid="<?= $departmentError !== '' ? 'true' : 'false' ?>" aria-describedby="activation-department-error"><option value="">Select department</option><?php foreach (['CICTO' => 'CICTO', 'ASSESSOR' => 'City Assessor', 'LEBDO' => 'LEBDO'] as $value => $title): ?><option value="<?= $value ?>" <?= ($_POST['department'] ?? '') === $value ? 'selected' : '' ?>><?= $title ?></option><?php endforeach; ?></select><small class="account-field-error" id="activation-department-error" <?= $departmentError === '' ? 'hidden' : '' ?>><?= sfc_account_escape($departmentError) ?></small></label>
              <?php sfc_account_field('first_name', 'First name', 'text', true, 'given-name', '', 70); ?>
              <?php sfc_account_field('last_name', 'Last name', 'text', true, 'family-name', '', 70); ?>
              <div class="account-field-full"><?php sfc_account_field('email', 'Official email', 'email', true, 'email', '', 190); ?></div>
              <?php sfc_account_field('password', 'Password', 'password', true, 'new-password'); ?>
              <?php sfc_account_field('confirm_password', 'Confirm password', 'password', true, 'new-password'); ?>
              <div class="account-field-full"><?php sfc_account_field('city_passkey', 'City passkey / activation code', 'password', true, 'off'); ?></div>
              <div class="account-consents"><?php sfc_account_consent('privacy_consent', 'I agree to the Privacy Notice.'); ?></div>
              <?php sfc_account_submit('Activate account', 'Activating your account…'); ?>
            </form>
          </div>
          <?php endif; ?>
        </section>
      </div>
    </main>
    <script defer src="<?= sfc_account_escape($context['assetBase']) ?>/js/auth-interface.js<?= sfc_account_escape(sfc_asset_version('js/auth-interface.js')) ?>"></script>
    <?php sfc_render_footer($context);
}
