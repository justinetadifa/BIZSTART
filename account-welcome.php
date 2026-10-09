<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
require_once __DIR__ . '/app/Support/account-view.php';

$context = sfc_web_context();
$user = $context['user'];
if (!is_array($user) || !in_array($user['role'] ?? '', ['investor', 'seller'], true)) {
    header('Location: ' . sfc_path('/investor-login.php'));
    exit;
}
header('Cache-Control: no-store');
$newAccount = ($_SESSION['sfc_welcome_mode'] ?? '') === 'new';
$_SESSION['sfc_account_greeting'] = $newAccount ? 'new' : 'returning';
unset($_SESSION['sfc_welcome_mode']);
$firstName = trim((string) ($user['firstName'] ?? ''));
if ($firstName === '') {
    $firstName = explode(' ', trim((string) ($user['name'] ?? '')))[0];
}
$broker = $user['role'] === 'seller';
$pending = $broker && !sfc_broker_can_submit($user);
$brokerStatus = 'Application review pending';
$brokerMessage = 'Your LOCUS-SF broker application has been received and is awaiting review. We will notify you by email once a decision has been made.';
if ($pending && !$newAccount) {
    $profile = sfc_seller_profile_repository()->findByUserId((int) $user['id']);
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d');
    if (!empty($profile['prcValidUntil']) && $profile['prcValidUntil'] < $today) {
        $brokerStatus = 'PRC registration has expired';
        $brokerMessage = 'Update your PRC validity and both ID images in your profile, then submit your application for authorized CAO or LEBDO review.';
    } elseif (($profile['applicationStatus'] ?? '') === 'verified' && empty($user['emailVerifiedAt'])) {
        $brokerStatus = 'Email verification required';
        $brokerMessage = 'Your broker application is approved. Verify ownership of your email address to enable listing submission.';
    } elseif (empty($profile['frontDocument']) || empty($profile['backDocument'])) {
        $brokerStatus = 'PRC ID images required';
        $brokerMessage = 'Upload the front and back of your PRC ID in your profile and submit your application for review.';
    } elseif (($profile['applicationStatus'] ?? '') === 'corrections_requested') {
        $brokerStatus = 'Corrections requested';
        $brokerMessage = 'Review the feedback in your profile, update the requested credentials or images, and submit your application again.';
    } elseif (($user['identityVerificationStatus'] ?? '') === 'rejected' || ($profile['applicationStatus'] ?? '') === 'rejected') {
        $brokerStatus = 'Verification needs your attention';
        $brokerMessage = 'Review the feedback in your broker workspace and update your application before submitting property listings.';
    }
}
$destination = $broker ? '/seller-dashboard.php' : '/investor-dashboard.php';
sfc_render_head('Welcome | LOCUS-SF', $context, ['page' => 'city-account-welcome', 'role' => $user['role']]);
sfc_account_assets($context);
sfc_render_header($context);
?>
<main class="account-page account-auth account-welcome-page" style="--account-map: url('<?= sfc_account_escape(sfc_account_art($context)) ?>')">
  <section class="account-welcome-card" aria-labelledby="welcomeTitle">
    <div class="account-welcome-mark" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="width:30px;height:30px;max-width:30px;max-height:30px;stroke:#059669;display:block;"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <p class="account-eyebrow"><?= $newAccount ? ($broker ? 'APPLICATION RECEIVED' : 'YOU’RE ALL SET') : 'GOOD TO SEE YOU AGAIN' ?></p>
    <h1 id="welcomeTitle"><span><?= $newAccount ? 'Welcome,' : 'Welcome back,' ?></span> <?= sfc_account_escape($firstName) ?>.</h1>
    <p class="account-welcome-copy"><?= $pending ? sfc_account_escape($brokerMessage) : ($broker ? 'Your workspace is ready. Continue to your listings and city review messages.' : 'Discover your next opportunity in San Fernando City.') ?></p>
    <?php if ($pending): ?><p class="account-welcome-status"><span aria-hidden="true"></span> <?= sfc_account_escape($brokerStatus) ?></p><?php endif; ?>
    <?php if ($broker): ?>
    <div class="broker-email-status">
      <strong>Email ownership: <?= !empty($user['emailVerifiedAt']) || !empty($user['emailVerified']) ? 'Verified' : 'Not yet verified' ?></strong>
      <p>Authorized CAO or LEBDO personnel review your application. Verified email and application approval are both required for broker listing privileges.</p>
      <p data-email-delivery-status role="status" aria-live="polite">Checking email delivery status…</p>
      <?php if (empty($user['emailVerifiedAt']) && empty($user['emailVerified'])): ?><button type="button" data-resend-verification>Resend verification email</button><?php endif; ?>
      <p><a href="<?= sfc_account_escape(sfc_path('/profile.php')) ?>">View application and email verification</a></p>
    </div>
    <?php endif; ?>
    <div class="account-submit-wrap">
      <a class="account-submit" href="<?= sfc_account_escape(sfc_path($destination)) ?>"><?= $broker ? 'Go to broker workspace' : 'Explore properties' ?><svg class="account-submit-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
    </div>
  </section>
</main>
<?php if ($broker): ?><script defer src="<?= sfc_account_escape($context['assetBase']) ?>/js/broker-verification.js<?= sfc_account_escape(sfc_asset_version('js/broker-verification.js')) ?>"></script><?php endif; ?>
<?php sfc_render_footer($context); ?>
