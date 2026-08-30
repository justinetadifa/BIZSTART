<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

function sfc_web_context(): array
{
    static $context = null;
    if ($context !== null) {
        return $context;
    }

    $config = require dirname(__DIR__) . '/config.php';
    $appName = (string) ($config['app']['name'] ?? 'SFCelerate BizStart');
    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    $basePath = rtrim(str_replace('/index.php', '', $scriptName), '/');
    if (preg_match('#/(admin-dashboard|seller-dashboard|investor-dashboard|admin-login|seller-login|investor-login|property-explorer|property-ranking|voting-dashboard|property-details|compare-decision|admin-properties|admin-showcase|offer-board|city-pipeline|logout)\.php$#', $scriptName, $matches) === 1) {
        $basePath = substr($scriptName, 0, -strlen($matches[0]));
    }
    $basePath = $basePath === '' ? '' : $basePath;
    $assetBase = ($basePath === '' ? '' : $basePath) . '/assets';
    $apiBase = ($basePath === '' ? '' : $basePath) . '/api';

    $context = [
        'appName' => $appName,
        'basePath' => $basePath,
        'assetBase' => $assetBase,
        'apiBase' => $apiBase,
        'mapTileUrl' => (string) ($config['services']['maps']['tile_url'] ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        'mapAttribution' => (string) ($config['services']['maps']['tile_attribution'] ?? '&copy; OpenStreetMap contributors'),
        'user' => sfc_current_user(),
    ];

    return $context;
}

function sfc_role_label(?string $role): string
{
    return match ($role) {
        'admin' => 'Admin',
        'seller' => 'Seller',
        'investor' => 'Investor / Resident',
        default => 'Guest',
    };
}

function sfc_path(string $path): string
{
    $context = sfc_web_context();
    $basePath = $context['basePath'];
    return ($basePath === '' ? '' : $basePath) . $path;
}

function sfc_asset_version(string $relativePath): string
{
    $fullPath = dirname(__DIR__, 2) . '/assets/' . ltrim($relativePath, '/');
    $mtime = @filemtime($fullPath);
    return $mtime ? '?v=' . rawurlencode((string) $mtime) : '';
}

function sfc_icon(string $name): string
{
    $icons = [
        'home' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
        'explorer' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'compare' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M17 5v14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 8h4M10 12h6M10 16h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'ranking' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19V11M12 19V7M17 19V4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4 19h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'vote' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6" width="15" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m9 11 2.5 2.5L16 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'admin' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 5 7v5.5c0 4.2 2.9 6.9 7 8 4.1-1.1 7-3.8 7-8V7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 12 11 13.5l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'inventory' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'seller' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12l1.5 3.5L12 20 4.5 9.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 6 12 20 15 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
        'investor' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7 9l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 20h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'logout' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7.5 19 12l-5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 12H9M11 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'bell' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5a4 4 0 0 0-4 4v2.2c0 1.2-.4 2.4-1.2 3.3L5.5 15.5h13l-1.3-1.5a4.9 4.9 0 0 1-1.2-3.3V8.5a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 18a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'lock' => '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'menu' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        'offer' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 18 17.5H6A1.5 1.5 0 0 1 4.5 16V9A1.5 1.5 0 0 1 6 7.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8M12 7.5v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'pipeline' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V9.5h4V18M10 18V6h4v12M15 18v-8.5h4V18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'showcase' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 14.6 9l5.9.8-4.3 4.2 1.1 5.9L12 17.3 6.7 19.9l1.1-5.9-4.3-4.2L9.4 9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
        'spark' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
        'insights' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V7M10 18V10M16 18V5M22 18H2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    ];

    return $icons[$name] ?? $icons['spark'];
}

function sfc_render_head(string $title, array $context, array $bodyData = []): void
{
    $pageName = (string) ($bodyData['page'] ?? '');
    $bodyAttributes = [];
    foreach ($bodyData as $key => $value) {
        $bodyAttributes[] = sprintf('data-%s="%s"', htmlspecialchars((string) $key, ENT_QUOTES, 'UTF-8'), htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'));
    }
    $clientConfig = [
        'appName' => $context['appName'],
        'basePath' => $context['basePath'],
        'apiBase' => $context['apiBase'],
        'assetBase' => $context['assetBase'],
        'mapTileUrl' => $context['mapTileUrl'] ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'mapAttribution' => $context['mapAttribution'] ?? '&copy; OpenStreetMap contributors',
        'role' => $context['user']['role'] ?? 'guest',
        'user' => $context['user'],
    ];
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></title>
  <base href="<?= htmlspecialchars(($context['basePath'] === '' ? '/' : $context['basePath'] . '/'), ENT_QUOTES, 'UTF-8') ?>">
  <link rel="icon" type="image/png" sizes="32x32" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/webLogoSfc-favicon.png?v=8">
  <link rel="icon" type="image/png" sizes="16x16" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/webLogoSfc-favicon.png?v=8">
  <link rel="shortcut icon" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/webLogoSfc-favicon.png?v=8">
  <link rel="apple-touch-icon" sizes="180x180" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/webLogoSfc-favicon.png?v=8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Poppins:wght@500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <?php if (in_array($pageName, ['property-explorer', 'property-details'], true)): ?>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <?php endif; ?>
  <link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/portal.css<?= htmlspecialchars(sfc_asset_version('css/portal.css'), ENT_QUOTES, 'UTF-8') ?>">
</head>
<body <?= implode(' ', $bodyAttributes) ?>>
<script>
  window.SFC_APP_CONFIG = <?= json_encode($clientConfig, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
</script>
<div class="studio-transition" id="studioTransition" aria-hidden="true">
  <div class="studio-transition-line"></div>
</div>
<?php
}

function sfc_render_header(array $context, string $active = ''): void
{
    $user = $context['user'];
    $role = $user['role'] ?? 'guest';
    $dashboardHref = null;
    $dashboardKey = null;
    $navItems = match ($role) {
        'admin' => [
            ['href' => sfc_path('/admin-properties.php'), 'label' => 'Listings', 'icon' => 'inventory', 'key' => 'admin-properties'],
            ['href' => sfc_path('/property-ranking.php'), 'label' => 'Rankings', 'icon' => 'ranking', 'key' => 'ranking'],
            ['href' => sfc_path('/voting-dashboard.php'), 'label' => 'Votes', 'icon' => 'vote', 'key' => 'voting'],
        ],
        'seller' => [
            ['href' => sfc_path('/property-ranking.php'), 'label' => 'Rankings', 'icon' => 'ranking', 'key' => 'ranking'],
            ['href' => sfc_path('/property-explorer.php'), 'label' => 'Market', 'icon' => 'explorer', 'key' => 'explorer'],
        ],
        'investor' => [
            ['href' => sfc_path('/property-ranking.php'), 'label' => 'Rankings', 'icon' => 'ranking', 'key' => 'ranking'],
            ['href' => sfc_path('/property-explorer.php'), 'label' => 'Explore', 'icon' => 'explorer', 'key' => 'explorer'],
            ['href' => sfc_path('/voting-dashboard.php'), 'label' => 'Votes', 'icon' => 'vote', 'key' => 'voting'],
            ['href' => sfc_path('/compare-decision.php'), 'label' => 'Compare', 'icon' => 'compare', 'key' => 'compare'],
        ],
        default => [
            ['href' => sfc_path('/index.php'), 'label' => 'Home', 'icon' => 'home', 'key' => 'landing'],
            ['href' => sfc_path('/property-ranking.php'), 'label' => 'Rankings', 'icon' => 'ranking', 'key' => 'ranking'],
            ['href' => sfc_path('/property-explorer.php'), 'label' => 'Explore', 'icon' => 'explorer', 'key' => 'explorer'],
            ['href' => sfc_path('/voting-dashboard.php'), 'label' => 'Voting', 'icon' => 'vote', 'key' => 'voting'],
        ],
    };
    if ($role === 'admin') {
        $dashboardHref = sfc_path('/admin-dashboard.php');
        $dashboardKey = 'admin';
    } elseif ($role === 'seller') {
        $dashboardHref = sfc_path('/seller-dashboard.php');
        $dashboardKey = 'seller';
    } elseif ($role === 'investor') {
        $dashboardHref = sfc_path('/investor-dashboard.php');
        $dashboardKey = 'investor';
    }
    $moreItems = [
        [
            'href' => sfc_path('/offer-board.php'),
            'label' => 'Offer Board',
            'description' => 'Curated timed opportunities and image-led releases.',
            'icon' => 'offer',
            'key' => 'offer-board',
        ],
        [
            'href' => sfc_path('/city-pipeline.php'),
            'label' => 'City Pipeline',
            'description' => 'Planned, approved, and not-yet-built city projects.',
            'icon' => 'pipeline',
            'key' => 'city-pipeline',
        ],
    ];
    if ($role === 'admin') {
        $moreItems[] = [
            'href' => sfc_path('/admin-showcase.php'),
            'label' => 'Showcase Studio',
            'description' => 'Admin-only CRUD for Offer Board and City Pipeline.',
            'icon' => 'showcase',
            'key' => 'admin-showcase',
        ];
    }
    ?>
  <header class="site-header">
    <div class="site-shell nav-shell">
      <a href="<?= htmlspecialchars(sfc_path('/index.php'), ENT_QUOTES, 'UTF-8') ?>" class="brand-link" id="brandAcademyTrigger" title="Tap to open Investor Academy & Business Crash Course">
        <span class="brand-mark"><img src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/webLogoSfc.png" alt="SFCelerate" class="brand-logo"></span>
        <span class="brand-copy">
          <span class="brand-title">
            SFCelerate BizStart
            <span class="brand-academy-badge" title="Tap to open Investor & Business Crash Course">🎓 Learn Basics</span>
          </span>
          <span class="brand-subtitle">San Fernando Opportunity Platform</span>
        </span>
      </a>

      <div class="nav-center">
        <nav class="top-nav" aria-label="Primary navigation">
          <?php foreach ($navItems as $item): ?>
            <a href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>" class="nav-link <?= $active === $item['key'] ? 'active' : '' ?>">
              <span class="nav-link-icon"><?= sfc_icon($item['icon']) ?></span>
              <span><?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?></span>
            </a>
          <?php endforeach; ?>
        </nav>
      </div>

      <div class="nav-actions">
        <div class="portal-menu portal-menu-compact" data-sfc-menu>
          <button type="button" class="btn-shell btn-shell-secondary portal-menu-trigger more-menu-trigger <?= in_array($active, ['offer-board', 'city-pipeline', 'admin-showcase'], true) ? 'is-active' : '' ?>" data-sfc-menu-toggle aria-expanded="false" aria-controls="moreMenuPanel">
            <span class="btn-shell-icon"><?= sfc_icon('menu') ?></span>
            <span>More</span>
          </button>
          <div class="portal-menu-panel more-menu-panel" id="moreMenuPanel">
            <?php foreach ($moreItems as $item): ?>
              <a href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>" class="portal-entry <?= $active === $item['key'] ? 'is-active' : '' ?>">
                <span class="portal-entry-icon"><?= sfc_icon($item['icon']) ?></span>
                <span class="portal-entry-copy">
                  <strong><?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?></strong>
                  <span><?= htmlspecialchars($item['description'], ENT_QUOTES, 'UTF-8') ?></span>
                </span>
              </a>
            <?php endforeach; ?>
          </div>
        </div>
        <?php if ($user !== null): ?>
          <a
            href="<?= htmlspecialchars($dashboardHref ?? sfc_path('/index.php'), ENT_QUOTES, 'UTF-8') ?>"
            class="session-chip session-chip-link <?= $active === $dashboardKey ? 'active' : '' ?>"
            aria-label="<?= htmlspecialchars(sfc_role_label($role) . ' dashboard', ENT_QUOTES, 'UTF-8') ?>"
          >
            <span class="session-chip-icon"><?= sfc_icon($role === 'admin' ? 'admin' : ($role === 'seller' ? 'seller' : 'investor')) ?></span>
            <span class="session-chip-text"><?= htmlspecialchars(sfc_role_label($role), ENT_QUOTES, 'UTF-8') ?></span>
          </a>
          <button
            type="button"
            class="btn-shell btn-shell-secondary notification-trigger notification-trigger-compact"
            data-notification-trigger
            aria-expanded="false"
            aria-controls="notificationDrawer"
            aria-label="Signals"
            title="Signals"
          >
            <span class="btn-shell-icon"><?= sfc_icon('bell') ?></span>
            <span class="notification-trigger-text">Signals</span>
            <span class="notification-trigger-badge" data-notification-badge hidden>0</span>
          </button>
          <a
            href="<?= htmlspecialchars(sfc_path('/logout.php'), ENT_QUOTES, 'UTF-8') ?>"
            class="btn-shell btn-shell-secondary header-logout-trigger"
            aria-label="Logout"
            title="Logout"
          >
            <span class="btn-shell-icon"><?= sfc_icon('logout') ?></span>
            <span class="header-logout-text">Logout</span>
          </a>
        <?php else: ?>
          <div class="portal-menu" data-sfc-menu>
            <button type="button" class="btn-shell btn-shell-primary portal-menu-trigger" data-sfc-menu-toggle aria-expanded="false" aria-controls="portalMenuPanel">
              <span class="btn-shell-icon"><?= sfc_icon('lock') ?></span>
              <span>Enter Platform</span>
            </button>
            <div class="portal-menu-panel" id="portalMenuPanel">
              <a href="<?= htmlspecialchars(sfc_path('/investor-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="portal-entry portal-entry-primary">
                <span class="portal-entry-icon"><?= sfc_icon('investor') ?></span>
                <span class="portal-entry-copy">
                  <strong>Investor / Resident</strong>
                  <span>Explore, compare, and vote on local demand.</span>
                </span>
              </a>
              <a href="<?= htmlspecialchars(sfc_path('/seller-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="portal-entry">
                <span class="portal-entry-icon"><?= sfc_icon('seller') ?></span>
                <span class="portal-entry-copy">
                  <strong>Seller</strong>
                  <span>Submit and manage listings with cleaner control.</span>
                </span>
              </a>
              <a href="<?= htmlspecialchars(sfc_path('/admin-login.php'), ENT_QUOTES, 'UTF-8') ?>" class="portal-entry">
                <span class="portal-entry-icon"><?= sfc_icon('admin') ?></span>
                <span class="portal-entry-copy">
                  <strong>Admin</strong>
                  <span>Oversee inventory, analytics, and demand signals.</span>
                </span>
              </a>
            </div>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </header>
<?php
}

function sfc_render_footer(array $context): void
{
    ?>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script type="module" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/portal.js<?= htmlspecialchars(sfc_asset_version('js/portal.js'), ENT_QUOTES, 'UTF-8') ?>"></script>
</body>
</html>
<?php
}
