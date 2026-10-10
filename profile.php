<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/account-view.php';
require_once __DIR__ . '/app/Support/profile.php';

sfc_require_any_role(['investor', 'seller', 'admin'], sfc_path('/investor-login.php'));
$context = sfc_web_context();
$user = sfc_current_user();
$error = '';
$fieldErrors = [];
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        sfc_update_own_profile($user, $_POST, $_FILES['profile_photo'] ?? null, $_FILES);
        header('Location: ' . sfc_path('/profile.php?saved=1'));
        exit;
    } catch (SfcAuthValidationException $exception) {
        $fieldErrors = $exception->errors();
        $error = $exception->getMessage();
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    }
}
$broker = $user['role'] === 'seller' ? sfc_seller_profile_repository()->findOrInitializeByUser($user) : null;
$dashboard = match ($user['role']) { 'seller' => '/seller-dashboard.php', 'admin' => '/admin-dashboard.php', default => '/investor-dashboard.php' };
$accountLabel = match ($user['role']) { 'seller' => 'Broker account', 'admin' => 'City staff account', default => 'Investor account' };
$roleClass = match ($user['role']) { 'seller' => 'is-broker', 'admin' => 'is-staff', default => 'is-investor' };
$department = $user['role'] === 'admin' ? sfc_admin_department($user) : null;
$needsConsent = ($user['privacyConsentVersion'] ?? null) !== sfc_privacy_consent_version();
$photoUrl = !empty($user['profileImageUrl']) ? sfc_path('/' . ltrim($user['profileImageUrl'], '/')) : '';
$initial = mb_strtoupper(mb_substr($user['name'], 0, 1));
$fieldValue = static fn (string $name, mixed $default): string => sfc_account_escape($_POST[$name] ?? $default ?? '');
$inputClass = 'profile-input-field';
$buttonClass = 'tw-inline-flex tw-min-h-[42px] tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-[#d8dee8] tw-bg-white tw-px-4 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-[#11224D] hover:tw-bg-[#F8F9FA] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#11224D]';
$renderField = static function (string $name, string $label, string $type, mixed $default, bool $required = false, string $autocomplete = '', int $maxLength = 255) use ($fieldValue): void {
    ?>
    <label class="profile-field-label">
      <div class="label-text-row">
        <span><?= sfc_account_escape($label) ?><?php if ($required): ?> <span style="color: #9E1B22;">*</span><?php endif; ?></span>
        <?php if (!$required && in_array($name, ['phone', 'company_name'], true)): ?>
        <span class="optional-tag">&middot; Optional</span>
        <?php endif; ?>
      </div>
      <div class="profile-input-wrapper">
        <input class="profile-input-field" type="<?= sfc_account_escape($type) ?>" name="<?= sfc_account_escape($name) ?>" value="<?= $fieldValue($name, $default) ?>" maxlength="<?= $maxLength ?>" <?= $required ? 'required' : '' ?> <?= $autocomplete !== '' ? 'autocomplete="' . sfc_account_escape($autocomplete) . '"' : '' ?> <?= $type === 'tel' ? 'inputmode="tel"' : '' ?>>
      </div>
    </label>
    <?php
};
sfc_render_head('Your profile | LOCUS-SF', $context, ['page' => 'profile', 'role' => $user['role']]);
?>
<?php sfc_render_header($context); ?>
<link rel="stylesheet" href="<?= sfc_account_escape($context['assetBase']) ?>/css/profile.css<?= sfc_account_escape(sfc_asset_version('css/profile.css')) ?>">
<?php if ($broker !== null): ?><link rel="stylesheet" href="<?= sfc_account_escape($context['assetBase']) ?>/css/broker-verification.css<?= sfc_account_escape(sfc_asset_version('css/broker-verification.css')) ?>"><?php endif; ?>

