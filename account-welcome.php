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
$brokerStatus = 'Verification pending';
$brokerMessage = 'Your broker account is ready. CICTO will review your PRC credentials before you can submit property listings.';
if ($pending && !$newAccount) {
    $profile = sfc_seller_profile_repository()->findByUserId((int) $user['id']);
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d');
    if (!empty($profile['prcValidUntil']) && $profile['prcValidUntil'] < $today) {
        $brokerStatus = 'PRC registration has expired';
        $brokerMessage = 'Update your PRC validity in your profile and submit it for CICTO review to restore listing access.';
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
    <div class="account-welcome-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <p class="account-eyebrow"><?= $newAccount ? ($broker ? 'APPLICATION RECEIVED' : 'YOU’RE ALL SET') : 'GOOD TO SEE YOU AGAIN' ?></p>
    <h1 id="welcomeTitle"><span><?= $newAccount ? 'Welcome,' : 'Welcome back,' ?></span> <?= sfc_account_escape($firstName) ?>.</h1>
    <p class="account-welcome-copy"><?= $pending ? sfc_account_escape($brokerMessage) : ($broker ? 'Your workspace is ready. Continue to your listings and city review messages.' : 'Discover your next opportunity in San Fernando City.') ?></p>
    <?php if ($pending): ?><p class="account-welcome-status"><span aria-hidden="true"></span> <?= sfc_account_escape($brokerStatus) ?></p><?php endif; ?>
    <a class="account-submit" href="<?= sfc_account_escape(sfc_path($destination)) ?>"><?= $broker ? 'Go to broker workspace' : 'Explore properties' ?><svg class="account-submit-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
  </section>
</main>
<?php sfc_render_footer($context); ?>
