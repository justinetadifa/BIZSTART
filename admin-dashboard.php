<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/web.php';
sfc_require_role('admin', sfc_path('/admin-login.php'));
$context = sfc_web_context();
$department = sfc_admin_department($context['user']);
if (!sfc_can_manage_properties($context['user'])) {
    http_response_code(403);
    exit('A city department account is required.');
}
$deptProfiles = [
    'CICTO' => [
        'code' => 'CICTO',
        'badge' => 'System Governance & Administration',
        'title' => 'City Overview & Governance',
        'subtitle' => 'Verify real estate brokers, approve listing publications, and govern municipal staff access.',
        'tag' => 'dept-cicto',
        'responsibilities' => [
            'PRC Broker Verification' => 'Cross-check broker credentials against the official PRC verification portal before licensing submissions.',
            'Listing Decisions & Review' => 'Review parcel title provenance, zoning compliance, and approve or decline public listing publication.',
            'Staff Account Provisioning' => 'Manage authorized accounts for City Assessor (CAO), LEBDO, and CICTO administrators.',
        ]
    ],
    'ASSESSOR' => [
        'code' => 'ASSESSOR',
        'badge' => "City Assessor's Office (CAO)",
        'title' => 'Property Valuation & Assessment Workspace',
        'subtitle' => 'Record cadastral dimensions, classify land use, and assess the 7 multi-criteria evaluation factors.',
        'tag' => 'dept-assessor',
        'responsibilities' => [
            '7-Criteria MCE Assessment' => 'Evaluate Spatial, Infrastructure, Economic, Zoning, Nearby Businesses, Risk, and Environmental scores.',
            'Cadastral & Tax Valuation' => 'Update official lot areas (m²), market valuation basis (₱), and land classification tags.',
            'MCE & IAI Attractiveness' => 'Monitor resulting Multi-Criteria Evaluation and Investment Attractiveness Index ranks.',
        ]
    ],
    'LEBDO' => [
        'code' => 'LEBDO',
        'badge' => 'Local Economic & Business Development Office',
        'title' => 'Economic Development & Investment Workspace',
        'subtitle' => 'Facilitate commercial growth corridors, manage unrepresented open listings, and coordinate investor inquiries.',
        'tag' => 'dept-lebdo',
        'responsibilities' => [
            'Commercial Corridor Matching' => 'Connect investors to strategic commercial, tourism, and industrial parcels in growth corridors.',
            'Economic Viability Scoring' => 'Review local economic viability and commercial clustering impact across barangays.',
            'Investor Facilitation' => 'Assist property owners without brokers and coordinate site inspection and inquiry requests.',
        ]
    ]
];
$profile = $deptProfiles[$department] ?? $deptProfiles['CICTO'];
$governance = sfc_can_review_brokers($context['user']);
$staffList = $governance ? sfc_user_repository()->allByRole('admin') : [];

