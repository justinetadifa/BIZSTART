<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
$investmentReport = filter_var($_GET['investment'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false && isset($_GET['investment']);
sfc_render_head('Investment Reports | LOCUS-SF', $context, ['page' => $investmentReport ? 'city-investment-report' : 'decision-reports', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'reports');
?>
<main class="<?= $investmentReport ? 'city-container city-workspace' : 'page-shell reports-page' ?>">
  <?php if ($investmentReport): ?>
  <header class="tw-mb-6 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-4">
    <div><span class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-amber">LOCUS-SF · San Fernando, La Union</span><h1 class="tw-mb-2 tw-mt-2 tw-text-3xl">Your investment report.</h1><p class="tw-m-0 tw-text-sm">Site assessment, policy alignment, and potential incentives.</p></div>
    <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-3 print:tw-hidden"><button type="button" id="printDecisionReport" class="tw-inline-flex tw-min-h-11 tw-items-center tw-gap-2 tw-rounded-lg tw-border-0 tw-bg-ink tw-px-5 tw-py-3 tw-text-xs tw-font-semibold tw-text-white disabled:tw-opacity-40"><svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/></svg>Print / Save PDF</button><a class="tw-text-xs tw-font-semibold tw-text-amber" href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>">Explore sites ↗</a></div>
  </header>
  <?php else: ?>
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
  <?php endif; ?>
  <section id="<?= $investmentReport ? 'investmentReportRoot' : 'decisionReportsRoot' ?>" aria-label="Investment report"><div class="loading-panel">Loading reports...</div></section>
</main>
<?php if ($investmentReport): ?><script type="module" src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/investment-report.js<?= sfc_asset_version('js/investment-report.js') ?>"></script><?php endif; ?>
<?php sfc_render_footer($context); ?>
