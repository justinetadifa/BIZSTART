<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';

$context = sfc_web_context();
sfc_render_head('Compare & Decision | LOCUS-SF', $context, ['page' => 'compare-decision', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'compare');
?>
<main class="page-shell compare-page">
  <section class="site-shell page-intro-card compare-intro" aria-labelledby="compareIntroTitle">
    <img class="compare-intro-backdrop" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/images/introlocus-sf.png" alt="" fetchpriority="high">
    <div class="compare-intro-copy">
      <div class="compare-intro-prelude">
        <span class="eyebrow">Compare &amp; Decide</span>
        <span class="compare-intro-location">San Fernando, La Union</span>
      </div>
      <h1 id="compareIntroTitle">A clearer view of <span>your next move.</span></h1>
      <p>Your shortlist, considered together. Find the right balance of fit, value, and readiness before taking the next step.</p>
      <div class="intro-actions">
        <a href="<?= htmlspecialchars(sfc_path('/compare-decision.php#compareDecisionRoot'), ENT_QUOTES, 'UTF-8') ?>" id="compareMatrixLink" class="btn-shell btn-shell-secondary compare-intro-link">See the comparison <span aria-hidden="true">&darr;</span></a>
        <a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>" class="btn-shell btn-shell-secondary compare-intro-link">Explore properties <span aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
    <div class="compare-intro-brief">
      <div class="compare-intro-brief-label">A considered decision</div>
      <ol class="compare-intro-steps" aria-label="Your comparison process">
        <li><span aria-hidden="true">01</span><div><strong>Set priorities</strong><small>Shape your investment brief.</small></div></li>
        <li><span aria-hidden="true">02</span><div><strong>Compare sites</strong><small>See the differences that matter.</small></div></li>
        <li><span aria-hidden="true">03</span><div><strong>Review your lead</strong><small>Plan a confident next step.</small></div></li>
      </ol>
      <div class="compare-intro-brief-foot">One shortlist. A more complete picture.</div>
    </div>
  </section>

  <section class="site-shell compare-root-grid" id="compareDecisionRoot">
    <div class="loading-panel">Loading comparison workspace...</div>
  </section>
</main>
<?php sfc_render_footer($context); ?>
