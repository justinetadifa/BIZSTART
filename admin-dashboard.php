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
<link rel="stylesheet" href="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<main class="city-workspace" data-city-workspace="overview" data-department="<?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?>">

  <div class="tw-mb-7 tw-rounded-2xl tw-bg-[#11224d] tw-p-6 sm:tw-p-8">
    <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4"><span class="tw-inline-flex tw-rounded-full tw-border tw-border-white/20 tw-px-3 tw-py-1 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-white/80">City workspace · <?= htmlspecialchars($department, ENT_QUOTES, 'UTF-8') ?></span><span class="tw-text-xs tw-text-white/60"><?= htmlspecialchars($profile['badge'], ENT_QUOTES, 'UTF-8') ?></span></div>
    <h1 class="tw-mb-0 tw-mt-5 tw-text-3xl tw-font-semibold tw-tracking-tight tw-text-white"><?= $governance ? 'A clear view of city listings.' : ($department === 'ASSESSOR' ? 'Assess sites with confidence.' : 'Connect investment to opportunity.') ?></h1><p class="tw-mb-0 tw-mt-3 tw-max-w-2xl tw-text-sm tw-leading-relaxed tw-text-white/70"><?= $governance ? 'Review properties, verify brokers, and manage your city team.' : ($department === 'ASSESSOR' ? 'Maintain land records and record evidence for all seven assessment criteria.' : 'Manage growth corridors, open listings, and investor inquiries.') ?></p>
    <details class="tw-mt-5 tw-border-t tw-border-white/15 tw-pt-4"><summary class="tw-cursor-pointer tw-text-xs tw-font-medium tw-text-white/80">Your department's responsibilities</summary><div class="tw-mt-4 tw-grid tw-gap-4 sm:tw-grid-cols-3">
      <?php foreach ($profile['responsibilities'] as $respTitle => $respDesc): ?>
      <div class="tw-rounded-lg tw-bg-white/5 tw-p-4">
        <strong class="tw-block tw-text-xs tw-font-medium tw-text-white"><?= htmlspecialchars($respTitle, ENT_QUOTES, 'UTF-8') ?></strong>
        <span class="tw-mt-2 tw-block tw-text-xs tw-leading-relaxed tw-text-white/60"><?= htmlspecialchars($respDesc, ENT_QUOTES, 'UTF-8') ?></span>
      </div>
      <?php endforeach; ?>
    </div></details>
  </div>

  <div class="city-page-heading">
    <div><h2>Today's workspace</h2><p><?= $governance ? 'The reviews and decisions that need your attention.' : 'The sites ready for your department to assess.' ?></p></div>
    <a class="city-button" href="<?= htmlspecialchars(sfc_path('/admin-properties.php'), ENT_QUOTES, 'UTF-8') ?>"><?= $governance ? 'Review listings' : 'Manage properties' ?></a>
  </div>
  <p class="city-status" data-workspace-status role="status">Loading workspace…</p>
  <section class="tw-mb-6 tw-grid tw-grid-cols-2 tw-gap-3 lg:tw-grid-cols-4" aria-label="Overview" data-city-stats></section>
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
  <?php
  $getInitials = static function(string $name): string {
      $parts = preg_split('/\s+/', trim($name)) ?: [];
      if (count($parts) >= 2) {
          return strtoupper(substr($parts[0], 0, 1) . substr($parts[1], 0, 1));
      }
      return strtoupper(substr($name, 0, 2));
  };
  $getRoleDesc = static function(string $dept): string {
      return match (strtoupper($dept)) {
          'ASSESSOR' => "CAO · Cadastral & MCE Assessment",
          'LEBDO' => "LEBDO · Local Economic Development",
          'CICTO' => "CICTO · Governance & Administration",
          default => "Authorized Municipal Staff"
      };
  };
  $cictoCount = count(array_filter($staffList, static fn (array $s): bool => ($s['department'] ?? '') === 'CICTO'));
  $assessorCount = count(array_filter($staffList, static fn (array $s): bool => ($s['department'] ?? '') === 'ASSESSOR'));
  $lebdoCount = count(array_filter($staffList, static fn (array $s): bool => ($s['department'] ?? '') === 'LEBDO'));
  ?>
  <section class="city-panel city-broker-panel city-staff-panel">
    <div class="city-panel-heading" style="border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:20px">
      <div>
        <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:3px;border:1px solid #9E1B22;background:rgba(158,27,34,0.05);color:#9E1B22;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">
          <span style="width:6px;height:6px;border-radius:50%;background:#9E1B22"></span>
          Access &amp; Governance
        </div>
        <h2 style="font-size:22px;letter-spacing:-0.02em;color:#11224D;margin:0 0 4px">City Staff Accounts</h2>
        <p class="city-help" style="margin:0">Provision, monitor, and manage authorized access for CICTO, Assessors, and LEBDO personnel.</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="city-badge-count" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:4px;border:1px solid #e2e8f0;background:#f8fafc;font-size:12px;font-weight:600;color:#11224D">
          <span style="width:7px;height:7px;border-radius:50%;background:#10b981"></span>
          <?= count($staffList) ?> Total Authorized
        </span>
      </div>
    </div>

    <div class="city-staff-stat-bar">
      <div class="city-staff-stat-card cicto">
        <div class="stat-card-top">
          <span class="stat-badge cicto">CICTO</span>
          <span class="stat-status-dot"></span>
        </div>
        <div class="stat-card-main">
          <span class="stat-number"><?= $cictoCount ?></span>
          <div class="stat-labels">
            <strong>CICTO Governance</strong>
            <span class="stat-count"><?= $cictoCount ?> Active Personnel</span>
          </div>
        </div>
        <div class="stat-card-footer">PRC Review · System Admin</div>
      </div>
      <div class="city-staff-stat-card assessor">
        <div class="stat-card-top">
          <span class="stat-badge assessor">CAO</span>
          <span class="stat-status-dot"></span>
        </div>
        <div class="stat-card-main">
          <span class="stat-number"><?= $assessorCount ?></span>
          <div class="stat-labels">
            <strong>City Assessor (CAO)</strong>
            <span class="stat-count"><?= $assessorCount ?> Active Personnel</span>
          </div>
        </div>
        <div class="stat-card-footer">Cadastral &amp; 7-Factor MCE</div>
      </div>
      <div class="city-staff-stat-card lebdo">
        <div class="stat-card-top">
          <span class="stat-badge lebdo">LEBDO</span>
          <span class="stat-status-dot"></span>
        </div>
        <div class="stat-card-main">
          <span class="stat-number"><?= $lebdoCount ?></span>
          <div class="stat-labels">
            <strong>LEBDO Economic Dev</strong>
            <span class="stat-count"><?= $lebdoCount ?> Active Personnel</span>
          </div>
        </div>
        <div class="stat-card-footer">Corridors &amp; Commercial Match</div>
      </div>
    </div>

    <div class="city-staff-directory">
      <div class="city-staff-directory-header">
        <h3 style="margin:0;font-size:14px;font-weight:700;color:#11224D">Active Department Personnel</h3>
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
            <?php foreach ($staffList as $staff): 
              $sName = (string) ($staff['name'] ?? 'Staff');
              $sDept = (string) ($staff['department'] ?? 'CICTO');
              $sEmail = (string) ($staff['email'] ?? '');
              $sInitials = $getInitials($sName);
              $sRole = $getRoleDesc($sDept);
            ?>
            <tr>
              <td>
                <div class="city-staff-user-cell">
                  <span class="city-staff-avatar <?= strtolower($sDept) ?>"><?= htmlspecialchars($sInitials, ENT_QUOTES, 'UTF-8') ?></span>
                  <div class="city-staff-user-meta">
                    <strong><?= htmlspecialchars($sName, ENT_QUOTES, 'UTF-8') ?></strong>
                    <small><?= htmlspecialchars($sRole, ENT_QUOTES, 'UTF-8') ?></small>
                  </div>
                </div>
              </td>
              <td><span class="city-pill <?= strtolower($sDept) ?>"><?= htmlspecialchars($sDept, ENT_QUOTES, 'UTF-8') ?></span></td>
              <td><span class="city-staff-email"><?= htmlspecialchars($sEmail, ENT_QUOTES, 'UTF-8') ?></span></td>
              <td><span class="city-pill approved"><span class="status-indicator-dot"></span> Active</span></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>

    <details class="city-staff-provision-details">
      <summary class="city-provision-summary">
        <div class="summary-left">
          <div class="summary-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </div>
          <div>
            <strong>Provision New Department Account</strong>
            <p>Grant authenticated municipal dashboard credentials to authorized personnel.</p>
          </div>
        </div>
        <span class="summary-badge">Authorized Staff Only</span>
      </summary>
      <form id="cityStaffForm" class="city-form-grid">
        <div class="city-span-2">
          <label class="city-label" style="display:block;margin-bottom:6px">Assigned Department</label>
          <div class="city-dept-radio-cards">
            <label class="city-dept-radio-card is-selected" data-dept="ASSESSOR">
              <div class="dept-radio-inner">
                <input type="radio" name="department" value="ASSESSOR" checked>
                <div class="dept-radio-text">
                  <div class="dept-radio-head">
                    <strong>Assessors (CAO)</strong>
                    <span class="dept-chip assessor">Valuation</span>
                  </div>
                  <small>Cadastral Records &amp; 7-Factor MCE</small>
                </div>
              </div>
            </label>
            <label class="city-dept-radio-card" data-dept="LEBDO">
              <div class="dept-radio-inner">
                <input type="radio" name="department" value="LEBDO">
                <div class="dept-radio-text">
                  <div class="dept-radio-head">
                    <strong>LEBDO Office</strong>
                    <span class="dept-chip lebdo">Economic</span>
                  </div>
                  <small>Commercial Corridors &amp; Matching</small>
                </div>
              </div>
            </label>
            <label class="city-dept-radio-card" data-dept="CICTO">
              <div class="dept-radio-inner">
                <input type="radio" name="department" value="CICTO">
                <div class="dept-radio-text">
                  <div class="dept-radio-head">
                    <strong>CICTO Admin</strong>
                    <span class="dept-chip cicto">Governance</span>
                  </div>
                  <small>Broker Review &amp; Municipal Control</small>
                </div>
              </div>
            </label>
          </div>
        </div>
        <div class="city-field-group">
          <label class="city-label" for="staffInputName">Complete name</label>
          <input id="staffInputName" name="name" required maxlength="140" autocomplete="name" placeholder="Full name of personnel">
        </div>
        <div class="city-field-group">
          <label class="city-label" for="staffInputEmail">Official email</label>
          <input id="staffInputEmail" name="email" type="email" required maxlength="190" autocomplete="email" placeholder="official.user@sfcelerate.local">
          <span class="city-input-hint">Must be an authorized @sfcelerate.local address</span>
        </div>
        <div class="city-field-group">
          <label class="city-label" for="staffInputPass">Password</label>
          <input id="staffInputPass" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters">
          <span class="city-input-hint">Minimum 8 characters with numbers or symbols</span>
        </div>
        <div class="city-field-group">
          <label class="city-label" for="staffInputConfirm">Confirm password</label>
          <input id="staffInputConfirm" name="confirm_password" type="password" required minlength="8" autocomplete="new-password" placeholder="Re-type password">
        </div>
        <p class="city-form-message city-span-2" id="cityStaffStatus" role="status"></p>
        <div class="city-span-2 city-form-actions">
          <button class="city-button" type="submit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Create department account
          </button>
          <span class="city-security-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#059669;margin-right:4px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Immediate activation with strict role RBAC
          </span>
        </div>
      </form>
    </details>
  </section>
  <?php endif; ?>
</main>
<script src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<?php if ($governance): ?><script defer src="<?= htmlspecialchars($context['assetBase'], ENT_QUOTES, 'UTF-8') ?>/js/city-staff.js<?= sfc_asset_version('js/city-staff.js') ?>"></script><?php endif; ?>
<?php sfc_render_footer($context); ?>
