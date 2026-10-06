<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
require __DIR__ . '/app/Support/CityWorkspace.php';
sfc_render_head('Map Explorer | LOCUS-SF', $context, ['page' => 'city-explorer', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'explorer');
sfc_render_city_workspace($context, 'Map explorer', 'Explore properties by location.', 'explorer');
sfc_render_footer($context);
