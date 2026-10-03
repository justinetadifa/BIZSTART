<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('City Pipeline | LOCUS-SF', $context, ['page' => 'city-pipeline', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'city-pipeline');
?>
<main class="page-shell pipeline-page-shell">
  <div class="site-shell pipeline-site-shell" id="cityPipelineRoot">
    <div class="loading-panel">Loading city pipeline signal atlas...</div>
  </div>
</main>
<?php sfc_render_footer($context); ?>
