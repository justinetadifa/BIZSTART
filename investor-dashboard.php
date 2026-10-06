<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
sfc_require_role('investor', sfc_path('/investor-login.php'));
$context = sfc_web_context();
require __DIR__ . '/app/Support/CityWorkspace.php';
sfc_render_head('Properties | LOCUS-SF', $context, ['page' => 'city-investor', 'role' => 'investor']);
sfc_render_header($context, ($_GET['view'] ?? '') === 'saved' ? 'saved' : 'investor');
sfc_render_city_workspace($context, ($_GET['view'] ?? '') === 'saved' ? 'Saved properties' : 'Find your next property.', 'Explore available sites in San Fernando City.', 'investor');
sfc_render_footer($context);
