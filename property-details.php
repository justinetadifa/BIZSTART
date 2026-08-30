<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
$propertyId = (int) ($_GET['id'] ?? 0);
sfc_render_head('Property Details | SFCelerate BizStart', $context, ['page' => 'property-details', 'role' => $context['user']['role'] ?? 'guest', 'property-id' => (string) $propertyId]);
sfc_render_header($context, 'explorer');
?>
<main class="page-shell details-page">
  <section class="site-shell page-intro-card">
    <div>
      <div class="eyebrow">Property Command Center</div>
      <h1>One operating surface for intelligence, trust, and action.</h1>
      <p>Track why the property ranks here, what is blocking it, and what each stakeholder should do next.</p>
    </div>
    <div class="intro-actions">
      <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Back to Explorer</a>
    </div>
  </section>

  <section class="site-shell detail-root-grid" id="propertyDetailsRoot">
    <div class="loading-panel">Loading property details...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
