<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
sfc_require_role('investor', sfc_path('/investor-login.php'));
$context = sfc_web_context();
require __DIR__ . '/app/Support/CityWorkspace.php';
require_once __DIR__ . '/app/Support/InvestmentAssistantView.php';
$view = in_array($_GET['view'] ?? '', ['saved', 'agents', 'catalogue'], true) ? $_GET['view'] : 'properties';
sfc_render_head(match ($view) { 'agents' => 'Find Agent', 'saved' => 'Saved properties', 'catalogue' => 'Properties', default => 'Property Assistant' } . ' | LOCUS-SF', $context, ['page' => 'city-investor', 'role' => 'investor']);
sfc_render_header($context, match ($view) { 'saved' => 'saved', 'agents' => 'agents', default => 'investor' });
if ($view === 'agents') {
    require_once __DIR__ . '/app/Support/AgentDirectoryView.php';
    sfc_render_agent_directory($context);
} elseif ($view === 'properties') {
    sfc_render_investment_assistant($context);
} else {
    sfc_render_city_workspace($context, $view === 'saved' ? 'Saved properties' : 'Find your next property.', 'Explore available sites in San Fernando City.', 'investor');
}
sfc_render_footer($context);