<header class="profile-hero-banner">
  <div class="profile-hero-inner">
    <div class="profile-hero-topbar">
      <div class="profile-civic-badge-group">
        <span class="profile-civic-seal-pill">
          <svg class="profile-seal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          San Fernando Civic Portal
        </span>
        <span class="profile-role-pill <?= $roleClass ?>">
          <span class="pulse-indicator" aria-hidden="true"></span>
          <?= sfc_account_escape($accountLabel) ?>
        </span>
      </div>
      <a class="profile-back-link" href="<?= sfc_account_escape(sfc_path($dashboard)) ?>"><span aria-hidden="true">&larr;</span> Back to dashboard</a>
    </div>
    <div class="profile-hero-title-row">
      <h1 id="profileTitle">Your profile</h1>
      <p class="profile-hero-subtitle">Official administrative profile, verified credentials, and directory contacts for LOCUS-SF.</p>
    </div>
    <div class="profile-hero-chips">
      <?php if ($department !== null): ?>
      <span class="profile-hero-chip is-gold">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M11 11h2M11 15h2M16 11h2M16 15h2M9 3h6v4H9z"/></svg>
        City Department: <?= sfc_account_escape($department) ?>
      </span>
      <?php endif; ?>
      <span class="profile-hero-chip is-verified">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        Verified Active Session
      </span>
      <span class="profile-hero-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        DPA RA 10173 Protected
      </span>
    </div>
  </div>
</header>

