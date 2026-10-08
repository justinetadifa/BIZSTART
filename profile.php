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
$needsConsent = ($user['privacyConsentVersion'] ?? null) !== sfc_privacy_consent_version();
$photoUrl = !empty($user['profileImageUrl']) ? sfc_path('/' . ltrim($user['profileImageUrl'], '/')) : '';
$initial = mb_strtoupper(mb_substr($user['name'], 0, 1));
$fieldValue = static fn (string $name, mixed $default): string => sfc_account_escape($_POST[$name] ?? $default ?? '');
$inputClass = 'tw-w-full tw-min-w-0 tw-min-h-[46px] tw-rounded-lg tw-border tw-border-solid tw-border-[#d8dee8] tw-bg-white tw-px-3.5 tw-py-2.5 tw-text-sm tw-font-normal tw-text-[#11224D] focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-[#11224D]/15 focus:tw-border-[#11224D]';
$buttonClass = 'tw-inline-flex tw-min-h-[42px] tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-[#d8dee8] tw-bg-white tw-px-4 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-[#11224D] hover:tw-bg-[#F8F9FA] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#11224D]';
$renderField = static function (string $name, string $label, string $type, mixed $default, bool $required = false, string $autocomplete = '', int $maxLength = 255) use ($fieldValue, $inputClass): void {
    ?>
    <label class="tw-grid tw-min-w-0 tw-gap-2 tw-text-xs tw-font-semibold"><span><?= sfc_account_escape($label) ?><?php if (!$required && in_array($name, ['phone', 'company_name'], true)): ?> <span class="tw-font-normal tw-text-[#697284]">&middot; Optional</span><?php endif; ?></span><input class="<?= $inputClass ?>" type="<?= sfc_account_escape($type) ?>" name="<?= sfc_account_escape($name) ?>" value="<?= $fieldValue($name, $default) ?>" maxlength="<?= $maxLength ?>" <?= $required ? 'required' : '' ?> <?= $autocomplete !== '' ? 'autocomplete="' . sfc_account_escape($autocomplete) . '"' : '' ?> <?= $type === 'tel' ? 'inputmode="tel"' : '' ?>></label>
    <?php
};
sfc_render_head('Your profile | LOCUS-SF', $context, ['page' => 'profile', 'role' => $user['role']]);
?>
<?php sfc_render_header($context); ?>
<?php if ($broker !== null): ?><link rel="stylesheet" href="<?= sfc_account_escape($context['assetBase']) ?>/css/broker-verification.css<?= sfc_account_escape(sfc_asset_version('css/broker-verification.css')) ?>"><?php endif; ?>
<main class="tw-mx-auto tw-w-full tw-max-w-[1000px] tw-px-4 tw-pb-10 tw-pt-8 tw-font-sans tw-text-[#11224D] sm:tw-px-6 sm:tw-pt-12">
  <div class="tw-mb-7 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-4">
    <div>
      <p class="tw-mb-2 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-[#9E1B22]"><?= sfc_account_escape($accountLabel) ?></p>
      <h1 id="profileTitle" class="tw-m-0 tw-text-[30px] tw-font-bold tw-leading-tight tw-tracking-[-0.035em] sm:tw-text-[34px]">Your profile</h1>
      <p class="tw-mb-0 tw-mt-2 tw-text-sm tw-text-[#697284]">Your details, kept up to date.</p>
    </div>
    <a class="tw-inline-flex tw-min-h-[40px] tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-[#697284] hover:tw-text-[#11224D]" href="<?= sfc_account_escape(sfc_path($dashboard)) ?>"><span aria-hidden="true">&larr;</span> Back to dashboard</a>
  </div>
  <?php if ($error !== ''): ?><p class="tw-mb-5 tw-rounded-lg tw-border tw-border-solid tw-border-[#e7c8ca] tw-bg-[#fcf1f1] tw-px-4 tw-py-3 tw-text-sm tw-text-[#9E1B22]" role="alert"><?= sfc_account_escape($error) ?></p><?php endif; ?>
  <?php if (($_GET['saved'] ?? '') === '1'): ?><p class="tw-mb-5 tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-[#d6e5dc] tw-bg-[#eff7f2] tw-px-4 tw-py-3 tw-text-sm tw-text-[#2A603B]" role="status"><span aria-hidden="true">&#10003;</span> Your profile has been saved.</p><?php endif; ?>

  <form method="post" enctype="multipart/form-data" id="profileForm" class="tw-grid tw-overflow-hidden tw-rounded-2xl tw-border tw-border-solid tw-border-[#dfe3e9] tw-bg-white tw-shadow-[0_12px_40px_rgba(17,34,77,0.035)] md:tw-grid-cols-[260px_minmax(0,1fr)]" aria-labelledby="profileTitle">
    <input type="hidden" name="_csrf" value="<?= sfc_account_escape(sfc_csrf_token()) ?>">
    <aside class="tw-flex tw-flex-col tw-items-center tw-border-0 tw-border-b tw-border-solid tw-border-[#e5e8ee] tw-bg-[#fbfcfd] tw-px-6 tw-py-7 tw-text-center md:tw-border-b-0 md:tw-border-r md:tw-py-9" aria-label="Profile photo and account">
      <div class="tw-relative tw-mb-4 tw-h-[112px] tw-w-[112px] tw-shrink-0 tw-overflow-hidden tw-rounded-full tw-bg-[#11224D] tw-ring-4 tw-ring-white">
        <img id="profileAvatarPhoto" <?= $photoUrl !== '' ? 'src="' . sfc_account_escape($photoUrl) . '"' : '' ?> alt="Your profile photo" width="112" height="112" class="tw-h-full tw-w-full tw-object-cover" <?= $photoUrl === '' ? 'hidden' : '' ?>>
        <span id="profileAvatarInitial" class="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-text-[38px] tw-font-semibold tw-text-white" aria-hidden="true" <?= $photoUrl !== '' ? 'hidden' : '' ?>><?= sfc_account_escape($initial) ?></span>
      </div>
      <strong class="tw-max-w-full tw-break-words tw-text-base tw-font-semibold"><?= sfc_account_escape($user['name']) ?></strong>
      <span class="tw-mt-1 tw-max-w-full tw-break-all tw-text-xs tw-text-[#697284]"><?= sfc_account_escape($user['email']) ?></span>
      <?php if ($broker !== null): ?>
      <span class="tw-mt-3 tw-rounded-full tw-px-3 tw-py-1 tw-text-[11px] tw-font-semibold <?= $broker['applicationStatus'] === 'verified' ? 'tw-bg-[#eaf5ee] tw-text-[#2A603B]' : 'tw-bg-[#f5eedf] tw-text-[#85631c]' ?>"><?= $broker['applicationStatus'] === 'verified' ? 'PRC verified' : sfc_account_escape(ucwords(str_replace('_', ' ', $broker['applicationStatus']))) ?></span>
      <?php endif; ?>
      <div class="tw-mt-6 tw-w-full">
        <input id="profilePhotoInput" class="tw-peer tw-sr-only" type="file" name="profile_photo" accept="image/jpeg,image/png,image/webp" aria-describedby="profilePhotoHint profilePhotoStatus">
        <label for="profilePhotoInput" class="<?= $buttonClass ?> tw-w-full tw-cursor-pointer peer-focus-visible:tw-ring-2 peer-focus-visible:tw-ring-[#11224D] peer-focus-visible:tw-ring-offset-2">
          <svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 5h8l1.5 3H21v12H3V8h3.5L8 5Z" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.5"/></svg>
          Change photo
        </label>
        <p id="profilePhotoHint" class="tw-mb-0 tw-mt-3 tw-text-xs tw-leading-relaxed tw-text-[#697284]">JPG, PNG or WEBP.<br>Crop and preview before saving.</p>
        <noscript><p class="tw-mt-2 tw-text-xs tw-text-[#697284]">Up to 2 MB and 4 megapixels.</p></noscript>
        <p id="profilePhotoStatus" class="tw-mb-0 tw-mt-2 tw-text-xs tw-leading-relaxed tw-text-[#2A603B]" role="status" aria-live="polite"></p>
        <button id="profilePhotoUndo" type="button" class="tw-mt-2 tw-min-h-[36px] tw-border-0 tw-bg-transparent tw-px-2 tw-py-1 tw-text-xs tw-font-medium tw-text-[#697284] hover:tw-text-[#11224D]" hidden>Undo photo change</button>
      </div>
      <?php if ($photoUrl !== ''): ?>
      <label class="tw-mt-5 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-xs tw-text-[#697284]"><input id="profilePhotoRemove" type="checkbox" name="remove_photo" value="1" class="tw-m-0 tw-h-4 tw-w-4 tw-shrink-0" <?= !empty($_POST['remove_photo']) ? 'checked' : '' ?>> Remove current photo</label>
      <?php endif; ?>
    </aside>

    <div class="tw-min-w-0 tw-px-5 tw-py-7 sm:tw-px-8 md:tw-py-9">
      <h2 class="tw-mb-1 tw-text-lg tw-font-semibold tw-tracking-[-0.02em]">Personal details</h2>
      <p class="tw-mb-6 tw-text-xs tw-text-[#697284]">Use the name and contact details you want us to use.</p>
      <div class="tw-grid tw-gap-5 sm:tw-grid-cols-2">
        <?php $renderField('name', 'Complete name', 'text', $user['name'], true, 'name', 140); ?>
        <?php $renderField('phone', 'Contact number', 'tel', $broker['phone'] ?? $user['phone'] ?? '', $broker !== null, 'tel', 30); ?>
        <label class="tw-grid tw-min-w-0 tw-gap-2 tw-text-xs tw-font-semibold sm:tw-col-span-2"><span>Complete address<?php if ($broker === null): ?> <span class="tw-font-normal tw-text-[#697284]">&middot; Optional</span><?php endif; ?></span><textarea class="<?= $inputClass ?> tw-resize-y tw-leading-relaxed" name="address_line" rows="2" maxlength="255" autocomplete="street-address" <?= $broker !== null ? 'required' : '' ?>><?= $fieldValue('address_line', $broker['addressLine'] ?? $user['address'] ?? '') ?></textarea></label>
      </div>

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
      <?php if ($needsConsent): ?><label class="tw-mt-6 tw-flex tw-items-start tw-gap-3 tw-rounded-lg tw-bg-[#F8F9FA] tw-p-4 tw-text-xs tw-leading-relaxed tw-text-[#697284]"><input class="tw-m-0 tw-mt-1 tw-h-4 tw-w-4 tw-shrink-0" type="checkbox" name="privacy_consent" value="1" required <?= !empty($_POST['privacy_consent']) ? 'checked' : '' ?>><span><?= sfc_account_escape(sfc_privacy_consent_text()) ?> <a class="tw-text-[#9E1B22] tw-underline tw-underline-offset-2" href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noopener noreferrer">Read RA 10173</a></span></label><?php endif; ?>
      <div class="tw-mt-7 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-0 tw-border-t tw-border-solid tw-border-[#e5e8ee] tw-pt-5">
        <p class="tw-m-0 tw-text-xs tw-text-[#697284]">Changes apply when you save.</p>
        <button type="submit" class="tw-inline-flex tw-min-h-[44px] tw-items-center tw-justify-center tw-rounded-lg tw-border-0 tw-bg-[#9E1B22] tw-px-6 tw-py-3 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-[#82171d]">Save profile</button>
      </div>
      <?php if ($broker !== null && ($broker['applicationStatus'] !== 'verified' || empty($broker['frontDocument']) || empty($broker['backDocument']))): ?><button type="submit" name="action" value="submit_prc" class="<?= $buttonClass ?> tw-mt-4 tw-w-full">Submit PRC details for review</button><?php endif; ?>
    </div>
  </form>
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
