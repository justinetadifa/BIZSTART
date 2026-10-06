<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/account-view.php';
require_once __DIR__ . '/app/Support/profile.php';

sfc_require_any_role(['investor', 'seller', 'admin'], sfc_path('/investor-login.php'));
$context = sfc_web_context();
$user = sfc_current_user();
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        sfc_update_own_profile($user, $_POST, $_FILES['profile_photo'] ?? null);
        header('Location: ' . sfc_path('/profile.php?saved=1'));
        exit;
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    }
}
$broker = $user['role'] === 'seller' ? sfc_seller_profile_repository()->findOrInitializeByUser($user) : null;
$dashboard = match ($user['role']) { 'seller' => '/seller-dashboard.php', 'admin' => '/admin-dashboard.php', default => '/investor-dashboard.php' };
$needsConsent = ($user['privacyConsentVersion'] ?? null) !== sfc_privacy_consent_version();
sfc_render_head('Your profile | LOCUS-SF', $context, ['page' => 'profile', 'role' => $user['role']]);
?>
<link rel="stylesheet" href="<?= sfc_account_escape($context['assetBase']) ?>/css/account.css<?= sfc_account_escape(sfc_asset_version('css/account.css')) ?>">
<?php sfc_render_header($context); ?>
<main class="account-page">
  <section class="account-card account-card-wide" aria-labelledby="profileTitle">
    <div class="profile-header"><h1 id="profileTitle">Your profile</h1><a class="account-back" href="<?= sfc_account_escape(sfc_path($dashboard)) ?>">Back to dashboard</a></div>
    <?php if ($error !== ''): ?><p class="account-message is-error" role="alert"><?= sfc_account_escape($error) ?></p><?php endif; ?>
    <?php if (($_GET['saved'] ?? '') === '1'): ?><p class="account-message" role="status">Profile saved.</p><?php endif; ?>
    <div class="profile-avatar">
      <?php if (!empty($user['profileImageUrl'])): ?><img src="<?= sfc_account_escape(sfc_path('/' . $user['profileImageUrl'])) ?>" alt="Your profile photo" width="88" height="88"><?php else: ?><div class="profile-avatar-initial" aria-hidden="true"><?= sfc_account_escape(mb_strtoupper(mb_substr($user['name'], 0, 1))) ?></div><?php endif; ?>
      <div><strong><?= sfc_account_escape($user['name']) ?></strong><br><span><?= sfc_account_escape($user['email']) ?></span></div>
    </div>
    <?php if ($broker !== null): ?>
    <div class="profile-review">
      <strong>CICTO review</strong> <span class="profile-status <?= $broker['applicationStatus'] !== 'verified' ? 'is-pending' : '' ?>"><?= sfc_account_escape(ucwords(str_replace('_', ' ', $broker['applicationStatus']))) ?></span>
      <?php if (!empty($broker['reviewNotes'])): ?><p><?= nl2br(sfc_account_escape($broker['reviewNotes'])) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <form method="post" enctype="multipart/form-data" class="account-form account-form-grid">
      <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
      <?php sfc_account_field('name', 'Complete name', 'text', true, 'name', $user['name'], 140); ?>
      <?php sfc_account_field('phone', 'Contact number' . ($broker === null ? ' (optional)' : ''), 'tel', $broker !== null, 'tel', (string) ($broker['phone'] ?? $user['phone'] ?? ''), 30); ?>
      <?php sfc_account_field('address_line', 'Complete address' . ($broker === null ? ' (optional)' : ''), 'text', $broker !== null, 'street-address', (string) ($broker['addressLine'] ?? $user['address'] ?? '')); ?>
      <label class="account-field"><span>Profile photo</span><input type="file" name="profile_photo" accept="image/jpeg,image/png,image/webp"><span class="account-file-note">JPG, PNG or WEBP · up to 2 MB</span></label>
      <?php if (!empty($user['profileImageUrl'])): ?><label class="account-consent"><input type="checkbox" name="remove_photo" value="1"><span>Remove profile photo</span></label><?php endif; ?>
      <?php if ($broker !== null): ?>
      <div class="profile-section profile-full"><h2>Broker registration</h2><p class="account-intro">CICTO checks your registration with PRC. Changes require review.</p></div>
      <?php sfc_account_field('prc_registration_no', 'PRC registration number', 'text', false, '', (string) ($broker['prcRegistrationNo'] ?? ''), 20); ?>
      <?php sfc_account_field('prc_valid_until', 'PRC ID valid until', 'date', false, '', (string) ($broker['prcValidUntil'] ?? '')); ?>
      <?php sfc_account_field('city', 'City / municipality', 'text', true, 'address-level2', $broker['city'], 120); ?>
      <?php sfc_account_field('company_name', 'Agency (optional)', 'text', false, 'organization', (string) ($broker['companyName'] ?? ''), 190); ?>
      <?php endif; ?>
      <?php if ($needsConsent): ?><label class="account-consent"><input type="checkbox" name="privacy_consent" value="1" required><span><?= sfc_account_escape(sfc_privacy_consent_text()) ?> <a href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noopener noreferrer">Read RA 10173</a></span></label><?php endif; ?>
      <button type="submit" class="account-submit">Save profile</button>
      <?php if ($broker !== null && $broker['applicationStatus'] !== 'verified'): ?><button type="submit" name="action" value="submit_prc" class="account-submit">Submit PRC details for review</button><?php endif; ?>
    </form>
  </section>
</main>
<?php sfc_render_footer($context); ?>
