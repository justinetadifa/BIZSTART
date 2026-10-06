<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
sfc_render_head('Privacy Notice | LOCUS-SF', $context, ['page' => 'city-privacy', 'role' => $context['user']['role'] ?? 'guest']);
sfc_render_header($context);
?>
<main class="city-container city-workspace city-prose">
  <div class="city-eyebrow">LOCUS-SF</div><h1>Privacy notice</h1>
  <p>The City Government of San Fernando processes account and property information to operate LOCUS-SF: account access, broker verification, listing review, saved properties, inquiries, and investment assessments.</p>
  <h2>Information you provide</h2><p>Investor accounts include your name, email, password, and optional profile details and photo. Broker applications also include contact and address information, PRC registration details, and listing information. Your password is stored as a hash.</p>
  <h2>Who can see it</h2><p>CICTO reviews broker applications. Authorized city departments manage and review property records. Published listing contacts are visible to signed-in users. Broker registration details and private account information are restricted to the account holder and authorized reviewers.</p>
  <h2>Your choices</h2><p>You can browse the public preview without consenting to account registration. Registration requires your explicit agreement. You can edit your profile and contact the City Government to request access, correction, deletion, or withdrawal of consent, subject to applicable recordkeeping requirements.</p>
  <h2>Site statistics</h2><p>The site records an aggregate visit count. A visit is counted once per session within a 30-minute window; page refreshes within that window do not increase it. This counter does not store your name, IP address, or browsing history.</p>
  <h2>Maps</h2><p>Street and satellite map tiles are supplied by external providers. Opening a map sends tile requests to those providers.</p>
  <h2>Contact and legal basis</h2><p>For privacy requests, contact the City Government through its <a href="https://www.sanfernandocity.gov.ph/">official website</a> or visit City Hall. The <a href="https://privacy.gov.ph/data-privacy-act-/">Data Privacy Act of 2012 (RA 10173)</a> describes data subject rights and obligations for processing personal data.</p>
</main>
<?php sfc_render_footer($context); ?>
