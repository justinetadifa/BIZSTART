<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Investment Reports | LOCUS-SF', $context, ['page' => 'decision-reports', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'reports');
?>
<main class="page-shell reports-page">
  <template id="reportBlueButtonArt"><?= sfc_blue_button_art($context) ?></template>
  <header class="report-header">
    <div>
      <div class="report-eyebrow"><span class="report-edition-mark" aria-hidden="true"></span>Decision workspace <span aria-hidden="true">/</span> Reports</div>
      <h1>Investment reports<span class="report-title-period">.</span></h1>
      <p>Review candidate sites, check land-use evidence, and export your assessment.</p>
    </div>
    <div class="report-header-actions no-print">
      <span class="report-header-location">San Fernando City, La Union</span>
      <button type="button" class="report-print-button locus-blue-button" id="printDecisionReport">
        <?= sfc_blue_button_art($context) ?>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" stroke-linejoin="round"/><path d="M16 11h1" stroke-linecap="round"/></svg>
        <span class="report-action-label">Print / Save PDF</span><span class="report-export-arrow" aria-hidden="true">&#8599;</span>
      </button>
      <a class="report-explorer-link" href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>">Explore candidate sites <span aria-hidden="true">&#8599;</span></a>
    </div>
  </header>
  <section id="decisionReportsRoot" aria-label="Investment report"><div class="loading-panel">Loading reports...</div></section>
</main>
<?php sfc_render_footer($context); ?>
