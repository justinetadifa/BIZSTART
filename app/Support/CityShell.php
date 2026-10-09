<?php
declare(strict_types=1);

function sfc_render_head(string $title, array $context, array $bodyData = []): void
{
    $page = (string) ($bodyData['page'] ?? '');
    $user = $context['user'];
    $config = [
        'appName' => $context['appName'], 'basePath' => $context['basePath'],
        'apiBase' => $context['apiBase'], 'assetBase' => $context['assetBase'],
        'mapTileUrl' => $context['mapTileUrl'], 'mapAttribution' => $context['mapAttribution'],
        'role' => $user['role'] ?? 'guest', 'user' => $user, 'csrfToken' => sfc_csrf_token(),
        'sessionSecurity' => [
            'enabled' => $user !== null, 'role' => $user['role'] ?? 'guest',
            'timeoutSeconds' => sfc_inactivity_timeout_seconds($user['role'] ?? null),
            'warningSeconds' => 60, 'pingUrl' => sfc_path('/api/session-ping.php'),
            'logoutUrl' => sfc_path('/logout.php'),
            'loginUrl' => sfc_path(match ($user['role'] ?? '') { 'admin' => '/admin-login.php', 'seller' => '/seller-login.php', default => '/investor-login.php' }),
        ],
        'policy' => (require dirname(__DIR__) . '/config.php')['policy'],
        'barangays' => \App\Support\PropertyCatalog::barangays(),
    ];
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    $legacy = (!str_starts_with($page, 'city-') || $page === 'city-pipeline') && !in_array($page, ['broker-workspace', 'admin-workspace', 'admin-listings', 'profile', 'investor-login', 'seller-login', 'admin-login'], true);
    $GLOBALS['sfc_legacy_page'] = $legacy;
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $e($title) ?></title>
  <base href="<?= $e(($context['basePath'] ?: '') . '/') ?>">
  <link rel="icon" href="<?= $e($context['assetBase']) ?>/images/logoLocusRedBlue.png">
  <script>window.SFC_APP_CONFIG = <?= json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>;</script>
  <script src="<?= $e($context['assetBase']) ?>/js/investor-view.js<?= sfc_asset_version('js/investor-view.js') ?>"></script>
  <?php if ($legacy): ?>
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/portal.css">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/blue-button.css<?= sfc_asset_version('css/blue-button.css') ?>">
  <?php foreach (['decision-reports' => 'reports', 'city-pipeline' => 'pipeline', 'scenario-simulator' => 'simulator', 'admin-showcase' => 'admin'] as $key => $style): if ($page === $key): ?>
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/<?= $style ?>.css">
  <?php endif; endforeach; endif; ?>
  <?php if ($page === 'decision-reports'): ?><link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/reports-polish.css<?= sfc_asset_version('css/reports-polish.css') ?>"><?php endif; ?>
  <?php if (in_array($page, ['city-explorer', 'city-details', 'admin-workspace', 'admin-dashboard', 'broker-workspace'], true)): ?>
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/vendor/leaflet/leaflet.css">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/vendor/leaflet/MarkerCluster.css">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/city-map-crexi.css<?= sfc_asset_version('css/city-map-crexi.css') ?>">
  <script src="<?= $e($context['assetBase']) ?>/vendor/leaflet/leaflet.js"></script>
  <script src="<?= $e($context['assetBase']) ?>/vendor/leaflet/leaflet.markercluster.js"></script>
  <?php endif; ?>
  <?php if ($user !== null): ?><link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/session-guard.css"><?php endif; ?>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@500;600;700&family=Montserrat:wght@800;900&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/city-minimal.css<?= sfc_asset_version('css/city-minimal.css') ?>">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/city-navbar-ios.css<?= sfc_asset_version('css/city-navbar-ios.css') ?>">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/locus-presentation.css<?= sfc_asset_version('css/locus-presentation.css') ?>">
  <?php if ($page === 'city-landing'): ?><link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/home-glance.css<?= sfc_asset_version('css/home-glance.css') ?>"><?php endif; ?>
  <link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/password-visibility.css<?= sfc_asset_version('css/password-visibility.css') ?>">
  <script defer src="<?= $e($context['assetBase']) ?>/js/password-visibility.js<?= sfc_asset_version('js/password-visibility.js') ?>"></script>
  <script defer src="<?= $e($context['assetBase']) ?>/js/city-shell.js<?= sfc_asset_version('js/city-shell.js') ?>"></script>
</head>
<body <?php foreach ($bodyData as $key => $value): ?>data-<?= $e((string) $key) ?>="<?= $e((string) $value) ?>" <?php endforeach; ?>>
  <div class="locus-map-backdrop" aria-hidden="true"></div>
<?php
}

function sfc_investor_view_control(array $context): void
{
    if (!in_array($context['user']['role'] ?? 'guest', ['investor', 'guest'], true)) { return; }
    ?>
    <div class="investor-view-toolbar no-print" data-investor-view-toolbar hidden>
      <div class="investor-view-intro"><span class="investor-view-label">Investor view</span><p data-investor-view-description>Start with the essentials. Explore the assessment when you are ready.</p></div>
      <div class="investor-view-control" data-investor-view-control role="group" aria-label="Investor view">
        <button type="button" data-investor-mode="basic" aria-pressed="true">Basic</button>
        <button type="button" data-investor-mode="advanced" aria-pressed="false">Advanced</button>
      </div>
      <span class="investor-view-announcement" data-investor-view-announcement role="status" aria-live="polite"></span>
    </div>
    <?php
}

