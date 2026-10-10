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
        'title' => 'City Listings Dashboard',
        'subtitle' => 'Review properties and manage technical access for your city team.',
        'responsibilities' => [
            'Technical administration' => 'Manage accounts and authorize CAO or LEBDO broker reviewers.',
            'Listing review' => 'Review property evidence and decide which listings are published.',
            'City team' => 'Create accounts for authorized CICTO, Assessor, and LEBDO personnel.',
        ],
    ],
    'ASSESSOR' => [
        'title' => 'City Property Records',
        'subtitle' => 'Keep property records, land use, and site evidence up to date.',
        'responsibilities' => [
            'Property records' => 'Maintain lot dimensions, valuation records, and land classifications.',
            'Site evidence' => 'Check supporting documents and record verified property information.',
            'Investment scores' => 'Review the MCE and IAI results alongside their supporting evidence.',
        ],
    ],
    'LEBDO' => [
        'title' => 'City Investment Dashboard',
        'subtitle' => 'Connect investors with properties and support local business opportunities.',
        'responsibilities' => [
            'Investment opportunities' => 'Match investment needs with suitable local properties.',
            'Local context' => 'Maintain nearby business information and investment corridor records.',
            'Investor support' => 'Coordinate inquiries, property contacts, and site visits.',
        ],
    ],
];
$profile = $deptProfiles[$department] ?? $deptProfiles['CICTO'];
$governance = sfc_can_review_listings($context['user']);
$brokerReviewer = sfc_can_review_brokers($context['user']);
$technicalAdmin = sfc_can_administer_city($context['user']);
if ($brokerReviewer) {
    $profile['responsibilities']['Broker applications'] = 'Review PRC credentials and document application decisions.';
}
$staffList = $technicalAdmin ? sfc_user_repository()->allByRole('admin') : [];
$investorsList = sfc_user_repository()->allInvestorsWithActivity();
$onlineInvestorsCount = count(array_filter($investorsList, static fn (array $i): bool => !empty($i['isOnline'])));
$totalInvestorsCount = count($investorsList);
$totalShortlistsCount = array_sum(array_column($investorsList, 'shortlistsCount'));
$totalVisitsCount = array_sum(array_column($investorsList, 'visitsCount'));
$today = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
$escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
sfc_render_head($department . ' | LOCUS-SF', $context, ['page' => 'admin-workspace', 'role' => 'admin']);
sfc_render_header($context, 'admin');
?>
<link rel="stylesheet" href="<?= $escape($context['assetBase']) ?>/css/admin-workspace.css<?= sfc_asset_version('css/admin-workspace.css') ?>">
<link rel="stylesheet" href="<?= $escape($context['assetBase']) ?>/css/workspace-polish.css<?= sfc_asset_version('css/workspace-polish.css') ?>">
<link rel="stylesheet" href="<?= $escape($context['assetBase']) ?>/css/broker-avatar.css<?= sfc_asset_version('css/broker-avatar.css') ?>">
<link rel="stylesheet" href="<?= $escape($context['assetBase']) ?>/css/broker-verification.css<?= sfc_asset_version('css/broker-verification.css') ?>">
<main class="city-workspace tw-min-w-0 tw-max-w-[1320px] tw-px-3 tw-pb-12 tw-pt-5 sm:tw-px-6 sm:tw-pt-7 lg:tw-px-8" data-city-workspace="overview" data-department="<?= $escape($department) ?>" data-listing-reviewer="<?= $governance ? 'true' : 'false' ?>" data-broker-reviewer="<?= $brokerReviewer ? 'true' : 'false' ?>">
  <section class="tw-relative tw-isolate tw-overflow-hidden tw-rounded-[32px] tw-bg-ink tw-shadow-2xl" aria-labelledby="cityOverviewTitle">
    <img src="<?= $escape($context['assetBase']) ?>/images/admin-city.jpg" class="tw-absolute tw-inset-0 tw-h-full tw-w-full tw-object-cover tw-object-[center_58%]" alt="" fetchpriority="high">
    <div class="tw-absolute tw-inset-0 tw-bg-[linear-gradient(90deg,rgba(8,22,49,0.90)_0%,rgba(17,34,77,0.58)_55%,rgba(17,34,77,0.20)_100%)]"></div>
    
    <!-- Glassmorphic "TODAY" Capsule at Top Right (Current Date & Live Time) -->
    <div class="tw-absolute tw-top-5 tw-right-5 sm:tw-top-6 sm:tw-right-6 tw-z-20 tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-white/25 tw-bg-black/35 tw-backdrop-blur-md tw-px-4 tw-py-2.5 tw-text-white tw-shadow-xl" id="adminTodayCapsule">
      <svg class="tw-h-5 tw-w-5 tw-shrink-0 tw-text-white/85" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="3"/>
        <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>
      </svg>
      <div>
        <span class="tw-block tw-text-[9.5px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-white/70">TODAY</span>
        <time class="tw-block tw-text-xs sm:tw-text-sm tw-font-bold tw-text-white" data-overview-date datetime="<?= $today->format('Y-m-d') ?>">
          <?= $today->format('M j, Y') ?>
        </time>
        <span class="tw-block tw-text-[10px] tw-font-medium tw-text-white/80" id="adminHeroLiveTime"></span>
      </div>
    </div>

    <!-- Banner Content & Capsule Overlay Buttons -->
    <div class="tw-relative tw-z-10 tw-flex tw-flex-col tw-justify-between tw-min-h-[220px] sm:tw-min-h-[240px] tw-p-6 sm:tw-p-8 sm:tw-pt-7 sm:tw-pb-8">
      <div class="tw-min-w-0 tw-max-w-2xl">
        <h1 id="cityOverviewTitle" class="tw-mb-1.5 tw-text-2xl sm:tw-text-3xl lg:tw-text-[36px] tw-font-black tw-leading-tight tw-tracking-tight tw-text-white"><?= $escape($profile['title']) ?></h1>
        <p class="tw-mb-0 tw-max-w-xl tw-text-xs sm:tw-text-sm tw-leading-relaxed tw-text-white/85"><?= $escape($profile['subtitle']) ?></p>
      </div>

      <!-- Fully-Rounded Capsule Buttons Directly Overlaying the Image -->
      <div class="tw-mt-7 tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
        <!-- White capsule button with dropdown arrow: "Your responsibilities" -->
        <div class="tw-relative">
          <button type="button" id="responsibilitiesDropdownBtn" class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-bg-white tw-px-4 tw-py-2 tw-text-xs sm:tw-text-[13px] tw-font-bold tw-text-slate-900 tw-shadow-md hover:tw-bg-slate-100 active:tw-scale-[0.98] tw-transition-all cursor-pointer">
            <span>Your responsibilities</span>
            <svg class="tw-h-3.5 tw-w-3.5 tw-text-slate-700 tw-transition-transform tw-duration-200" id="responsibilitiesChevron" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
            </svg>
          </button>
          
          <!-- Dropdown popover for responsibilities -->
          <div id="responsibilitiesMenu" class="tw-hidden tw-absolute tw-left-0 tw-top-full tw-mt-2.5 tw-z-30 tw-w-72 sm:tw-w-84 tw-rounded-2xl tw-border tw-border-slate-100 tw-bg-white tw-p-3.5 tw-shadow-2xl">
            <div class="tw-space-y-2">
              <?php foreach ($profile['responsibilities'] as $title => $description): ?>
              <div class="tw-rounded-xl tw-bg-[#F1F3F7] tw-p-2.5">
                <strong class="tw-block tw-text-xs tw-font-bold tw-text-slate-900"><?= $escape($title) ?></strong>
                <p class="tw-mb-0 tw-mt-0.5 tw-text-[11px] tw-leading-relaxed tw-text-slate-600"><?= $escape($description) ?></p>
              </div>
              <?php endforeach; ?>
            </div>
          </div>
        </div>

        <!-- Dark, fully-rounded capsule buttons directly overlaying the image -->
        <a href="#cityStaffPanel" class="tw-inline-flex tw-items-center tw-rounded-full tw-border tw-border-white/20 tw-bg-black/60 tw-backdrop-blur-md tw-px-4 tw-py-2 tw-text-xs sm:tw-text-[13px] tw-font-semibold tw-text-white hover:tw-bg-black/80 hover:tw-border-white/40 tw-transition-all tw-no-underline">
          Technical administration
        </a>
        <a href="<?= $escape(sfc_path('/admin-properties.php')) ?>" class="tw-inline-flex tw-items-center tw-rounded-full tw-border tw-border-white/20 tw-bg-black/60 tw-backdrop-blur-md tw-px-4 tw-py-2 tw-text-xs sm:tw-text-[13px] tw-font-semibold tw-text-white hover:tw-bg-black/80 hover:tw-border-white/40 tw-transition-all tw-no-underline">
          Listing review
        </a>
        <a href="#cityStaffPanel" class="tw-inline-flex tw-items-center tw-rounded-full tw-border tw-border-white/20 tw-bg-black/60 tw-backdrop-blur-md tw-px-4 tw-py-2 tw-text-xs sm:tw-text-[13px] tw-font-semibold tw-text-white hover:tw-bg-black/80 hover:tw-border-white/40 tw-transition-all tw-no-underline">
          City team
        </a>
      </div>
    </div>
  </section>
  <p class="city-status tw-mb-0 tw-mt-3 tw-min-h-0 tw-text-xs empty:tw-hidden" data-workspace-status role="status">Loading workspace…</p>
  <section class="tw-mb-6 tw-mt-5 tw-grid tw-grid-cols-1 tw-gap-3.5 min-[400px]:tw-grid-cols-2 lg:tw-grid-cols-4" aria-label="Overview" data-city-stats></section>
  <div class="tw-grid tw-min-w-0 tw-gap-6 lg:tw-grid-cols-[1.1fr_1fr]">
    <section class="tw-min-w-0 tw-rounded-[28px] tw-border tw-border-slate-100 tw-bg-white tw-p-5 sm:tw-p-6 tw-shadow-[0_10px_28px_rgba(17,34,77,0.06)]">
      <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
        <div>
          <h2 class="tw-m-0 tw-text-lg sm:tw-text-xl tw-font-bold tw-text-slate-900"><?= $governance ? 'Listing reviews' : 'Property records' ?></h2>
          <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500"><?= $governance ? 'Properties ready for a city decision.' : 'Keep site information complete and current.' ?></p>
        </div>
        <a class="tw-text-xs sm:tw-text-[13px] tw-font-bold tw-text-[#9e1b22] hover:tw-underline tw-no-underline" href="<?= $escape(sfc_path('/admin-properties.php')) ?>">View all &rarr;</a>
      </div>
      <div data-overview-listings></div>
    </section>
    <section class="tw-min-w-0 tw-rounded-[28px] tw-border tw-border-slate-100 tw-bg-white tw-p-5 sm:tw-p-6 tw-shadow-[0_10px_28px_rgba(17,34,77,0.06)]">
      <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
        <div>
          <h2 class="tw-m-0 tw-text-lg sm:tw-text-xl tw-font-bold tw-text-slate-900">MCE &amp; IAI</h2>
          <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">Top scored, properties charts.</p>
        </div>
        <a class="tw-text-xs sm:tw-text-[13px] tw-font-bold tw-text-[#9e1b22] hover:tw-underline tw-no-underline" href="<?= $escape(sfc_path('/property-ranking.php')) ?>">Priority board &rarr;</a>
      </div>
      <div data-assessment-ranking></div>
      <details class="tw-mt-4 tw-border-t tw-border-slate-100 tw-pt-3 tw-text-xs tw-leading-relaxed tw-text-slate-500">
        <summary class="tw-cursor-pointer tw-font-semibold hover:tw-text-[#9e1b22] tw-transition-colors">How scores are calculated</summary>
        <p class="tw-mb-0 tw-mt-2" data-assessment-method></p>
      </details>
    </section>
  </div>
  <script>
    (() => {
      // Toggle responsibilities dropdown
      const btn = document.getElementById('responsibilitiesDropdownBtn');
      const menu = document.getElementById('responsibilitiesMenu');
      const chevron = document.getElementById('responsibilitiesChevron');
      if (btn && menu) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isClosed = menu.classList.contains('tw-hidden');
          menu.classList.toggle('tw-hidden', !isClosed);
          if (chevron) chevron.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
        });
        document.addEventListener('click', (e) => {
          if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('tw-hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
          }
        });
      }

      // Live time ticker for glassmorphic today capsule
      const liveTime = document.getElementById('adminHeroLiveTime');
      function tickClock() {
        if (liveTime) {
          const now = new Date();
          liveTime.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        }
      }
      tickClock();
      setInterval(tickClock, 1000);
    })();
  </script>
  <?php if ($brokerReviewer): ?>
  <section class="tw-mt-8 tw-min-w-0" aria-labelledby="adminBrokerVerificationTitle">
    <div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
      <div>
        <h2 id="adminBrokerVerificationTitle" class="tw-m-0 tw-text-2xl tw-font-bold tw-text-slate-900">Broker verification</h2>
        <p class="tw-mb-0 tw-mt-1.5 tw-text-sm tw-text-slate-500">Authorized CAO and LEBDO reviewers check both ID images and record their decision. Email ownership is verified separately.</p>
      </div>
      <a class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-rose-200 tw-bg-white tw-px-3.5 tw-py-2 tw-text-xs tw-font-semibold tw-text-[#9e1b22] tw-no-underline hover:tw-bg-rose-50/70 tw-transition-colors" href="https://verification.prc.gov.ph/Verification" target="_blank" rel="noopener noreferrer">
        Check PRC registration &nearr;
      </a>
    </div>
    <div data-broker-reviews><p class="city-empty">Loading applications…</p></div>
  </section>
  <?php else: ?>
  <section class="tw-mt-5 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-5"><h2 class="tw-m-0 tw-text-base tw-font-semibold tw-text-ink">Department tools</h2><div class="tw-mt-4 tw-flex tw-flex-wrap tw-gap-5 tw-text-xs"><a href="<?= $escape(sfc_path('/admin-properties.php?add=1')) ?>">Add a property →</a><a href="<?= $escape(sfc_path('/property-explorer.php')) ?>">Map explorer →</a><a href="<?= $escape(sfc_path('/profile.php')) ?>">Your profile →</a><a href="#cityInvestorsPanel">Active investors (<?= $onlineInvestorsCount ?> online) →</a></div></section>
  <?php endif; ?>

  <section class="city-investors-panel tw-mt-5 tw-min-w-0 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-p-5" id="cityInvestorsPanel" aria-labelledby="cityInvestorsTitle">
    <div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-4">
      <div class="tw-min-w-0">
        <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
          <h2 id="cityInvestorsTitle" class="tw-m-0 tw-text-base tw-font-semibold tw-text-ink">Registered &amp; Active Investors</h2>
          <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full <?= $onlineInvestorsCount > 0 ? 'tw-bg-emerald-50 tw-text-emerald-700' : 'tw-bg-slate-100 tw-text-slate-600' ?> tw-px-2.5 tw-py-0.5 tw-text-[11px] tw-font-medium" data-investors-live-pill>
            <span class="tw-relative tw-flex tw-h-2 tw-w-2">
              <span class="tw-absolute tw-inline-flex tw-h-full tw-w-full <?= $onlineInvestorsCount > 0 ? 'tw-animate-ping tw-bg-emerald-400' : '' ?> tw-rounded-full tw-opacity-75"></span>
              <span class="tw-relative tw-inline-flex tw-h-2 tw-w-2 tw-rounded-full <?= $onlineInvestorsCount > 0 ? 'tw-bg-emerald-500' : 'tw-bg-slate-400' ?>"></span>
            </span>
            <span data-investors-live-count><?= $onlineInvestorsCount ?> online now</span>
          </span>
        </div>
        <p class="tw-mb-0 tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">
          Monitor investor presence on LOCUS-SF, property shortlists, scheduled site visits, and inquiry activity.
        </p>
      </div>

      <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-xs" data-investor-kpis>
        <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1.5 tw-text-slate-600">
          <strong class="tw-font-bold tw-text-ink"><?= $totalInvestorsCount ?></strong> registered
        </span>
        <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1.5 tw-text-slate-600">
          <strong class="tw-font-bold tw-text-[#9e1b22]"><?= $totalShortlistsCount ?></strong> shortlists
        </span>
        <span class="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-1.5 tw-text-slate-600">
          <strong class="tw-font-bold tw-text-ink"><?= $totalVisitsCount ?></strong> site visits
        </span>
      </div>
    </div>

    <!-- Filter and Search Bar -->
    <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-slate-100 tw-pb-4">
      <div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-wrap tw-items-center tw-gap-2">
        <div class="tw-relative tw-min-w-[200px] tw-flex-1 sm:tw-max-w-xs">
          <input type="search" id="investorSearchInput" class="tw-w-full tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50/70 tw-py-2 tw-pl-9 tw-pr-3 tw-text-xs tw-text-ink placeholder:tw-text-slate-400 focus:tw-border-[#11224d] focus:tw-bg-white focus:tw-outline-none" placeholder="Search investor, email, phone, location...">
          <svg class="tw-absolute tw-left-2.5 tw-top-2.5 tw-h-4 tw-w-4 tw-text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>

        <div class="city-staff-filter-bar tw-gap-1" role="group" aria-label="Filter investors by presence">
          <button type="button" class="city-staff-filter-btn is-active tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-presence-filter="all">All (<span data-count-all><?= $totalInvestorsCount ?></span>)</button>
          <button type="button" class="city-staff-filter-btn tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-presence-filter="online">Active Now (<span data-count-online><?= $onlineInvestorsCount ?></span>)</button>
          <button type="button" class="city-staff-filter-btn tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-presence-filter="recent">Active Today (<span data-count-recent><?= count(array_filter($investorsList, static fn ($i) => ($i['presenceState'] ?? '') === 'recent')) ?></span>)</button>
        </div>

        <select id="investorVerificationFilter" class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-[11px] tw-text-slate-600 focus:tw-border-[#11224d] focus:tw-outline-none" aria-label="Filter by verification">
          <option value="all">All verifications</option>
          <option value="verified">Verified only</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending review</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <button type="button" id="refreshInvestorsBtn" class="tw-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-[11px] tw-font-semibold tw-text-slate-600 hover:tw-bg-slate-50" title="Refresh live investor presence">
        <svg class="tw-h-3.5 tw-w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
        Refresh presence
      </button>
    </div>

    <!-- Investors Table Container -->
    <div class="city-investors-table-wrap tw-min-w-0 tw-overflow-x-auto tw-rounded-lg" data-investors-container>
      <table class="city-ranking-table tw-min-w-[760px] [&_th]:tw-px-3.5 [&_th]:tw-py-3 [&_th]:tw-text-[11px] [&_td]:tw-px-3.5 [&_td]:tw-py-3.5">
        <thead>
          <tr class="tw-border-b tw-border-slate-200 tw-bg-slate-50/80">
            <th class="tw-text-left">Investor profile</th>
            <th class="tw-text-left">Presence status</th>
            <th class="tw-text-left">Verification</th>
            <th class="tw-text-left">Engagement on LOCUS-SF</th>
            <th class="tw-text-left">Contact details</th>
            <th class="tw-text-right">Action</th>
          </tr>
        </thead>
        <tbody class="tw-divide-y tw-divide-slate-100">
          <?php foreach ($investorsList as $inv):
              $iName = (string) ($inv['name'] ?? 'Investor');
              $iInitials = strtoupper(implode('', array_map(static fn (string $part): string => substr($part, 0, 1), array_slice(preg_split('/\s+/', trim($iName)) ?: [], 0, 2))));
              $iIsOnline = !empty($inv['isOnline']);
              $iPresenceState = (string) ($inv['presenceState'] ?? 'offline');
              $iPresenceLabel = (string) ($inv['presenceLabel'] ?? 'Offline');
              $iStatus = (string) ($inv['identityVerificationStatus'] ?? 'unverified');
              $iShortlists = (int) ($inv['shortlistsCount'] ?? 0);
              $iVisits = (int) ($inv['visitsCount'] ?? 0);
              $iDocs = (int) ($inv['documentRequestsCount'] ?? 0);
          ?>
          <tr class="tw-transition hover:tw-bg-slate-50/70" data-investor-row="<?= (int) $inv['id'] ?>">
            <td>
              <div class="tw-flex tw-items-center tw-gap-3">
                <div class="tw-relative">
                  <?php if (!empty($inv['profileImageUrl'])): ?>
                    <img src="<?= $escape(sfc_path('/' . ltrim($inv['profileImageUrl'], '/'))) ?>" alt="" class="tw-h-10 tw-w-10 tw-shrink-0 tw-rounded-full tw-object-cover tw-border tw-border-slate-200">
                  <?php else: ?>
                    <span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-[#11224d]/10 tw-text-xs tw-font-bold tw-text-[#11224d]"><?= $escape($iInitials) ?></span>
                  <?php endif; ?>
                  <span class="tw-absolute -tw-bottom-0.5 -tw-right-0.5 tw-rounded-full tw-bg-white tw-p-0.5">
                    <?php if ($iIsOnline): ?>
                      <span class="tw-relative tw-inline-flex tw-h-2.5 tw-w-2.5">
                        <span class="tw-absolute tw-inline-flex tw-h-full tw-w-full tw-animate-ping tw-rounded-full tw-bg-emerald-400 tw-opacity-75"></span>
                        <span class="tw-relative tw-inline-flex tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-emerald-500"></span>
                      </span>
                    <?php elseif ($iPresenceState === 'recent'): ?>
                      <span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-amber-400"></span>
                    <?php else: ?>
                      <span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-slate-300"></span>
                    <?php endif; ?>
                  </span>
                </div>
                <div class="tw-min-w-0">
                  <strong class="tw-block tw-text-xs tw-font-bold tw-text-ink hover:tw-text-[#9e1b22] tw-cursor-pointer" data-open-dossier="<?= (int) $inv['id'] ?>"><?= $escape($iName) ?></strong>
                  <span class="tw-mt-0.5 tw-block tw-text-[11px] tw-text-slate-500 tw-truncate tw-max-w-[200px]"><?= $escape((string) $inv['email']) ?></span>
                </div>
              </div>
            </td>
            <td>
              <div class="tw-flex tw-items-center tw-gap-2">
                <span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-full <?= $iIsOnline ? 'tw-bg-emerald-500' : ($iPresenceState === 'recent' ? 'tw-bg-amber-400' : 'tw-bg-slate-300') ?>"></span>
                <span class="tw-text-xs <?= $iIsOnline ? 'tw-text-emerald-700 tw-font-medium' : ($iPresenceState === 'recent' ? 'tw-text-amber-800' : 'tw-text-slate-500') ?>"><?= $escape($iPresenceLabel) ?></span>
              </div>
            </td>
            <td>
              <span class="tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-[10px] tw-font-semibold <?= $iStatus === 'verified' ? 'tw-bg-emerald-50 tw-text-emerald-700' : ($iStatus === 'pending' ? 'tw-bg-amber-50 tw-text-amber-800' : ($iStatus === 'suspended' ? 'tw-bg-rose-50 tw-text-rose-700' : 'tw-bg-slate-100 tw-text-slate-600')) ?>">
                <?= ucfirst($escape($iStatus)) ?>
              </span>
            </td>
            <td>
              <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-1.5">
                <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-red-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-[#9e1b22]">
                  <?= $iShortlists ?> saved
                </span>
                <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-blue-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-blue-800">
                  <?= $iVisits ?> visits
                </span>
                <?php if ($iDocs > 0): ?>
                <span class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-purple-50 tw-px-2 tw-py-1 tw-text-[10px] tw-font-semibold tw-text-purple-800">
                  <?= $iDocs ?> docs
                </span>
                <?php endif; ?>
              </div>
            </td>
            <td>
              <div class="tw-text-[11px] tw-text-slate-500">
                <span class="tw-block"><?= $escape((string) ($inv['phone'] ?: 'No phone registered')) ?></span>
                <span class="tw-block tw-text-[10px] tw-text-slate-400 tw-truncate tw-max-w-[160px]"><?= $escape((string) ($inv['address'] ?: 'San Fernando, La Union')) ?></span>
              </div>
            </td>
            <td class="tw-text-right">
              <button type="button" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-ink hover:tw-border-[#9e1b22] hover:tw-text-[#9e1b22] hover:tw-bg-red-50/40" data-open-dossier="<?= (int) $inv['id'] ?>">
                View details →
              </button>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Investor Dossier Modal Dialog -->
  <dialog id="investorDossierDialog" class="city-dialog" aria-labelledby="cityInvestorsTitle">
    <!-- Hydrated by admin-investors.js -->
  </dialog>

  <!-- Initial embedded data for instant client-side search & filtering -->
  <script type="application/json" id="initialInvestorsData"><?= json_encode($investorsList, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
  <?php if ($technicalAdmin): ?>
  <?php
  $getInitials = static function (string $name): string {
      $parts = preg_split('/\s+/', trim($name)) ?: [];
      return strtoupper(implode('', array_map(static fn (string $part): string => substr($part, 0, 1), array_slice($parts, 0, 2))));
  };
  $getRoleDesc = static fn (string $dept): string => match (strtoupper($dept)) {
      'ASSESSOR' => 'City Assessor’s Office',
      'LEBDO' => 'Local Economic Development',
      default => 'City Information & Communications',
  };
  ?>
  <section class="city-staff-panel tw-mt-5 tw-min-w-0 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 sm:tw-p-5">
    <div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-4"><div><h2 class="tw-m-0 tw-text-base tw-font-semibold tw-text-ink">Active department personnel</h2><p class="tw-mb-0 tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">Authorized accounts for your city team.</p></div><div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2"><div class="city-staff-filter-bar tw-gap-1" role="group" aria-label="Filter staff by department"><button type="button" class="city-staff-filter-btn is-active tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-filter="all">All</button><button type="button" class="city-staff-filter-btn tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-filter="cicto">CICTO</button><button type="button" class="city-staff-filter-btn tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-filter="assessor">Assessors</button><button type="button" class="city-staff-filter-btn tw-rounded-lg tw-px-3 tw-py-2 tw-text-[11px]" data-filter="lebdo">LEBDO</button></div><button type="button" data-open-staff-form class="tw-cursor-pointer tw-rounded-lg tw-border-0 tw-bg-[#9e1b22] tw-px-3 tw-py-2.5 tw-text-xs tw-font-semibold tw-text-white hover:tw-bg-[#7f151b]">+ Add personnel</button></div></div>
    <div class="city-staff-table-wrap tw-min-w-0 tw-overflow-x-auto tw-rounded-lg tw-shadow-none">
      <table class="city-staff-table tw-w-full">
        <thead>
          <tr>
            <th scope="col" style="width: 28%;">Personnel</th>
            <th scope="col" style="width: 15%;">Department</th>
            <th scope="col" style="width: 25%;">Email</th>
            <th scope="col" style="width: 12%;">Status</th>
            <th scope="col" style="width: 20%;">Broker review access</th>
          </tr>
        </thead>
        <tbody id="cityStaffList">
          <?php foreach ($staffList as $staff):
              $sName = (string) ($staff['name'] ?? 'Staff');
              $sDept = (string) ($staff['department'] ?? 'CICTO');
              $sEmail = (string) ($staff['email'] ?? '');
          ?>
          <tr>
            <td>
              <div class="city-staff-user-cell tw-gap-3">
                <span class="city-staff-avatar <?= $escape(strtolower($sDept)) ?> tw-h-9 tw-w-9 tw-rounded-full tw-border-0"><?= $escape($getInitials($sName)) ?></span>
                <div class="city-staff-user-meta">
                  <strong class="tw-text-xs"><?= $escape($sName) ?></strong>
                  <small class="tw-text-[10px]"><?= $escape($getRoleDesc($sDept)) ?></small>
                </div>
              </div>
            </td>
            <td><span class="city-pill <?= $escape(strtolower($sDept)) ?> tw-font-sans tw-text-[10px] tw-font-medium"><?= $escape($sDept) ?></span></td>
            <td><span class="city-staff-email tw-font-sans tw-text-xs"><?= $escape($sEmail) ?></span></td>
            <td><span class="city-pill approved tw-border-0 tw-text-[10px]"><span class="status-indicator-dot"></span>Active</span></td>
            <td>
              <?php if (in_array(strtoupper($sDept), ['ASSESSOR', 'CAO', 'LEBDO'], true)): ?>
                <label class="broker-staff-permission" title="Toggle broker application review authorization for <?= $escape($sName) ?>">
                  <input type="checkbox" data-broker-review-permission="<?= (int) $staff['id'] ?>" <?= !empty($staff['brokerReviewAuthorized']) ? 'checked' : '' ?> aria-label="Authorize <?= $escape($sName) ?> to review broker applications">
                  <span>Authorized reviewer</span>
                </label>
              <?php else: ?>
                <span class="city-staff-admin-badge" title="Technical administration accounts manage platform infrastructure and cannot review broker applications">
                  <svg class="tw-h-3.5 tw-w-3.5 tw-text-slate-400 tw-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/></svg>
                  <span>Technical administration</span>
                </span>
              <?php endif; ?>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <p class="tw-mb-0 tw-mt-2 tw-text-[10px] tw-text-slate-500 sm:tw-hidden">Swipe the directory to view all columns.</p>
    <details class="city-staff-provision-details tw-mt-4 tw-rounded-lg tw-shadow-none">
      <summary class="city-provision-summary tw-flex-wrap tw-gap-3 tw-bg-slate-50 tw-p-4"><span class="tw-flex tw-min-w-0 tw-items-center tw-gap-3"><span class="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-red-50 tw-text-[#9e1b22]"><svg class="tw-h-4 tw-w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M19 8v6M16 11h6"/></svg></span><span class="tw-min-w-0"><strong class="tw-block tw-text-xs tw-font-semibold tw-text-ink">Provision new department account</strong><span class="tw-mt-1 tw-block tw-text-[11px] tw-leading-relaxed tw-text-slate-500">Create access for authorized personnel.</span></span></span><span class="tw-flex tw-items-center tw-gap-2"><span class="tw-text-[9px] tw-font-medium tw-uppercase tw-tracking-wider tw-text-slate-500">Authorized staff only</span><svg class="provision-chevron tw-h-4 tw-w-4 tw-text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></span></summary>
      <form id="cityStaffForm" class="city-form-grid tw-min-w-0 tw-gap-4 tw-p-4 sm:tw-p-5">
        <fieldset class="city-span-2 tw-m-0 tw-min-w-0 tw-border-0 tw-p-0"><legend class="tw-mb-2 tw-text-xs tw-font-semibold">Assigned department</legend><div class="city-dept-radio-cards tw-m-0 tw-gap-2">
          <?php foreach (['ASSESSOR' => ['Assessors (CAO)', 'Property records'], 'LEBDO' => ['LEBDO Office', 'Investment support'], 'CICTO' => ['CICTO Admin', 'Technical administration']] as $code => [$label, $description]): ?>
          <label class="city-dept-radio-card <?= $code === 'ASSESSOR' ? 'is-selected' : '' ?> tw-p-3" data-dept="<?= $code ?>"><span class="dept-radio-inner"><input type="radio" name="department" value="<?= $code ?>" <?= $code === 'ASSESSOR' ? 'checked' : '' ?>><span class="dept-radio-text"><strong class="tw-block tw-text-xs"><?= $label ?></strong><small><?= $description ?></small></span></span></label>
          <?php endforeach; ?>
        </div></fieldset>
        <div class="city-field-group tw-min-w-0"><label class="city-label" for="staffInputName">Complete name</label><input id="staffInputName" name="name" required maxlength="140" autocomplete="name" placeholder="Full name"></div>
        <div class="city-field-group tw-min-w-0"><label class="city-label" for="staffInputEmail">Official email</label><input id="staffInputEmail" name="email" type="email" required maxlength="190" autocomplete="email" placeholder="name@sfcelerate.local"><span class="city-input-hint">Use an authorized @sfcelerate.local address.</span></div>
        <div class="city-field-group tw-min-w-0"><label class="city-label" for="staffInputPass">Password</label><input id="staffInputPass" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></div>
        <div class="city-field-group tw-min-w-0"><label class="city-label" for="staffInputConfirm">Confirm password</label><input id="staffInputConfirm" name="confirm_password" type="password" required minlength="8" autocomplete="new-password" placeholder="Re-type password"></div>
        <div class="city-staff-provision-permission city-span-2 tw-col-span-full" id="staffBrokerReviewCard">
          <label class="provision-permission-inner" for="staffBrokerReviewer">
            <input type="checkbox" id="staffBrokerReviewer" name="broker_review_authorized" value="1" class="provision-permission-checkbox">
            <div class="permission-text-block">
              <div class="permission-title-row">
                <strong>Authorize broker application review</strong>
                <span class="permission-scope-badge" id="staffBrokerBadge">CAO &amp; LEBDO ONLY</span>
              </div>
              <p>Allow this department account to inspect PRC accreditation credentials and make broker review determinations.</p>
            </div>
          </label>
        </div>
        <p class="city-form-message city-span-2" id="cityStaffStatus" role="status"></p>
        <div class="city-span-2 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
          <button class="city-button tw-w-full sm:tw-w-auto" type="submit">
            <svg class="tw-mr-1.5 tw-h-4 tw-w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/></svg>
            <span>Create department account</span>
          </button>
          <span class="tw-text-[11px] tw-text-slate-500">Access follows the selected department.</span>
        </div>
      </form>
    </details>
  </section>
  <?php endif; ?>
</main>
<script src="<?= $escape($context['assetBase']) ?>/js/admin-overview.js<?= sfc_asset_version('js/admin-overview.js') ?>" defer></script>
<script src="<?= $escape($context['assetBase']) ?>/js/admin-workspace.js<?= sfc_asset_version('js/admin-workspace.js') ?>" defer></script>
<script src="<?= $escape($context['assetBase']) ?>/js/admin-investors.js<?= sfc_asset_version('js/admin-investors.js') ?>" defer></script>
<?php if ($technicalAdmin): ?><script defer src="<?= $escape($context['assetBase']) ?>/js/city-staff.js<?= sfc_asset_version('js/city-staff.js') ?>"></script><?php endif; ?>
<?php sfc_render_footer($context); ?>
