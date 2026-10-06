<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Invest in San Fernando | LOCUS-SF', $context, ['page' => 'city-landing', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context, 'landing');
$e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
$cataloguePath = $context['user'] === null
    ? '/investor-login.php'
    : (($context['user']['role'] ?? '') === 'investor' ? '/investor-dashboard.php' : '/property-explorer.php');
?>
<main id="main-content">
  <div class="city-hero-frame">
    <div class="city-accent-stripe city-accent-stripe-top" aria-hidden="true">
      <span class="stripe-segment stripe-red"></span>
      <span class="stripe-segment stripe-blue"></span>
    </div>
    <section class="city-hero" aria-labelledby="heroTitle">
      <img src="<?= $e($context['assetBase']) ?>/images/landing-city.jpg" alt="San Fernando city center and coastline at sunset" fetchpriority="high" width="1800" height="1012">
      <div class="city-container city-hero-content">
        <h1 id="heroTitle" class="city-hero-title">YOUR NEXT<br>OPPORTUNITY<br>STARTS HERE.</h1>
        <p class="city-hero-subtitle">Find a place for your business. Explore local properties with<br>city assessments and clear investment insights.</p>
        <a class="city-button city-hero-btn" href="#properties">Explore properties</a>
      </div>
    </section>
    <div class="city-accent-stripe city-accent-stripe-bottom" aria-hidden="true">
      <span class="stripe-segment stripe-red"></span>
      <span class="stripe-segment stripe-blue"></span>
    </div>
  </div>
  <section class="city-container city-section" id="why-invest">
    <div class="city-section-heading"><h2>A city with possibilities.</h2><a class="city-link" href="https://www.sanfernandocity.gov.ph/wp-content/uploads/2023/06/City-of-San-Fernando-LU-Final-1.pdf" target="_blank" rel="noopener">City investment context ↗</a></div>
    <div class="city-benefits">
      <article><span>01 / CONNECT</span><h3>A northern gateway.</h3><p>Explore trade and logistics opportunities around the city and Poro Point Freeport Zone.</p></article>
      <article><span>02 / GROW</span><h3>Space for enterprise.</h3><p>Discover sites for retail, offices, services, and the city’s digital business sector.</p></article>
      <article><span>03 / WELCOME</span><h3>A coastal destination.</h3><p>Consider hospitality and visitor services, with Poro Point among the city’s destinations.</p></article>
    </div>
    <div class="city-sector-list" aria-label="Explore investment sectors"><?php foreach (['Retail', 'Office', 'Industrial', 'Hospitality', 'Land', 'Mixed Use'] as $sector): ?><a href="<?= $e(sfc_path('/property-explorer.php?category=' . rawurlencode($sector))) ?>"><?= $e($sector) ?></a><?php endforeach; ?></div>
  </section>
  <section class="city-container city-section" id="properties">
    <div class="city-section-heading"><div><div class="city-eyebrow">Find your place</div><h2>Featured properties.</h2><p>Three listings to get you started.</p></div><a class="city-link" href="<?= $e(sfc_path($cataloguePath)) ?>">View all properties →</a></div>
    <div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div>
    <?php if ($context['user'] === null): ?><div class="city-account-gate"><div><h3>See the full picture.</h3><p>Create an account to explore every listing, save sites, and compare.</p></div><a class="city-button" href="<?= $e(sfc_path('/investor-login.php?mode=register')) ?>">Create account</a></div><?php endif; ?>
  </section>
  <section class="city-container city-section" id="about"><div class="city-about">
    <div><div class="city-eyebrow">About LOCUS-SF</div><h2>Local knowledge.<br>Clearer decisions.</h2><p>LOCUS-SF brings listings, maps, and departmental assessments into one place for investors in San Fernando City.</p><p>A research project by the LOCUS-SF development team.</p></div>
    <div>
      <details><summary>How MCE and IAI work</summary><p>Multi-Criteria Evaluation (MCE) weighs seven city assessment criteria. The Investment Attractiveness Index (IAI) combines MCE with economic viability and infrastructure readiness. Scores appear after a complete assessment; the provisional method is shown on the priority board.</p></details>
      <details><summary>Authors and external advisers</summary><p>Authors: LOCUS-SF development team. Advisory departments: City Assessor’s Office, City Information and Communications Technology Office (CICTO), and Local Economic and Business Development Office (LEBDO).</p></details>
      <details><summary>For brokers</summary><p>Submit your PRC details for CICTO review, then submit properties for city approval.</p><p><a class="city-link" href="<?= $e(sfc_path('/seller-login.php?mode=register')) ?>">Register as a broker →</a></p></details>
    </div>
  </div></section>
</main>
<?php if ($context['user'] === null): ?>
<dialog class="city-privacy-dialog" id="cityPrivacyDialog" aria-labelledby="cityPrivacyTitle">
  <h2 id="cityPrivacyTitle">Your privacy matters.</h2>
  <p>By proceeding, I consent to the collection and processing of my personal and property data by the City Government of San Fernando in accordance with the Data Privacy Act of 2012 (RA 10173) for the purpose of the LOCUS-SF system.</p>
  <a class="city-link" href="<?= $e(sfc_path('/privacy.php')) ?>">Read the privacy notice</a>
  <label><input type="checkbox" id="cityPrivacyConsent">I agree to the collection and processing described above.</label>
  <div class="city-actions"><button class="city-button" id="cityPrivacyContinue" type="button" disabled>Create account</button><button class="city-button city-button-secondary" id="cityPrivacyGuest" type="button">Browse as guest</button></div>
</dialog>
<?php endif; ?>
<script type="module" src="<?= $e($context['assetBase']) ?>/js/city-workspace.js<?= sfc_asset_version('js/city-workspace.js') ?>"></script>
<?php sfc_render_footer($context); ?>
