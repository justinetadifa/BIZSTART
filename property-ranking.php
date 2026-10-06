<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
require __DIR__ . '/app/Support/CityWorkspace.php';
sfc_render_head('Priority Board | LOCUS-SF', $context, ['page' => 'city-ranking', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'ranking');
sfc_render_city_workspace($context, 'Priority board', 'City assessments, side by side.', 'ranking');
sfc_render_footer($context);
