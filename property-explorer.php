<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('Spatial Map Explorer | LOCUS-SF', $context, ['page' => 'property-explorer-terminal', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'explorer');
?>
<main class="page-shell explorer-page-shell">
  <section class="site-shell explorer-site-shell" id="explorerAppRoot">
    <div class="loading-panel">Loading spatial explorer...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