function sfc_render_header(array $context, string $active = ''): void
{
    $user = $context['user'];
    $role = $user['role'] ?? 'guest';
    $home = match ($role) { 'admin' => '/admin-dashboard.php', 'seller' => '/seller-dashboard.php', 'investor' => '/investor-dashboard.php', default => '/index.php' };
    $items = match ($role) {
        'admin' => [['Overview', '/admin-dashboard.php', 'admin'], ['Listings', '/admin-properties.php', 'admin-properties'], ['Priority board', '/property-ranking.php', 'ranking'], ['Map', '/property-explorer.php', 'explorer']],
        'seller' => [['My listings', '/seller-dashboard.php', 'seller'], ['Priority board', '/property-ranking.php', 'ranking'], ['Map', '/property-explorer.php', 'explorer']],
        'investor' => [['Properties', '/investor-dashboard.php', 'investor'], ['Priority board', '/property-ranking.php', 'ranking'], ['Map', '/property-explorer.php', 'explorer'], ['Compare', '/compare-decision.php', 'compare'], ['Saved', '/investor-dashboard.php?view=saved', 'saved']],
        default => [['Properties', '/index.php#properties', 'properties'], ['Why San Fernando', '/index.php#why-invest', 'why'], ['About', '/index.php#about', 'about']],
    };
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    ?>
  <div class="city-top-accent-line" aria-hidden="true"></div>
  <header class="city-header">
    <div class="city-container city-nav">
      <a class="city-brand" href="<?= $e(sfc_path($home)) ?>">
        <span class="city-brand-badge"><img src="<?= $e($context['assetBase']) ?>/images/logoLocusRedBlue.png" alt="LOCUS-SF" width="38" height="38"></span>
        <span class="city-brand-text"><strong>LOCUS<span>-SF</span></strong><small>San Fernando, La Union</small></span>
      </a>
      <button type="button" class="city-menu-button" id="cityMenuButton" aria-controls="cityNavigation" aria-expanded="false" aria-label="Open navigation"><?= sfc_icon('menu') ?></button>
      <div class="city-navigation max-[850px]:tw-max-h-[calc(100svh-100px)] max-[850px]:tw-overflow-y-auto max-[850px]:tw-overscroll-contain [&>nav]:tw-shrink-0 [&>.city-account-links]:tw-shrink-0" id="cityNavigation">
        <nav aria-label="Main navigation"><?php foreach ($items as [$label, $href, $key]): ?><a href="<?= $e(sfc_path($href)) ?>" <?= $active === $key ? 'aria-current="page"' : '' ?> class="<?= $active === $key ? 'is-active' : '' ?>"><?= $e($label) ?></a><?php endforeach; ?></nav>
        <div class="city-account-links">
          <?php if ($user !== null): ?>
          <button class="city-updates-button" type="button" id="cityUpdatesButton" aria-haspopup="dialog" aria-controls="cityUpdatesDialog">Updates <span id="cityUpdatesCount" hidden></span></button>
          <a class="city-profile-link" href="<?= $e(sfc_path('/profile.php')) ?>"><?php if (!empty($user['profileImageUrl'])): ?><img src="<?= $e(sfc_path('/' . ltrim($user['profileImageUrl'], '/'))) ?>" alt="" width="28" height="28"><?php endif; ?><span>Profile</span></a>
          <a class="city-signout-link" href="<?= $e(sfc_path('/logout.php')) ?>">Sign out</a>
          <?php else: ?>
          <a class="city-login-link" href="<?= $e(sfc_path('/investor-login.php')) ?>">Log in</a>
          <a class="city-button city-button-small city-cta-button" href="<?= $e(sfc_path('/investor-login.php?mode=register')) ?>">Create account</a>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </header>
<?php
}

function sfc_render_footer(array $context): void
{
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    ?>
  <footer class="city-footer">
    <div class="city-container city-footer-inner">
      <div class="city-footer-brand">
        <strong class="city-footer-logo">LOCUS-SF</strong>
        <span class="city-footer-location">San Fernando, La Union</span>
      </div>
      <nav class="city-footer-links" aria-label="Footer navigation">
        <a href="<?= $e(sfc_path('/privacy.php')) ?>">Privacy</a>
        <a href="<?= $e(sfc_path('/seller-login.php')) ?>">Broker access</a>
        <a href="<?= $e(sfc_path('/admin-login.php')) ?>">City access</a>
      </nav>
    </div>
  </footer>
  <?php if (!empty($context['user'])): ?>
  <dialog class="city-updates-dialog" id="cityUpdatesDialog" aria-labelledby="cityUpdatesTitle">
    <div class="city-updates-header">
      <div class="city-updates-title-row">
        <h2 class="city-updates-title" id="cityUpdatesTitle">Updates</h2>
        <button type="button" class="city-updates-close-btn" id="cityUpdatesClose" aria-label="Close updates">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <p class="city-updates-subtitle">Stay up to date with the latest activity in LOCUS-SF.</p>
      <button class="city-updates-read-all-btn" type="button" id="cityUpdatesRead">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
        <span>Mark all read</span>
      </button>
      <div class="city-updates-divider"></div>
    </div>
    <div id="cityUpdatesList" class="city-updates-list" aria-live="polite">Loading…</div>
  </dialog>
  <script defer src="<?= $e($context['assetBase']) ?>/js/city-notifications.js<?= sfc_asset_version('js/city-notifications.js') ?>"></script>
  <?php endif; ?>
  <?php if (!empty($context['user'])): ?><script src="<?= $e($context['assetBase']) ?>/js/session-guard.js<?= sfc_asset_version('js/session-guard.js') ?>"></script><?php endif; ?>
  <?php if (!empty($GLOBALS['sfc_legacy_page'])): ?><script type="module" src="<?= $e($context['assetBase']) ?>/js/portal.js<?= sfc_asset_version('js/portal.js') ?>"></script><?php endif; ?>
</body>
</html>
<?php
}
