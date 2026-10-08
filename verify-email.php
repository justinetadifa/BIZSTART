<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
$success = false;
$error = '';
$submittedToken = is_string($_POST['token'] ?? null) ? $_POST['token'] : '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        sfc_require_csrf_form();
        $app = sfc_app_container();
        $limiter = new App\Support\RequestRateLimiter((string) $app['config']['security']['rate_limit_path']);
        if (!$limiter->consume('broker-verification-confirm:' . (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 30, 3600)) {
            http_response_code(429);
            throw new InvalidArgumentException('Too many verification attempts. Please try again in one hour.');
        }
        $app['brokerEmail']->verify($submittedToken);
        $success = true;
        $submittedToken = '';
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    } catch (Throwable) {
        http_response_code(503);
        $error = 'Email verification is temporarily unavailable. Please try again later.';
    }
}
$escape = static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Verify email | LOCUS-SF</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f9;color:#17304e;font:16px/1.6 system-ui,sans-serif;padding:24px}main{width:min(100%,560px);background:white;border:1px solid #dbe3ed;border-radius:20px;padding:clamp(24px,6vw,48px);box-shadow:0 16px 50px #17304e10}h1{line-height:1.2;font-size:30px;margin:20px 0}.brand{font-weight:800;letter-spacing:.08em}.notice{padding:16px;border-radius:10px;background:#fef4d9;border:1px solid #d9b456}.error{background:#fff0ee;border-color:#ca6e63;color:#7f271c}.success{background:#edf8f0;border-color:#85b495}label{display:block;font-weight:600;margin:24px 0 8px}input{width:100%;padding:12px;border:1px solid #94a3b8;border-radius:8px;font:inherit}button{width:100%;padding:14px;background:#17304e;color:white;border:0;border-radius:10px;font:600 16px system-ui;margin-top:20px;cursor:pointer}a{color:#17304e;text-underline-offset:4px}:focus-visible{outline:3px solid #dbab38;outline-offset:4px}.help{font-size:14px;color:#57687d}
  </style>
</head>
<body>
<main>
  <a class="brand" href="<?= $escape(sfc_path('/index.php')) ?>">LOCUS-SF</a>
  <h1><?= $success ? 'Email verified' : 'Verify your email address' ?></h1>
  <?php if ($success): ?>
    <p class="notice success" role="status">Your email address is verified. Broker privileges become available when your application is approved and your required credentials are complete.</p>
    <p><a href="<?= $escape(sfc_path('/seller-login.php')) ?>">Continue to broker sign-in</a></p>
  <?php else: ?>
    <p>Confirm that this email address belongs to you. This step is separate from the review of your broker application.</p>
    <?php if ($error !== ''): ?><p class="notice error" role="alert"><?= $escape($error) ?></p><?php endif; ?>
    <form method="post" action="<?= $escape(sfc_path('/verify-email.php')) ?>">
      <input type="hidden" name="_csrf" value="<?= $escape(sfc_csrf_token()) ?>">
      <div id="manualToken"><label for="verificationToken">Verification code from your email link</label><input id="verificationToken" name="token" value="<?= $escape($submittedToken) ?>" maxlength="64" pattern="[a-f0-9]{64}" required autocomplete="off" spellcheck="false"><p class="help">If the code does not fill automatically, paste the 64-character value after “#token=” in your email link.</p></div>
      <button type="submit">Verify email</button>
    </form>
    <p class="help">Links expire and work once. You can request a new link from your broker account.</p>
    <p><a href="<?= $escape(sfc_path('/seller-login.php')) ?>">Return to broker sign-in</a></p>
    <script>
      (() => {
        const token = new URLSearchParams(location.hash.slice(1)).get('token');
        if (/^[a-f0-9]{64}$/.test(token || '')) {
          const input = document.getElementById('verificationToken');
          input.value = token;
          input.type = 'hidden';
          document.getElementById('manualToken').hidden = true;
        }
        if (location.hash) history.replaceState(null, '', location.pathname);
      })();
    </script>
  <?php endif; ?>
</main>
</body>
</html>