<main class="profile-grand-page">
  <div class="profile-main-container">
    <?php if ($error !== ''): ?>
    <div class="profile-flash-message is-error" role="alert">
      <svg class="tw-h-5 tw-w-5 tw-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span><?= sfc_account_escape($error) ?></span>
    </div>
    <?php endif; ?>
    <?php if (($_GET['saved'] ?? '') === '1'): ?>
    <div class="profile-flash-message is-success" role="status">
      <svg class="tw-h-5 tw-w-5 tw-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>Your profile has been saved successfully.</span>
    </div>
    <?php endif; ?>

    <form method="post" enctype="multipart/form-data" id="profileForm" class="profile-grand-form" aria-labelledby="profileTitle">
      <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
      <aside class="profile-identity-aside" aria-label="Profile photo and account">
        <div class="profile-avatar-wrapper">
          <div class="profile-avatar-frame">
            <img id="profileAvatarPhoto" <?= $photoUrl !== '' ? 'src="' . sfc_account_escape($photoUrl) . '"' : '' ?> alt="Your profile photo" width="124" height="124" class="profile-avatar-img" <?= $photoUrl === '' ? 'hidden' : '' ?>>
            <span id="profileAvatarInitial" class="profile-avatar-initial" aria-hidden="true" <?= $photoUrl !== '' ? 'hidden' : '' ?>><?= sfc_account_escape($initial) ?></span>
          </div>
          <label for="profilePhotoInput" class="profile-avatar-camera-badge" title="Change photo" aria-label="Upload new photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 5h8l1.5 3H21v12H3V8h3.5L8 5Z" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.5"/></svg>
          </label>
        </div>
        <h2 class="profile-user-name"><?= sfc_account_escape($user['name']) ?></h2>
        <span class="profile-user-email">
          <svg class="tw-h-3.5 tw-w-3.5 tw-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <?= sfc_account_escape($user['email']) ?>
        </span>
        <?php if ($user['role'] === 'admin'): ?>
        <span class="profile-status-badge badge-staff">
          🏛️ <?= sfc_account_escape($department ?: 'CICTO') ?> · Staff Executive
        </span>
        <?php elseif ($broker !== null): ?>
        <span class="profile-status-badge <?= $broker['applicationStatus'] === 'verified' ? 'badge-verified' : 'badge-pending' ?>">
          <?= $broker['applicationStatus'] === 'verified' ? '✓ PRC Verified Broker' : sfc_account_escape(ucwords(str_replace('_', ' ', $broker['applicationStatus']))) ?>
        </span>
        <?php else: ?>
        <span class="profile-status-badge badge-verified">
          ✓ Verified Investor Account
        </span>
        <?php endif; ?>

        <div class="profile-photo-action-box">
          <input id="profilePhotoInput" class="tw-peer tw-sr-only" type="file" name="profile_photo" accept="image/jpeg,image/png,image/webp" aria-describedby="profilePhotoHint profilePhotoStatus">
          <label for="profilePhotoInput" class="profile-change-photo-btn">
            <svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 5h8l1.5 3H21v12H3V8h3.5L8 5Z" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.5"/></svg>
            Change photo
          </label>
          <p id="profilePhotoHint" class="profile-photo-hint">JPG, PNG or WEBP.<br>Crop and preview before saving.</p>
          <noscript><p class="tw-mt-2 tw-text-xs tw-text-[#697284]">Up to 2 MB and 4 megapixels.</p></noscript>
          <p id="profilePhotoStatus" class="profile-photo-status" role="status" aria-live="polite"></p>
          <button id="profilePhotoUndo" type="button" class="profile-undo-btn" hidden>Undo photo change</button>
        </div>

        <?php if ($photoUrl !== ''): ?>
        <label class="profile-remove-photo-card" for="profilePhotoRemove">
          <input id="profilePhotoRemove" type="checkbox" name="remove_photo" value="1" <?= !empty($_POST['remove_photo']) ? 'checked' : '' ?>>
          <span>Remove current photo</span>
        </label>
        <?php endif; ?>

        <div class="profile-trust-card">
          <div class="profile-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Session Guard Active</span>
          </div>
          <div class="profile-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>DPA RA 10173 Encrypted</span>
          </div>
          <div class="profile-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Official Directory Listing</span>
          </div>
        </div>
      </aside>

      <div class="profile-details-content">
        <div class="profile-section-header">
          <div class="profile-section-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="profile-section-title-wrap">
            <h2>Personal details</h2>
            <p>Use the name and contact details you want us to use for official city documents and notifications.</p>
          </div>
        </div>

        <div class="profile-fields-grid">
          <?php $renderField('name', 'Complete name', 'text', $user['name'], true, 'name', 140); ?>
          <?php $renderField('phone', 'Contact number', 'tel', $broker['phone'] ?? $user['phone'] ?? '', $broker !== null, 'tel', 30); ?>
          <label class="profile-field-label is-full">
            <div class="label-text-row">
              <span>Complete address<?php if ($broker !== null): ?> <span style="color: #9E1B22;">*</span><?php endif; ?></span>
              <?php if ($broker === null): ?><span class="optional-tag">&middot; Optional</span><?php endif; ?>
            </div>
            <textarea class="profile-textarea-field" name="address_line" rows="3" maxlength="255" autocomplete="street-address" placeholder="Unit, building, street, and barangay" <?= $broker !== null ? 'required' : '' ?>><?= $fieldValue('address_line', $broker['addressLine'] ?? $user['address'] ?? '') ?></textarea>
          </label>
        </div>

        <?php if ($user['role'] === 'admin'): ?>
        <div class="profile-department-card">
          <div class="profile-dept-info-left">
            <div class="profile-dept-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M11 11h2M11 15h2M16 11h2M16 15h2M9 3h6v4H9z"/></svg>
            </div>
            <div class="profile-dept-titles">
              <strong><?= sfc_account_escape($department ?: 'CICTO') ?> Administrative Department</strong>
              <span>City of San Fernando · Department Operations &amp; Listing Management</span>
            </div>
          </div>
          <span class="profile-civic-seal-pill" style="color: #0f172a; background: #ffffff; border-color: #cbd5e1;">Authorized Personnel</span>
        </div>
        <?php endif; ?>

        <?php if ($broker !== null): ?>
        <details id="profileRegistration" class="tw-mt-7 tw-border-0 tw-border-t tw-border-solid tw-border-[#e5e8ee] tw-pt-5" <?= $error !== '' || $broker['applicationStatus'] !== 'verified' || empty($broker['frontDocument']) || empty($broker['backDocument']) || empty($user['emailVerifiedAt']) ? 'open' : '' ?>>
          <summary class="tw-cursor-pointer tw-text-sm tw-font-semibold">Broker registration <span class="tw-ml-2 tw-text-xs tw-font-normal tw-text-[#697284]">PRC details</span></summary>
          <p class="tw-mb-5 tw-mt-3 tw-text-xs tw-leading-relaxed tw-text-[#697284]">Authorized CAO or LEBDO reviewers check your registration and both PRC ID images. Replacing credentials sends your application for another review.</p>
          <div class="broker-email-status">
            <strong>Email ownership: <?= !empty($user['emailVerifiedAt']) || !empty($user['emailVerified']) ? 'Verified' : 'Not yet verified' ?></strong>
            <p><?= !empty($user['emailVerifiedAt']) || !empty($user['emailVerified']) ? 'Your email is verified. Broker application approval is a separate review.' : 'Open the verification link sent to your email. Listing submission requires verified email and an approved application.' ?></p>
            <p data-email-delivery-status role="status" aria-live="polite">Checking the latest verification email delivery status…</p>
            <?php if (empty($user['emailVerifiedAt']) && empty($user['emailVerified'])): ?><button type="button" data-resend-verification>Resend verification email</button><?php endif; ?>
          </div>
          <?php if (!empty($broker['reviewNotes'])): ?><div class="tw-mb-5 tw-rounded-lg tw-border tw-border-solid tw-border-[#e2e7ee] tw-bg-[#F8F9FA] tw-px-3.5 tw-py-3 tw-text-xs tw-leading-relaxed"><strong class="tw-font-semibold">Application review</strong><p class="tw-mb-0 tw-mt-1 tw-text-[#697284]"><?= nl2br(sfc_account_escape($broker['reviewNotes'])) ?></p></div><?php endif; ?>
          <div class="tw-grid tw-gap-5 sm:tw-grid-cols-2">
            <?php $renderField('prc_registration_no', 'PRC registration number', 'text', $broker['prcRegistrationNo'] ?? '', false, '', 20); ?>
            <?php $renderField('prc_valid_until', 'PRC ID valid until', 'date', $broker['prcValidUntil'] ?? ''); ?>
            <?php $renderField('city', 'City / municipality', 'text', $broker['city'], true, 'address-level2', 120); ?>
            <?php $renderField('company_name', 'Agency', 'text', $broker['companyName'] ?? '', false, 'organization', 190); ?>
          </div>
          <div class="broker-id-grid tw-mt-5">
            <?php $GLOBALS['sfc_account_form_prefix'] = 'profile'; $GLOBALS['sfc_account_field_errors'] = $fieldErrors; sfc_broker_document_field('front', $broker['frontDocument'] ?? null, (int) $user['id'], false); ?>
            <?php sfc_broker_document_field('back', $broker['backDocument'] ?? null, (int) $user['id'], false); ?>
          </div>
          <p class="tw-mt-3 tw-text-xs tw-leading-relaxed tw-text-[#697284]">Both PRC ID images are required to submit your application. They are available only to you and authorized reviewers.</p>
          <?php if (!empty($broker['reviewHistory'])): ?>
          <details class="broker-review-history tw-mt-4"><summary>Application review history</summary><ol>
            <?php foreach ($broker['reviewHistory'] as $review): ?><li><strong><?= sfc_account_escape(ucwords(str_replace('_', ' ', $review['decision'] ?? ''))) ?></strong> · <?= sfc_account_escape($review['createdAt'] ?? '') ?><br><?= sfc_account_escape($review['reviewerName'] ?? 'Authorized reviewer') ?>: <?= sfc_account_escape($review['reason'] ?? '') ?></li><?php endforeach; ?>
          </ol></details>
          <?php endif; ?>
        </details>
        <?php endif; ?>

        <?php if ($needsConsent): ?>
        <label class="profile-consent-card">
          <input type="checkbox" name="privacy_consent" value="1" required <?= !empty($_POST['privacy_consent']) ? 'checked' : '' ?>>
          <span><?= sfc_account_escape(sfc_privacy_consent_text()) ?> <a class="tw-text-[#9E1B22] tw-underline tw-underline-offset-2" href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noopener noreferrer">Read RA 10173</a></span>
        </label>
        <!-- Sound & Feedback Preferences Card -->
        <div class="tw-mt-7 tw-rounded-2xl tw-border tw-border-solid tw-border-[#dfe3e9] tw-bg-[#F8F9FA] tw-p-5 sm:tw-p-6">
          <div class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-mb-4">
            <div class="tw-flex tw-items-center tw-gap-3">
              <div class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-xl tw-bg-white tw-border tw-border-solid tw-border-[#dfe3e9] tw-text-[#11224d]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              </div>
              <div>
                <h3 class="tw-m-0 tw-text-base tw-font-bold tw-text-[#11224d]">Interface audio</h3>
                <p class="tw-m-0 tw-text-xs tw-text-[#64748b]">iOS-inspired feedback for actions, selections, and confirmations</p>
              </div>
            </div>
            <button type="button" class="locus-sound-preview-btn" onclick="window.LocusSound?.preview()">Preview sound</button>
          </div>
          <div class="tw-grid tw-gap-3 sm:tw-grid-cols-2">
            <label class="tw-flex tw-items-center tw-justify-between tw-rounded-xl tw-bg-white tw-p-3.5 tw-border tw-border-solid tw-border-[#e2e8f0] tw-cursor-pointer">
              <span class="tw-text-xs tw-font-semibold tw-text-[#0f172a]">Interface sounds</span>
              <span class="locus-ios-switch">
                <input type="checkbox" id="profileSoundToggle" role="switch" onchange="window.LocusSound?.setEnabled(this.checked)">
                <span class="locus-ios-slider"></span>
              </span>
            </label>
            <label class="tw-flex tw-items-center tw-justify-between tw-rounded-xl tw-bg-white tw-p-3.5 tw-border tw-border-solid tw-border-[#e2e8f0] tw-cursor-pointer">
              <span class="tw-text-xs tw-font-semibold tw-text-[#0f172a]">Scroll settling feedback</span>
              <span class="locus-ios-switch">
                <input type="checkbox" id="profileSoundScrollToggle" role="switch" onchange="window.LocusSound?.setScrollEnabled(this.checked)">
                <span class="locus-ios-slider"></span>
              </span>
            </label>
          </div>
        </div>

        <div class="profile-action-footer">
          <p class="profile-audit-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            <span>Changes apply immediately across official directories and signatures.</span>
          </p>
          <button type="submit" class="profile-save-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Save profile</span>
          </button>
        </div>
        <?php if ($broker !== null && ($broker['applicationStatus'] !== 'verified' || empty($broker['frontDocument']) || empty($broker['backDocument']))): ?><button type="submit" name="action" value="submit_prc" class="<?= $buttonClass ?> tw-mt-4 tw-w-full">Submit PRC details for review</button><?php endif; ?>
      </div>
    </form>
  </div>
</main>

<dialog id="profilePhotoDialog" aria-labelledby="profilePhotoDialogTitle" aria-describedby="profilePhotoDialogHint" class="tw-m-auto tw-w-[calc(100%-32px)] tw-max-w-[490px] tw-max-h-[calc(100dvh-32px)] tw-overflow-y-auto tw-rounded-2xl tw-border tw-border-solid tw-border-[#dfe3e9] tw-bg-white tw-p-5 tw-font-sans tw-text-[#11224D] tw-shadow-xl backdrop:tw-bg-[#11224D]/50 sm:tw-p-7 [@media(max-height:500px)_and_(min-width:480px)]:tw-max-w-[700px] [@media(max-height:500px)_and_(min-width:480px)]:tw-p-5">
  <div class="tw-mb-4 tw-flex tw-items-start tw-justify-between tw-gap-4 [@media(max-height:500px)_and_(min-width:480px)]:tw-mb-3">
    <div><h2 id="profilePhotoDialogTitle" class="tw-mb-1 tw-text-xl tw-font-semibold">Adjust your photo</h2><p id="profilePhotoDialogHint" class="tw-mb-0 tw-text-xs tw-text-[#697284] [@media(max-height:500px)_and_(min-width:480px)]:tw-hidden">Drag to position. Use the slider to zoom.</p></div>
    <button id="profilePhotoClose" type="button" class="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-[#F8F9FA] tw-text-xl tw-text-[#697284]" aria-label="Cancel photo crop">&times;</button>
  </div>
  <div class="tw-grid tw-grid-cols-1 tw-gap-x-5 [@media(max-height:500px)_and_(min-width:480px)]:tw-grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [@media(max-height:500px)_and_(min-width:480px)]:tw-items-center">
    <div class="tw-relative tw-mx-auto tw-aspect-square tw-w-full tw-max-w-[clamp(120px,calc(100dvh-380px),320px)] tw-overflow-hidden tw-rounded-xl tw-bg-[#edf0f4] [@media(max-height:500px)_and_(min-width:480px)]:tw-max-w-[min(220px,calc(100dvh-130px))]">
      <canvas id="profileCropCanvas" width="640" height="640" tabindex="0" role="img" aria-label="Photo crop. Drag to move, or use arrow keys. Hold Shift for larger steps." aria-describedby="profileCropKeyboardHint" class="tw-block tw-h-full tw-w-full tw-cursor-grab tw-touch-none focus-visible:tw-outline-offset-[-4px]"></canvas>
      <div class="tw-pointer-events-none tw-absolute tw-inset-0 tw-rounded-full tw-border-2 tw-border-solid tw-border-white/80 tw-shadow-[0_0_0_80px_rgba(17,34,77,0.22)]" aria-hidden="true"></div>
    </div>
    <div class="tw-min-w-0">
      <p id="profileCropKeyboardHint" class="tw-mb-0 tw-mt-2 tw-text-center tw-text-[11px] tw-text-[#697284] [@media(max-height:500px)_and_(min-width:480px)]:tw-mt-0 [@media(max-height:500px)_and_(min-width:480px)]:tw-text-left">Arrow keys move. Shift moves faster.</p>
      <div class="tw-mt-5 tw-flex tw-items-center tw-gap-4 [@media(max-height:500px)_and_(min-width:480px)]:tw-mt-3">
        <div class="tw-min-w-0 tw-flex-1"><label for="profileCropZoom" class="tw-flex tw-items-center tw-justify-between tw-text-xs tw-font-semibold"><span>Zoom</span><output id="profileCropZoomValue" for="profileCropZoom" class="tw-font-normal tw-text-[#697284]">100%</output></label><input id="profileCropZoom" class="tw-mt-2 tw-h-6 tw-min-h-0 tw-w-full tw-border-0 tw-p-0 tw-accent-[#11224D]" type="range" min="1" max="3" step="0.01" value="1"></div>
        <canvas id="profileCropPreview" width="80" height="80" class="tw-h-14 tw-w-14 tw-shrink-0 tw-rounded-full tw-ring-2 tw-ring-[#dfe3e9]" role="img" aria-label="Preview of your profile photo"></canvas>
      </div>
      <div class="tw-mt-3 tw-flex tw-justify-center [@media(max-height:500px)_and_(min-width:480px)]:tw-mt-0"><button id="profileCropReset" type="button" class="tw-min-h-[36px] tw-border-0 tw-bg-transparent tw-px-3 tw-py-1 tw-text-xs tw-font-medium tw-text-[#697284] hover:tw-text-[#11224D]">Reset position</button></div>
      <p id="profileCropError" class="tw-mb-0 tw-mt-2 tw-text-xs tw-text-[#9E1B22]" role="alert" hidden></p>
      <div class="tw-mt-4 tw-flex tw-items-center tw-justify-end tw-gap-3 tw-border-0 tw-border-t tw-border-solid tw-border-[#e5e8ee] tw-pt-4 [@media(max-height:500px)_and_(min-width:480px)]:tw-mt-2 [@media(max-height:500px)_and_(min-width:480px)]:tw-pt-3"><button id="profileCropCancel" type="button" class="<?= $buttonClass ?>">Cancel</button><button id="profileCropApply" type="button" class="tw-min-h-[42px] tw-rounded-lg tw-border-0 tw-bg-[#11224D] tw-px-5 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-[#22365f] disabled:tw-opacity-60">Use photo</button></div>
    </div>
  </div>
</dialog>
<script defer src="<?= sfc_account_escape($context['assetBase']) ?>/js/profile-photo.js<?= sfc_account_escape(sfc_asset_version('js/profile-photo.js')) ?>"></script>
<?php if ($broker !== null): ?><script defer src="<?= sfc_account_escape($context['assetBase']) ?>/js/broker-verification.js<?= sfc_account_escape(sfc_asset_version('js/broker-verification.js')) ?>"></script><?php endif; ?>
<?php sfc_render_footer($context); ?>
