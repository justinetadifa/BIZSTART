<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('City Pipeline | SFCelerate BizStart', $context, ['page' => 'city-pipeline', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'city-pipeline');
?>
<main class="page-shell showcase-page">
  <section class="site-shell showcase-page-banner is-pipeline">
    <div class="showcase-page-grid">
      <div class="showcase-page-copy">
        <div class="showcase-page-prelude">
          <div>
            <div class="eyebrow">City Pipeline</div>
            <span class="showcase-page-subtitle">Future-facing city board</span>
          </div>
          <span class="showcase-page-pill">Under More</span>
        </div>
        <h1>Track what is coming next in the city with the same premium clarity as live opportunities.</h1>
        <p>City Pipeline is the public-facing surface for planned, approved, and under-construction developments that should be visible without being mistaken for live inventory.</p>
        <div class="showcase-page-chip-row">
          <span>Planned and approved</span>
          <span>Future-facing discovery</span>
          <span>Admin curated</span>
        </div>
      </div>

      <aside class="showcase-page-brief">
        <div class="panel-kicker">Board Position</div>
        <h2>Hidden under More. Designed for what the city has not opened yet.</h2>
        <p>Use this board to tell the story of projects, establishments, and developments that are still emerging across San Fernando.</p>
        <div class="showcase-page-brief-grid">
          <div><span>Board Mode</span><strong>Future-facing</strong></div>
          <div><span>Read Type</span><strong>Pipeline signal</strong></div>
          <div><span>Control</span><strong>Admin only CRUD</strong></div>
          <div><span>Surface</span><strong>Planned projects</strong></div>
        </div>
        <div class="showcase-page-actions">
          <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">Open Explorer</a>
          <a href="<?= htmlspecialchars(sfc_path('/offer-board.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Open Offer Board</a>
        </div>
      </aside>
    </div>
  </section>

  <section class="site-shell showcase-root-grid" id="cityPipelineRoot">
    <div class="loading-panel">Loading city pipeline...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
