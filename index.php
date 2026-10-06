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
    <div class="city-section-heading">
      <div>
        <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-[3px] border border-[#9E1B22] text-[#9E1B22] text-[10px] font-bold uppercase tracking-widest bg-[#9E1B22]/5 mb-2.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#9E1B22]"></span>
          Strategic Brief
        </div>
        <h2 class="text-3xl font-bold text-[#11224D] tracking-tight">WHY SAN FERNANDO?</h2>
        <p class="text-sm text-[#697284] mt-1 font-normal">A city positioned for business, innovation, and strategic growth.</p>
      </div>
    </div>

    <!-- A. PRIORITY INVESTMENT SECTORS -->
    <div class="mb-10">
      <div class="flex items-center justify-between mb-3.5 pb-2 border-b border-[#dfe3e9]">
        <div class="flex items-center gap-2">
          <span class="w-1 h-3.5 bg-[#9E1B22] rounded-[1px]"></span>
          <h3 class="text-xs font-bold uppercase tracking-wider text-[#11224D] m-0">Priority Investment Sectors</h3>
        </div>
        <span class="text-[10px] font-mono font-semibold text-[#11224D] px-2.5 py-1 rounded-[3px] border border-[#dfe3e9] bg-white">Ordinance No. 2024-41</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <?php
        $sectors = [
          'Agriculture, Agribusiness & Fishery',
          'Tourism & Transportation',
          'Information & Communication Technology',
          'Manufacturing & Processing',
          'Infrastructure, Water, Sanitation & Property Development',
          'Ecological Solid Waste Management',
          'Support Facilities for Agriculture and Food Production',
        ];
        foreach ($sectors as $idx => $sectorName):
        ?>
        <div class="group bg-white border border-[#dfe3e9] rounded-[4px] p-3.5 flex items-start gap-3 hover:border-[#11224D] transition-colors <?= $idx === 6 ? 'lg:col-span-2' : '' ?>">
          <span class="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-[3px] border border-[#9E1B22] text-[#9E1B22] bg-[#9E1B22]/5 font-mono text-[11px] font-bold group-hover:bg-[#9E1B22] group-hover:text-white transition-colors">
            <?= sprintf('%02d', $idx + 1) ?>
          </span>
          <div class="min-w-0 flex-1 flex flex-col justify-center">
            <h4 class="text-xs font-semibold text-[#11224D] leading-snug m-0"><?= $e($sectorName) ?></h4>
            <?php if ($idx === 6): ?>
            <span class="text-[10px] text-[#697284] font-mono mt-0.5 hidden lg:inline">Supply chain, cold chain & processing facilities</span>
            <?php endif; ?>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- B. STRATEGIC INVESTMENT AREAS -->
    <div class="mb-10">
      <div class="flex items-center justify-between mb-3.5 pb-2 border-b border-[#dfe3e9]">
        <div class="flex items-center gap-2">
          <span class="w-1 h-3.5 bg-[#11224D] rounded-[1px]"></span>
          <div class="text-xs font-bold uppercase tracking-wider text-[#11224D]">Strategic Investment Areas</div>
        </div>
        <span class="text-[10px] font-mono text-[#697284]">Prime Growth Corridors</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white border border-[#dfe3e9] border-t-2 border-t-[#9E1B22] rounded-[4px] p-5 hover:border-[#11224D] transition flex flex-col justify-between">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border border-[#9E1B22] text-[#9E1B22] text-[10px] font-bold uppercase tracking-wider bg-[#9E1B22]/5 mb-2.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#9E1B22]"></span>
              Special Economic & Tourism Zone
            </div>
            <h3 class="text-base font-bold text-[#11224D] mb-1.5">Poro Point Freeport Zone</h3>
            <p class="text-xs text-[#697284] leading-relaxed m-0">
              An established economic and tourism zone with access to airport, seaport, mixed-use development, and major visitor destinations.
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#dfe3e9] flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-[2px] border border-[#dfe3e9] bg-[#F8F9FA] text-[10px] font-mono text-[#11224D]">Seaport & Airport Access</span>
            <span class="px-2 py-0.5 rounded-[2px] border border-[#dfe3e9] bg-[#F8F9FA] text-[10px] font-mono text-[#11224D]">Tourism & Mixed-Use</span>
          </div>
        </div>

        <div class="bg-white border border-[#dfe3e9] border-t-2 border-t-[#11224D] rounded-[4px] p-5 hover:border-[#11224D] transition flex flex-col justify-between">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border border-[#11224D] text-[#11224D] text-[10px] font-bold uppercase tracking-wider bg-[#11224D]/5 mb-2.5">
              <span class="w-1.5 h-1.5 rounded-full bg-[#11224D]"></span>
              Commercial Corridor
            </div>
            <h3 class="text-base font-bold text-[#11224D] mb-1.5">Central Business District – Biday</h3>
            <p class="text-xs text-[#697284] leading-relaxed m-0">
              A growing commercial corridor positioned for retail, services, technology, and long-term urban investment.
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#dfe3e9] flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-[2px] border border-[#dfe3e9] bg-[#F8F9FA] text-[10px] font-mono text-[#11224D]">Prime Commercial Arterial</span>
            <span class="px-2 py-0.5 rounded-[2px] border border-[#dfe3e9] bg-[#F8F9FA] text-[10px] font-mono text-[#11224D]">Retail & Tech Corridor</span>
          </div>
        </div>
      </div>
    </div>

    <!-- C & D. DIGITAL CITY ADVANTAGE & INVESTMENT INCENTIVES -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
      <div class="bg-white border border-[#dfe3e9] border-t-2 border-t-[#11224D] rounded-[4px] p-5 flex flex-col justify-between hover:border-[#11224D] transition">
        <div>
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border border-[#11224D] text-[#11224D] text-[10px] font-bold uppercase tracking-wider bg-[#11224D]/5 mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#11224D]"></span>
            Digital Advantage
          </div>
          <h3 class="text-base font-bold text-[#11224D] mb-1.5">Recognized Digital City</h3>
          <p class="text-xs text-[#697284] leading-relaxed m-0">
            San Fernando City is recognized under the Digital Cities PH program, strengthening its position for ICT, IT-BPM, digital services, and innovation-driven enterprises.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-[#dfe3e9] flex items-center justify-between text-[11px] text-[#697284]">
          <span>Digital Cities PH priority hub</span>
          <span class="px-2 py-0.5 rounded-[2px] border border-[#11224D] bg-[#F8F9FA] text-[10px] font-mono font-bold text-[#11224D]">DICT Priority</span>
        </div>
      </div>

      <div class="bg-white border border-[#dfe3e9] border-t-2 border-t-[#9E1B22] rounded-[4px] p-5 flex flex-col justify-between hover:border-[#11224D] transition">
        <div>
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border border-[#9E1B22] text-[#9E1B22] text-[10px] font-bold uppercase tracking-wider bg-[#9E1B22]/5 mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#9E1B22]"></span>
            Incentive Code
          </div>
          <h3 class="text-base font-bold text-[#11224D] mb-1.5">Investment and Incentives Code</h3>
          <p class="text-xs text-[#697284] leading-relaxed m-0">
            Ordinance No. 2024-41 provides the city’s framework for qualified investments, incentives, and priority economic activities.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-[#dfe3e9] flex items-center justify-between gap-2">
          <button type="button" id="openIncentivesModalBtn" class="city-button city-button-secondary city-button-small border-[#9E1B22] text-[#9E1B22] hover:bg-[#9E1B22] hover:text-white transition font-semibold">
            View Investment Incentives →
          </button>
          <span class="text-[10px] font-mono font-semibold text-[#11224D] px-2 py-0.5 rounded-[2px] border border-[#dfe3e9] bg-[#F8F9FA]">Ordinance No. 2024-41</span>
        </div>
      </div>
    </div>

    <!-- E. COST OF DOING BUSINESS -->
    <div class="bg-white border border-[#dfe3e9] rounded-[4px] p-5 md:p-6 mb-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
        <div>
          <h3 class="text-base font-bold text-[#11224D] m-0">Cost of Doing Business</h3>
          <p class="text-xs text-[#697284] mt-0.5 m-0">Verified benchmarks and institutional utility framework for San Fernando City</p>
        </div>
        <span class="text-[11px] font-mono text-[#697284]">Regulatory & Utility Benchmarks</span>
      </div>

      <!-- Tab Buttons -->
      <div class="flex flex-wrap gap-1.5 border-b border-[#dfe3e9] pb-3" role="tablist" id="costTabsNav">
        <button type="button" class="cost-tab-btn active px-3 py-1.5 rounded-[3px] text-xs font-semibold bg-[#11224D] text-white transition" data-cost-tab="wage">Wage Rates</button>
        <button type="button" class="cost-tab-btn px-3 py-1.5 rounded-[3px] text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="rental">Rental / Lease Rates</button>
        <button type="button" class="cost-tab-btn px-3 py-1.5 rounded-[3px] text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="power">Power Rates</button>
        <button type="button" class="cost-tab-btn px-3 py-1.5 rounded-[3px] text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="water">Water Cost</button>
        <button type="button" class="cost-tab-btn px-3 py-1.5 rounded-[3px] text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="telecom">Telecommunications / Internet Cost</button>
      </div>

      <!-- Tab Panels -->
      <div class="pt-4" id="costTabsContent">
        <div class="cost-tab-panel" data-cost-panel="wage">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Regulatory Framework</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">RTWPB Region 1</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Governed by the Regional Tripartite Wages and Productivity Board (Region 1) wage orders applicable to San Fernando City.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Sector Classifications</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Non-Agriculture & Agriculture</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Categorized according to commercial, service, industrial, and agricultural enterprise scale.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Talent Advantage</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Regional Labor Efficiency</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Cost-competitive operating expenditure compared to NCR while drawing from provincial university graduates.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="rental">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">CBD / High-Traffic Arterial</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Barangay Biday & City Center</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Prime commercial corridor with highest foot traffic, near shopping malls and civic offices.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Logistics & Industrial Lots</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Diversion Road & Port Vicinity</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Warehouse-ready parcels and industrial land with wide frontage and heavy freight clearance.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Tourism & Coastal</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Poro Point & Coastal Strips</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Hospitality-zoned parcels with direct coastal access and proximity to regional transport gateways.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="power">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Distribution Utility</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">La Union Electric Company (LUECO)</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Primary franchise utility providing power distribution throughout the City of San Fernando.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Tariff Classifications</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Commercial & Industrial Schedules</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Unbundled rates approved by the Energy Regulatory Commission (ERC) based on consumption volume and voltage.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Reliability Factor</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Substation Interconnection</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Direct grid interconnection to regional transmission substations supporting heavy commercial loads.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="water">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Water Service Provider</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Metro San Fernando Water District (MSFWD)</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Public utility operating citywide water extraction, purification, and distribution pipelines.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Commercial Metering</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Commercial Connection Brackets</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Billed based on meter size and consumption tiers per cubic meter under LWUA-approved schedules.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Industrial Supply</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Dedicated Line Provision</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">High-volume processing and food production sites may coordinate for dedicated main line connectivity.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="telecom">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Carrier Infrastructure</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Multi-Carrier Fiber Grid</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">PLDT Enterprise, Globe Business, and DITO provide redundant subterranean fiber loops across prime corridors.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Digital City Readiness</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">Dedicated Leased Lines (DIA)</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Direct Internet Access (DIA) packages with 99.9% uptime SLA available for BPO, IT-BPM, and finance.</p>
            </div>
            <div class="p-3.5 rounded-[4px] bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-[#697284] uppercase tracking-wide">Mobile Broadband</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1 mb-1">5G & LTE Coverage</h4>
              <p class="text-xs text-[#697284] m-0 leading-relaxed">Citywide 5G and high-capacity cellular data coverage supporting mobile business operations.</p>
            </div>
          </div>
        </div>
      </div>
      <p class="text-[11px] text-[#697284] mt-3.5 m-0 italic">
        * Tariff figures and commercial rates are determined by respective utility authorities and regulatory guidelines. Specific rates are subject to utility schedules and official LGU advisories.
      </p>
    </div>

    <!-- F. SETTING UP A BUSINESS -->
    <div class="bg-white border border-[#dfe3e9] rounded-[4px] p-5 md:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 class="text-base font-bold text-[#11224D] m-0">Setting Up a Business</h3>
          <p class="text-xs text-[#697284] mt-0.5 m-0">Regulatory steps for establishing enterprise operations in San Fernando City</p>
        </div>
        <button type="button" id="openRequirementsModalBtn" class="city-button city-button-secondary city-button-small">
          View Business Requirements →
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="p-3.5 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <span class="text-[11px] font-mono font-semibold text-[#9E1B22] block mb-1">01</span>
          <h4 class="text-xs font-bold text-[#11224D] m-0">Building Permit</h4>
          <p class="text-[11px] text-[#697284] mt-1 m-0">Office of the Building Official (OBO)</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <span class="text-[11px] font-mono font-semibold text-[#9E1B22] block mb-1">02</span>
          <h4 class="text-xs font-bold text-[#11224D] m-0">Certificate of Occupancy</h4>
          <p class="text-[11px] text-[#697284] mt-1 m-0">Final structural safety clearance</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <span class="text-[11px] font-mono font-semibold text-[#9E1B22] block mb-1">03</span>
          <h4 class="text-xs font-bold text-[#11224D] m-0">Business Permit</h4>
          <p class="text-[11px] text-[#697284] mt-1 m-0">Mayor's Permit via BPLO</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <span class="text-[11px] font-mono font-semibold text-[#9E1B22] block mb-1">04</span>
          <h4 class="text-xs font-bold text-[#11224D] m-0">Online Business Permit Application</h4>
          <p class="text-[11px] text-[#697284] mt-1 m-0">City Hall e-Services / BOSS</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <span class="text-[11px] font-mono font-semibold text-[#9E1B22] block mb-1">05</span>
          <h4 class="text-xs font-bold text-[#11224D] m-0">Individual Work Permit</h4>
          <p class="text-[11px] text-[#697284] mt-1 m-0">Health & sanitary clearances</p>
        </div>
      </div>
    </div>
  </section>

  <!-- MODAL: INVESTMENT INCENTIVES (ORDINANCE NO. 2024-41) -->
  <dialog id="investmentIncentivesDialog" class="city-dialog max-w-lg w-full p-6 bg-white rounded-[6px] border border-[#dfe3e9] shadow-lg">
    <div class="flex items-center justify-between pb-3 border-b border-[#dfe3e9]">
      <div>
        <span class="text-[11px] font-bold text-[#9E1B22] uppercase tracking-wider block">City Government of San Fernando</span>
        <h3 class="text-base font-bold text-[#11224D] mt-0.5 m-0">Investment and Incentives Code</h3>
      </div>
      <button type="button" class="close-incentives-dialog text-slate-400 hover:text-[#11224D] text-2xl font-light bg-transparent border-0 p-0 leading-none">&times;</button>
    </div>
    <div class="py-4 space-y-3">
      <p class="text-xs text-[#697284] leading-relaxed m-0">
        Ordinance No. 2024-41 provides the city’s framework for qualified investments, incentives, and priority economic activities.
      </p>

      <div class="space-y-2">
        <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">Capital &ge; ₱15,000,000</h4>
            <span class="text-[11px] font-mono font-semibold text-[#2A603B] bg-white px-2 py-0.5 rounded-[3px] border border-[#dfe3e9]">Tier 1</span>
          </div>
          <p class="text-xs text-[#11224D] mt-1.5 m-0 leading-relaxed">
            Potentially eligible for a 1-year Local Business Tax exemption.
          </p>
        </div>

        <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">Capital ₱3,000,000 – ₱14,999,999</h4>
            <span class="text-[11px] font-mono font-semibold text-[#11224D] bg-white px-2 py-0.5 rounded-[3px] border border-[#dfe3e9]">Tier 2</span>
          </div>
          <p class="text-xs text-[#11224D] mt-1.5 m-0 leading-relaxed">
            Potentially eligible for a 10% Local Business Tax discount.
          </p>
        </div>

        <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">Capital Below ₱3,000,000</h4>
            <span class="text-[11px] font-mono font-semibold text-[#697284] bg-white px-2 py-0.5 rounded-[3px] border border-[#dfe3e9]">Micro / Small</span>
          </div>
          <p class="text-xs text-[#11224D] mt-1.5 m-0 leading-relaxed">
            May fall within the applicable small-enterprise/BMBE qualification range, subject to eligibility requirements.
          </p>
        </div>
      </div>

      <div class="p-2.5 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9] text-[11px] text-[#697284] italic">
        Final eligibility is subject to LGU review and applicable requirements.
      </div>
    </div>
    <div class="pt-3 border-t border-[#dfe3e9] flex justify-end">
      <button type="button" class="close-incentives-dialog city-button city-button-secondary city-button-small">Close</button>
    </div>
  </dialog>

  <!-- MODAL: BUSINESS REQUIREMENTS -->
  <dialog id="businessRequirementsDialog" class="city-dialog max-w-lg w-full p-6 bg-white rounded-[6px] border border-[#dfe3e9] shadow-lg">
    <div class="flex items-center justify-between pb-3 border-b border-[#dfe3e9]">
      <div>
        <span class="text-[11px] font-bold text-[#9E1B22] uppercase tracking-wider block">Permits & Clearances</span>
        <h3 class="text-base font-bold text-[#11224D] mt-0.5 m-0">Setting Up a Business · Requirements</h3>
      </div>
      <button type="button" class="close-requirements-dialog text-slate-400 hover:text-[#11224D] text-2xl font-light bg-transparent border-0 p-0 leading-none">&times;</button>
    </div>
    <div class="py-4 space-y-2">
      <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
        <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">1. Building Permit</h4>
        <p class="text-xs text-[#697284] mt-0.5 m-0 leading-relaxed">Office of the Building Official (OBO). Architectural, structural, sanitary, and electrical plans conforming to the National Building Code.</p>
      </div>
      <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
        <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">2. Certificate of Occupancy</h4>
        <p class="text-xs text-[#697284] mt-0.5 m-0 leading-relaxed">Final joint inspection and safety sign-off prior to commercial or industrial operation of the premises.</p>
      </div>
      <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
        <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">3. Business Permit (Mayor's Permit)</h4>
        <p class="text-xs text-[#697284] mt-0.5 m-0 leading-relaxed">Business Permits and Licensing Office (BPLO). Requires barangay clearance, zoning locational clearance, and fire safety inspection certificate (BFP).</p>
      </div>
      <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
        <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">4. Online Business Permit Application</h4>
        <p class="text-xs text-[#697284] mt-0.5 m-0 leading-relaxed">Electronic filing through the City Government's Business One-Stop Shop (BOSS) online portal for expedited document verification.</p>
      </div>
      <div class="p-3 bg-[#F8F9FA] rounded-[4px] border border-[#dfe3e9]">
        <h4 class="text-xs font-bold text-[#11224D] uppercase m-0">5. Individual Work Permit</h4>
        <p class="text-xs text-[#697284] mt-0.5 m-0 leading-relaxed">Workforce permits and sanitary/health credentials processed through the City Health Office for all operational staff.</p>
      </div>
    </div>
    <div class="pt-3 border-t border-[#dfe3e9] flex justify-end">
      <button type="button" class="close-requirements-dialog city-button city-button-secondary city-button-small">Close</button>
    </div>
  </dialog>
  <section class="city-container city-section" id="properties">
    <div class="city-section-heading">
      <div>
        <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-[3px] border border-[#9E1B22] text-[#9E1B22] text-[10px] font-bold uppercase tracking-widest bg-[#9E1B22]/5 mb-2.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#9E1B22]"></span>
          Find your place
        </div>
        <h2>Featured properties.</h2>
        <p>Three listings to get you started.</p>
      </div>
      <a class="city-button city-button-secondary city-button-small border-[#11224D] text-[#11224D] hover:border-[#9E1B22] hover:text-[#9E1B22] font-semibold" href="<?= $e(sfc_path($cataloguePath)) ?>">View all properties →</a>
    </div>
    <div class="city-property-grid" id="cityPropertyGrid" aria-live="polite"><div class="city-loading">Loading properties…</div></div>
    <?php if ($context['user'] === null): ?>
    <div class="city-account-gate">
      <div>
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-white/20 bg-white/10 text-white text-[10px] font-mono uppercase tracking-wider mb-2 font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-[#9E1B22]"></span>
          Full Catalogue Access
        </div>
        <h3>See the full picture.</h3>
        <p>Create an account to explore every listing, save sites, and compare.</p>
      </div>
      <a class="city-button" href="<?= $e(sfc_path('/investor-login.php?mode=register')) ?>">Create account</a>
    </div>
    <?php endif; ?>
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
