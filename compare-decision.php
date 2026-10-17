<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
require __DIR__ . '/app/Support/CityWorkspace.php';
sfc_render_head('Compare Properties | LOCUS-SF', $context, ['page' => 'city-compare', 'role' => $context['user']['role'] ?? 'guest']);
echo '<link rel="stylesheet" href="' . htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') . '/css/property-presentation.css' . sfc_asset_version('css/property-presentation.css') . '">';
echo '<link rel="stylesheet" href="' . htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') . '/css/compare-cards.css' . sfc_asset_version('css/compare-cards.css') . '">';
sfc_render_header($context, 'compare');
sfc_render_city_workspace($context, 'Compare properties', 'A clear view of your options.', 'compare');
sfc_render_footer($context);
