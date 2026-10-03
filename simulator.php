<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Scenario Simulator | LOCUS-SF', $context, ['page' => 'scenario-simulator', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'simulator');
?>
<main class="page-shell simulator-page-shell">
  <div class="site-shell simulator-site-shell" id="scenarioSimulatorRoot">
    <div class="loading-panel">Loading scenario simulation lab...</div>
  </div>
</main>
<?php sfc_render_footer($context); ?>