sfc_render_head($department . ' | LOCUS-SF', $context, ['page' => 'admin-workspace', 'role' => 'admin']);
sfc_render_header($context, 'admin');
?>
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/admin-workspace.css<?= sfc_asset_version('css/admin-workspace.css') ?>">
<main class="city-workspace" data-city-workspace="overview" data-department="<?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?>">

  <div class="dept-scope-banner <?= $profile['tag'] ?>">
    <div class="dept-scope-info">
      <span class="dept-scope-pill"><?= htmlspecialchars($profile['badge'], ENT_QUOTES, 'UTF-8') ?></span>
      <h1><?= htmlspecialchars($profile['title'], ENT_QUOTES, 'UTF-8') ?></h1>
      <p><?= htmlspecialchars($profile['subtitle'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <div class="dept-scope-responsibilities">
      <?php foreach ($profile['responsibilities'] as $respTitle => $respDesc): ?>
      <div class="dept-resp-item">
        <strong><?= htmlspecialchars($respTitle, ENT_QUOTES, 'UTF-8') ?></strong>
        <span><?= htmlspecialchars($respDesc, ENT_QUOTES, 'UTF-8') ?></span>
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="city-page-heading">
    <div><h2>Department summary &amp; pipeline</h2><p><?= $governance ? 'Monitor broker applications and listing decisions.' : 'Update property attributes and completed assessments.' ?></p></div>
    <a class="city-button" href="<?= htmlspecialchars(sfc_path('/admin-properties.php'), ENT_QUOTES, 'UTF-8') ?>"><?= $governance ? 'Review listings' : 'Manage properties' ?></a>
  </div>
  <p class="city-status" data-workspace-status role="status">Loading workspace…</p>
  <section class="city-stats" aria-label="Overview" data-city-stats></section>
  <div class="city-workspace-grid">
    <section class="city-panel"><div class="city-panel-heading"><h2><?= $governance ? 'Listing reviews' : 'Assessment queue' ?></h2><a href="<?= htmlspecialchars(sfc_path('/admin-properties.php'), ENT_QUOTES, 'UTF-8') ?>">View all</a></div><div data-overview-listings></div></section>
    <section class="city-panel"><div class="city-panel-heading"><h2>MCE &amp; IAI</h2><a href="<?= htmlspecialchars(sfc_path('/property-ranking.php'), ENT_QUOTES, 'UTF-8') ?>">Rankings</a></div><div data-assessment-ranking></div><details class="city-method"><summary>Scoring method</summary><p data-assessment-method></p></details></section>
  </div>
  <?php if ($governance): ?>
  <section class="city-panel city-broker-panel"><div class="city-panel-heading"><h2>Broker verification</h2><a href="https://verification.prc.gov.ph/Verification" target="_blank" rel="noopener noreferrer">Check PRC registration ↗</a></div><div data-broker-reviews><p class="city-empty">Loading applications…</p></div></section>
  <?php else: ?>
  <section class="city-panel"><div class="city-panel-heading"><h2>Department tools</h2></div><div class="city-tool-links"><a href="<?= htmlspecialchars(sfc_path('/admin-properties.php?add=1'), ENT_QUOTES, 'UTF-8') ?>">Add a property →</a><a href="<?= htmlspecialchars(sfc_path('/property-explorer.php'), ENT_QUOTES, 'UTF-8') ?>">Map explorer →</a><a href="<?= htmlspecialchars(sfc_path('/profile.php'), ENT_QUOTES, 'UTF-8') ?>">Your profile →</a></div></section>
  <?php endif; ?>
  <?php if ($governance): ?>
  <section class="city-panel city-broker-panel">
    <div class="city-panel-heading">
      <div>
        <h2>City Staff Accounts</h2>
        <p class="city-help" style="margin-top:4px">Provision and view authorized access for CICTO, Assessors, and LEBDO.</p>
      </div>
    </div>

    <?php
    $cictoCount = count(array_filter($staffList, static fn (array $s): bool => ($s['department'] ?? '') === 'CICTO'));
    $assessorCount = count(array_filter($staffList, static fn (array $s): bool => ($s['department'] ?? '') === 'ASSESSOR'));
    $lebdoCount = count(array_filter($staffList, static fn (array $s): bool => ($s['department'] ?? '') === 'LEBDO'));
    ?>
    <div class="city-staff-stat-bar">
      <div class="city-staff-stat-card cicto">
        <span class="stat-dot"></span>
        <div>
          <strong>CICTO Governance</strong>
          <span class="stat-count"><?= $cictoCount ?> Active Personnel</span>
        </div>
      </div>
      <div class="city-staff-stat-card assessor">
        <span class="stat-dot"></span>
        <div>
          <strong>City Assessor (CAO)</strong>
          <span class="stat-count"><?= $assessorCount ?> Active Personnel</span>
        </div>
      </div>
      <div class="city-staff-stat-card lebdo">
        <span class="stat-dot"></span>
        <div>
          <strong>LEBDO Economic Dev</strong>
          <span class="stat-count"><?= $lebdoCount ?> Active Personnel</span>
        </div>
      </div>
    </div>

    <div class="city-staff-directory">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <h3 style="margin:0">Active Department Personnel</h3>
        <div class="city-staff-filter-bar">
          <button type="button" class="city-staff-filter-btn is-active" data-filter="all">All (<?= count($staffList) ?>)</button>
          <button type="button" class="city-staff-filter-btn" data-filter="cicto">CICTO</button>
          <button type="button" class="city-staff-filter-btn" data-filter="assessor">Assessors</button>
          <button type="button" class="city-staff-filter-btn" data-filter="lebdo">LEBDO</button>
        </div>
      </div>
      <div class="city-staff-table-wrap">
        <table class="city-ranking-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Department</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="cityStaffList">
            <?php foreach ($staffList as $staff): ?>
            <tr>
              <td><strong><?= htmlspecialchars((string) ($staff['name'] ?? 'Staff'), ENT_QUOTES, 'UTF-8') ?></strong></td>
              <td><span class="city-pill <?= strtolower((string) ($staff['department'] ?? '')) ?>"><?= htmlspecialchars((string) ($staff['department'] ?? 'CICTO'), ENT_QUOTES, 'UTF-8') ?></span></td>
              <td><?= htmlspecialchars((string) ($staff['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?></td>
              <td><span class="city-pill approved">Active</span></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>

    <details class="city-staff-provision-details" open style="margin-top:24px;border-top:1px solid #eef0f3;padding-top:20px">
      <summary style="cursor:pointer;font-weight:600;color:#11224d">Provision New Department Account</summary>
      <form id="cityStaffForm" class="city-form-grid" style="margin-top:18px">
        <div class="city-span-2">
          <span style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">Assigned Department</span>
          <div class="city-dept-radio-cards">
            <label class="city-dept-radio-card is-selected">
              <input type="radio" name="department" value="ASSESSOR" checked>
              <strong>Assessors (CAO)</strong>
            </label>
            <label class="city-dept-radio-card">
              <input type="radio" name="department" value="LEBDO">
              <strong>LEBDO Office</strong>
            </label>
            <label class="city-dept-radio-card">
              <input type="radio" name="department" value="CICTO">
              <strong>CICTO Administrator</strong>
            </label>
          </div>
        </div>
        <label>Complete name<input name="name" required maxlength="140" autocomplete="name" placeholder="Full name of personnel"></label>
        <label>Email<input name="email" type="email" required maxlength="190" autocomplete="email" placeholder="official.user@sfcelerate.local"></label>
        <label>Password<input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label>
        <label>Confirm password<input name="confirm_password" type="password" required minlength="8" autocomplete="new-password" placeholder="Re-type password"></label>
        <p class="city-form-message city-span-2" id="cityStaffStatus" role="status"></p>
        <div class="city-span-2"><button class="city-button" type="submit">Create department account</button></div>
      </form>
    </details>
  </section>
  <?php endif; ?>
</main>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<?php if ($governance): ?><script defer src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/city-staff.js<?= sfc_asset_version('js/city-staff.js') ?>"></script><?php endif; ?>
<?php sfc_render_footer($context); ?>
