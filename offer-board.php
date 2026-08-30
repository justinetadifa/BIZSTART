<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('Offer Board | SFCelerate BizStart', $context, ['page' => 'offer-board', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'offer-board');
?>
<main class="page-shell showcase-page">
  <section class="site-shell showcase-page-banner is-offer">
    <div class="showcase-page-grid">
      <div class="showcase-page-copy">
        <div class="showcase-page-prelude">
          <div>
            <div class="eyebrow">Offer Board</div>
            <span class="showcase-page-subtitle">Curated timed opportunities</span>
          </div>
          <span class="showcase-page-pill">Under More</span>
        </div>
        <h1>Curated opportunities staged like premium releases, not plain listings.</h1>
        <p>Offer Board is the image-led public surface for admin-curated opportunities, timing windows, and spotlight treatment without crowding the main top navigation.</p>
        <div class="showcase-page-chip-row">
          <span>Admin curated</span>
          <span>Timed release windows</span>
          <span>Direct property routing</span>
        </div>
      </div>

      <aside class="showcase-page-brief">
        <div class="panel-kicker">Board Position</div>
        <h2>Hidden under More. Built for cleaner spotlight treatment.</h2>
        <p>Use this board when the opportunity deserves a sharper, more editorial release surface than the standard ranking layout.</p>
        <div class="showcase-page-brief-grid">
          <div><span>Board Mode</span><strong>Offer spotlight</strong></div>
          <div><span>Access</span><strong>Public display</strong></div>
          <div><span>Control</span><strong>Admin only CRUD</strong></div>
          <div><span>Surface</span><strong>Image-led cards</strong></div>
        </div>
        <div class="showcase-page-actions">
          <a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary">View Rankings</a>
          <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-primary">Open Explorer</a>
        </div>
      </aside>
    </div>
  </section>

  <section class="site-shell showcase-root-grid" id="offerBoardRoot">
    <div class="loading-panel">Loading offer board...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
