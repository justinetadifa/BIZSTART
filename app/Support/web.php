<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
sfc_enforce_transport_security();

function sfc_web_context(): array
{
    static $context = null;
    if ($context !== null) {
        return $context;
    }

    $config = require dirname(__DIR__) . '/config.php';
    $appName = (string) ($config['app']['name'] ?? 'LOCUS-SF');
    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/.');
    if (preg_match('#/(admin-dashboard|seller-dashboard|investor-dashboard|admin-login|seller-login|investor-login|property-explorer|property-ranking|voting-dashboard|property-details|compare-decision|admin-properties|admin-showcase|offer-board|city-pipeline|simulator|reports|logout)\.php$#', $scriptName, $matches) === 1) {
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
        'seller' => 'Broker',
        'investor' => 'Investor',
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
        'map' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
        'clock' => '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        'inbox' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 9h10M7 13h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
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

function sfc_domain_icon(string $key, string $size = 'md', string $class = '', bool $container = false, string $alt = '', string $containerVariant = ''): string
{
    static $icons = [
        'accessibility' => 'accessibility.png',
        'road' => 'accessibility.png',
        'access' => 'accessibility.png',
        'connectivity' => 'accessibility.png',
        'birzonalvalue' => 'birzonalvalue.png',
        'bir' => 'birzonalvalue.png',
        'zonal' => 'birzonalvalue.png',
        'valuation' => 'birzonalvalue.png',
        'landvalue' => 'birzonalvalue.png',
        'clupzoning' => 'clupzoning.png',
        'clup' => 'clupzoning.png',
        'zoning' => 'clupzoning.png',
        'landuse' => 'clupzoning.png',
        'economicactivity' => 'economicActivity.png',
        'economic' => 'economicActivity.png',
        'density' => 'economicActivity.png',
        'commerce' => 'economicActivity.png',
        'faultline' => 'faultline.png',
        'fault' => 'faultline.png',
        'seismic' => 'faultline.png',
        'floodsusceptible' => 'floodsusceptible.png',
        'flood' => 'floodsusceptible.png',
        'hazardsafety' => 'hazardsafety.png',
        'hazard' => 'hazardsafety.png',
        'safety' => 'hazardsafety.png',
        'iai' => 'iai.png',
        'attractiveness' => 'iai.png',
        'score' => 'iai.png',
        'infrastructure' => 'infrastructure.png',
        'infra' => 'infrastructure.png',
        'mce' => 'mce.png',
        'evaluation' => 'mce.png',
        'pointofinterest' => 'pointofinterest.png',
        'poi' => 'pointofinterest.png',
        'landmark' => 'pointofinterest.png',
        'propertyinformation' => 'propertyinfo.png',
        'propertyinfo' => 'propertyinfo.png',
        'property' => 'propertyinfo.png',
        'parcel' => 'propertyinfo.png',
        'sitereadiness' => 'sitereadiness.png',
        'readiness' => 'sitereadiness.png',
        'irie' => 'sitereadiness.png',
        'utilities' => 'utilities.png',
        'utility' => 'utilities.png',
        'power' => 'utilities.png',
        'water' => 'utilities.png',
    ];

    static $labels = [
        'accessibility.png' => 'Road Access & Transport Connectivity',
        'birzonalvalue.png' => 'BIR Zonal Value & Land Valuation',
        'clupzoning.png' => 'CLUP 2025–2035 Zoning Classification',
        'economicActivity.png' => 'Commercial Density & Economic Activity',
        'faultline.png' => 'Seismic Fault-Line Constraint',
        'floodsusceptible.png' => 'Flood Susceptibility & Drainage Risk',
        'hazardsafety.png' => 'Combined Hazard & Site Safety Index',
        'iai.png' => 'Investment Attractiveness Index (IAI)',
        'infrastructure.png' => 'Physical Infrastructure Readiness',
        'mce.png' => 'Multi-Criteria Evaluation (MCE) Engine',
        'pointofinterest.png' => 'Points of Interest & Service Catchment',
        'propertyinfo.png' => 'Property Dossier & Parcel Profile',
        'sitereadiness.png' => 'Investment Readiness & Verification (IRIE)',
        'utilities.png' => 'Utility Grid Capacities (Power, Water, Fiber)',
    ];

    $norm = strtolower(str_replace(['-', '_', ' '], '', $key));
    $file = $icons[$norm] ?? 'propertyinfo.png';
    $label = $alt !== '' ? $alt : ($labels[$file] ?? 'LOCUS-SF Domain Icon');

    $assetUrl = sfc_path('/assets/icons/' . $file);
    $sizeClass = 'locus-icon--' . htmlspecialchars($size, ENT_QUOTES, 'UTF-8');
    $extraClass = $class !== '' ? ' ' . htmlspecialchars($class, ENT_QUOTES, 'UTF-8') : '';

    $img = '<img src="' . htmlspecialchars($assetUrl, ENT_QUOTES, 'UTF-8') . '" alt="' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '" class="locus-icon ' . $sizeClass . $extraClass . '" loading="lazy" decoding="async">';

    if ($container) {
        $boxClass = 'locus-icon-box locus-icon-box--' . htmlspecialchars($size, ENT_QUOTES, 'UTF-8');
        if ($containerVariant !== '') {
            $boxClass .= ' locus-icon-box--' . htmlspecialchars($containerVariant, ENT_QUOTES, 'UTF-8');
        }
        return '<span class="' . $boxClass . '">' . $img . '</span>';
    }

    return $img;
}

function sfc_blue_button_art(array $context): string
{
    $imageUrl = htmlspecialchars($context['assetBase'] . '/icons/blue_button.png', ENT_QUOTES, 'UTF-8');
    $art = '<span class="blue-button-art" aria-hidden="true">';
    foreach (['left', 'center', 'right'] as $part) {
        $art .= '<span class="blue-button-slice blue-button-slice-' . $part . '"><img src="' . $imageUrl . '" alt="" width="2000" height="2000"></span>';
    }
    return $art . '</span>';
}

require_once __DIR__ . '/CityShell.php';
