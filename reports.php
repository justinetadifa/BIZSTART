<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Investment Reports | LOCUS-SF', $context, ['page' => 'decision-reports', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'reports');
?>
<main class="page-shell reports-page">
  <header class="report-header">
    <div>
      <div class="report-eyebrow">LOCUS-SF <span aria-hidden="true">/</span> Decision intelligence</div>
      <h1>Investment Reports</h1>
      <p>A clearer view of your candidate sites, compliance, and next steps.</p>
    </div>
    <button type="button" class="report-print-button no-print" id="printDecisionReport">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" stroke-linejoin="round"/><path d="M16 11h1" stroke-linecap="round"/></svg>
      Print / Save PDF
    </button>
  </header>
  <section id="decisionReportsRoot" aria-label="Investment report"><div class="loading-panel">Loading reports...</div></section>
</main>
<?php sfc_render_footer($context); ?>
