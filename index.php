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
  <section class="city-container city-section py-8 md:py-12" id="why-invest">
    <div class="mb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/70 text-[#9E1B22] text-xs font-bold uppercase tracking-wider mb-2">
        <span>Strategic Investment Brief</span>
      </div>
      <h2 class="text-3xl md:text-4xl font-extrabold text-[#11224D] tracking-tight">WHY SAN FERNANDO?</h2>
      <p class="text-base text-[#697284] max-w-2xl mt-1.5 font-normal leading-relaxed">A city positioned for business, innovation, and strategic growth.</p>
    </div>

    <!-- STRATEGIC INVESTMENT AREAS -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 shadow-sm hover:border-[#11224D]/30 transition">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-xs font-bold uppercase tracking-wider text-[#9E1B22]">Special Economic & Tourism Zone</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800">Key Gateway</span>
        </div>
        <h3 class="text-lg font-bold text-[#11224D] mb-2">Poro Point Freeport Zone</h3>
        <p class="text-sm text-[#697284] leading-relaxed">
          “An established economic and tourism zone with access to airport, seaport, mixed-use development, and major visitor destinations.”
        </p>
      </div>

      <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 shadow-sm hover:border-[#11224D]/30 transition">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-xs font-bold uppercase tracking-wider text-[#9E1B22]">Commercial Core</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">Growth Corridor</span>
        </div>
        <h3 class="text-lg font-bold text-[#11224D] mb-2">Central Business District – Biday</h3>
        <p class="text-sm text-[#697284] leading-relaxed">
          “A growing commercial corridor positioned for retail, services, technology, and long-term urban investment.”
        </p>
      </div>
    </div>

    <!-- DIGITAL CITY ADVANTAGE & INVESTMENT INCENTIVES -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 shadow-sm hover:border-[#11224D]/30 transition flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-blue-700">Digital City Advantage</span>
          </div>
          <h3 class="text-lg font-bold text-[#11224D] mb-2">Recognized Digital City</h3>
          <p class="text-sm text-[#697284] leading-relaxed">
            “San Fernando City is recognized under the Digital Cities PH program, strengthening its position for ICT, IT-BPM, digital services, and innovation-driven enterprises.”
          </p>
        </div>
        <div class="mt-4 pt-3.5 border-t border-[#dfe3e9]/60 text-xs text-[#697284]">
          <span class="font-semibold text-[#11224D]">Digital Cities PH:</span> Priority hub for IT-BPM, creative technology, and regional corporate offices.
        </div>
      </div>

      <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 shadow-sm hover:border-[#11224D]/30 transition flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Investment & Incentives</span>
          </div>
          <h3 class="text-lg font-bold text-[#11224D] mb-2">Investment and Incentives Code</h3>
          <p class="text-sm text-[#697284] leading-relaxed">
            “Ordinance No. 2024-41 provides the city’s framework for qualified investments, incentives, and priority economic activities.”
          </p>
        </div>
        <div class="mt-4 pt-3.5 border-t border-[#dfe3e9]/60 flex items-center justify-between">
          <button type="button" id="openIncentivesModalBtn" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#11224D] text-xs font-semibold rounded-lg transition">
            View Investment Incentives →
          </button>
          <span class="text-[11px] text-[#697284]">Ordinance No. 2024-41</span>
        </div>
      </div>
    </div>

    <!-- PRIORITY INVESTMENT SECTORS -->
    <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 md:p-8 shadow-sm mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3.5 border-b border-[#dfe3e9]/60">
        <div>
          <h3 class="text-base md:text-lg font-bold text-[#11224D]">Priority Investment Sectors</h3>
          <p class="text-xs text-[#697284] mt-0.5">Identified strategic activity areas under city investment policies</p>
        </div>
        <span class="self-start sm:self-auto text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Ordinance No. 2024-41</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        foreach ($sectors as $index => $sectorName):
        ?>
        <div class="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#dfe3e9] hover:bg-white hover:border-[#9E1B22]/40 transition">
          <div class="text-[10px] font-bold text-[#9E1B22] uppercase tracking-wider mb-1">Priority Sector 0<?= $index + 1 ?></div>
          <h4 class="text-xs md:text-sm font-bold text-[#11224D] leading-snug"><?= $e($sectorName) ?></h4>
        </div>
        <?php endforeach; ?>
        <div class="p-3.5 bg-gradient-to-br from-red-50 to-amber-50 rounded-xl border border-red-200/80 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-[#9E1B22] uppercase tracking-wider mb-1">Explore Listings</div>
            <h4 class="text-xs md:text-sm font-bold text-[#11224D]">Site Selection</h4>
            <p class="text-[11px] text-[#697284] mt-0.5">Review parcels mapped to priority activities.</p>
          </div>
          <a href="#properties" class="inline-flex items-center gap-1 text-xs font-bold text-[#9E1B22] mt-2 hover:underline">
            View properties ↓
          </a>
        </div>
      </div>
    </div>

    <!-- COST OF DOING BUSINESS -->
    <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 md:p-8 shadow-sm mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 class="text-base md:text-lg font-bold text-[#11224D]">Cost of Doing Business</h3>
          <p class="text-xs text-[#697284] mt-0.5">Verified benchmarks and institutional utility framework for San Fernando City</p>
        </div>
        <span class="text-xs text-[#697284]">Official Regulatory & Utility Context</span>
      </div>

      <!-- Tab Buttons -->
      <div class="flex flex-wrap gap-2 border-b border-[#dfe3e9] pb-3" role="tablist" id="costTabsNav">
        <button type="button" class="cost-tab-btn active px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#11224D] text-white transition" data-cost-tab="wage">Wage Rates</button>
        <button type="button" class="cost-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="rental">Rental / Lease Rates</button>
        <button type="button" class="cost-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="power">Power Rates</button>
        <button type="button" class="cost-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="water">Water Cost</button>
        <button type="button" class="cost-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition" data-cost-tab="telecom">Telecommunications / Internet Cost</button>
      </div>

      <!-- Tab Panels -->
      <div class="pt-4" id="costTabsContent">
        <div class="cost-tab-panel" data-cost-panel="wage">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Regulatory Framework</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">RTWPB Region 1</h4>
              <p class="text-xs text-[#697284] mt-1.5">Governed by the Regional Tripartite Wages and Productivity Board (Region 1) wage orders applicable to San Fernando City.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sector Classifications</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Non-Agriculture & Agriculture</h4>
              <p class="text-xs text-[#697284] mt-1.5">Categorized according to commercial, service, industrial, and agricultural enterprise scale.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Talent Advantage</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Regional Labor Efficiency</h4>
              <p class="text-xs text-[#697284] mt-1.5">Cost-competitive operating expenditure compared to NCR while drawing from provincial university graduates.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="rental">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">CBD / High-Traffic Arterial</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Barangay Biday & City Center</h4>
              <p class="text-xs text-[#697284] mt-1.5">Prime commercial corridor with highest foot traffic, near shopping malls and civic offices.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Logistics & Industrial Lots</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Diversion Road & Port Vicinity</h4>
              <p class="text-xs text-[#697284] mt-1.5">Warehouse-ready parcels and industrial land with wide frontage and heavy freight clearance.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tourism & Coastal</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Poro Point & Coastal Strips</h4>
              <p class="text-xs text-[#697284] mt-1.5">Hospitality-zoned parcels with direct coastal access and proximity to regional transport gateways.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="power">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Distribution Utility</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">La Union Electric Company (LUECO)</h4>
              <p class="text-xs text-[#697284] mt-1.5">Primary franchise utility providing power distribution throughout the City of San Fernando.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tariff Classifications</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Commercial & Industrial Schedules</h4>
              <p class="text-xs text-[#697284] mt-1.5">Unbundled rates approved by the Energy Regulatory Commission (ERC) based on consumption volume and voltage.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reliability Factor</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Substation Interconnection</h4>
              <p class="text-xs text-[#697284] mt-1.5">Direct grid interconnection to regional transmission substations supporting heavy commercial loads.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="water">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Water Service Provider</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Metro San Fernando Water District (MSFWD)</h4>
              <p class="text-xs text-[#697284] mt-1.5">Public utility operating citywide water extraction, purification, and distribution pipelines.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Commercial Metering</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Commercial Connection Brackets</h4>
              <p class="text-xs text-[#697284] mt-1.5">Billed based on meter size and consumption tiers per cubic meter under LWUA-approved schedules.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Industrial Supply</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Dedicated Line Provision</h4>
              <p class="text-xs text-[#697284] mt-1.5">High-volume processing and food production sites may coordinate for dedicated main line connectivity.</p>
            </div>
          </div>
        </div>

        <div class="cost-tab-panel hidden" data-cost-panel="telecom">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Carrier Infrastructure</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Multi-Carrier Fiber Grid</h4>
              <p class="text-xs text-[#697284] mt-1.5">PLDT Enterprise, Globe Business, and DITO provide redundant subterranean fiber loops across prime corridors.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Digital City Readiness</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">Dedicated Leased Lines (DIA)</h4>
              <p class="text-xs text-[#697284] mt-1.5">Direct Internet Access (DIA) packages with 99.9% uptime SLA available for BPO, IT-BPM, and finance.</p>
            </div>
            <div class="p-4 rounded-xl bg-[#F8F9FA] border border-[#dfe3e9]">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Mobile Broadband</div>
              <h4 class="text-sm font-bold text-[#11224D] mt-1">5G & LTE Coverage</h4>
              <p class="text-xs text-[#697284] mt-1.5">Citywide 5G and high-capacity cellular data coverage supporting mobile business operations.</p>
            </div>
          </div>
        </div>
      </div>
      <p class="text-[11px] text-[#697284] mt-4 italic">
        * Tariff figures and commercial rates are determined by respective utility authorities and regulatory guidelines. Specific rates are subject to utility schedules and official LGU advisories.
      </p>
    </div>

    <!-- SETTING UP A BUSINESS -->
    <div class="bg-white border border-[#dfe3e9] rounded-2xl p-6 md:p-8 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 class="text-base md:text-lg font-bold text-[#11224D]">Setting Up a Business</h3>
          <p class="text-xs text-[#697284] mt-0.5">Streamlined regulatory steps for operating in San Fernando City</p>
        </div>
        <button type="button" id="openRequirementsModalBtn" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#9E1B22] hover:bg-[#82171d] text-white text-xs font-semibold rounded-lg transition shadow-sm">
          View Business Requirements →
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#dfe3e9]">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold mb-2">1</span>
          <h4 class="text-xs font-bold text-[#11224D]">Building Permit</h4>
          <p class="text-[11px] text-[#697284] mt-1">Office of the Building Official (OBO)</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#dfe3e9]">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold mb-2">2</span>
          <h4 class="text-xs font-bold text-[#11224D]">Certificate of Occupancy</h4>
          <p class="text-[11px] text-[#697284] mt-1">Final structural safety clearance</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#dfe3e9]">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold mb-2">3</span>
          <h4 class="text-xs font-bold text-[#11224D]">Business Permit</h4>
          <p class="text-[11px] text-[#697284] mt-1">Mayor's Permit via BPLO</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#dfe3e9]">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold mb-2">4</span>
          <h4 class="text-xs font-bold text-[#11224D]">Online Business Permit Application</h4>
          <p class="text-[11px] text-[#697284] mt-1">City Hall e-Services / BOSS</p>
        </div>
        <div class="p-3.5 bg-[#F8F9FA] rounded-xl border border-[#dfe3e9]">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold mb-2">5</span>
          <h4 class="text-xs font-bold text-[#11224D]">Individual Work Permit</h4>
          <p class="text-[11px] text-[#697284] mt-1">Health & sanitary clearances</p>
        </div>
      </div>
    </div>
  </section>

  <!-- MODAL: INVESTMENT INCENTIVES (ORDINANCE NO. 2024-41) -->
  <dialog id="investmentIncentivesDialog" class="city-dialog max-w-xl w-full p-6 bg-white rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-900/40">
    <div class="flex items-center justify-between pb-4 border-b border-slate-200">
      <div>
        <span class="text-xs font-bold text-[#9E1B22] uppercase tracking-wider">City of San Fernando</span>
        <h3 class="text-xl font-bold text-[#11224D] mt-0.5">Investment and Incentives Code</h3>
      </div>
      <button type="button" class="close-incentives-dialog text-slate-400 hover:text-slate-600 text-2xl font-light">&times;</button>
    </div>
    <div class="py-5 space-y-4">
      <p class="text-xs text-slate-600 leading-relaxed">
        “Ordinance No. 2024-41 provides the city’s framework for qualified investments, incentives, and priority economic activities.”
      </p>

      <div class="space-y-3">
        <div class="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-emerald-900 uppercase tracking-wide">Capital &ge; ₱15,000,000</h4>
            <span class="text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">Tier 1</span>
          </div>
          <p class="text-xs text-emerald-800 font-medium mt-1">
            “Potentially eligible for a 1-year Local Business Tax exemption.”
          </p>
        </div>

        <div class="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-blue-900 uppercase tracking-wide">Capital ₱3,000,000 – ₱14,999,999</h4>
            <span class="text-[11px] font-semibold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-300">Tier 2</span>
          </div>
          <p class="text-xs text-blue-800 font-medium mt-1">
            “Potentially eligible for a 10% Local Business Tax discount.”
          </p>
        </div>

        <div class="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-amber-900 uppercase tracking-wide">Capital Below ₱3,000,000</h4>
            <span class="text-[11px] font-semibold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-300">Micro / Small</span>
          </div>
          <p class="text-xs text-amber-800 font-medium mt-1">
            “May fall within the applicable small-enterprise/BMBE qualification range, subject to eligibility requirements.”
          </p>
        </div>
      </div>

      <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 italic">
        “Final eligibility is subject to LGU review and applicable requirements.”
      </div>
    </div>
    <div class="pt-4 border-t border-slate-200 flex justify-end">
      <button type="button" class="close-incentives-dialog px-4 py-2 bg-[#11224D] hover:bg-[#1e293b] text-white text-xs font-semibold rounded-lg transition">Close</button>
    </div>
  </dialog>

  <!-- MODAL: BUSINESS REQUIREMENTS -->
  <dialog id="businessRequirementsDialog" class="city-dialog max-w-xl w-full p-6 bg-white rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-900/40">
    <div class="flex items-center justify-between pb-4 border-b border-slate-200">
      <div>
        <span class="text-xs font-bold text-[#9E1B22] uppercase tracking-wider">Permits & Clearances</span>
        <h3 class="text-xl font-bold text-[#11224D] mt-0.5">Setting Up a Business · Requirements</h3>
      </div>
      <button type="button" class="close-requirements-dialog text-slate-400 hover:text-slate-600 text-2xl font-light">&times;</button>
    </div>
    <div class="py-5 space-y-3">
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">1. Building Permit</h4>
        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">Office of the Building Official (OBO). Architectural, structural, sanitary, and electrical plans conforming to the National Building Code.</p>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">2. Certificate of Occupancy</h4>
        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">Final joint inspection and safety sign-off prior to commercial or industrial operation of the premises.</p>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">3. Business Permit (Mayor's Permit)</h4>
        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">Business Permits and Licensing Office (BPLO). Requires barangay clearance, zoning locational clearance, and fire safety inspection certificate (BFP).</p>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">4. Online Business Permit Application</h4>
        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">Electronic filing through the City Government's Business One-Stop Shop (BOSS) online portal for expedited document verification.</p>
      </div>
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wide">5. Individual Work Permit</h4>
        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">Workforce permits and sanitary/health credentials processed through the City Health Office for all operational staff.</p>
      </div>
    </div>
    <div class="pt-4 border-t border-slate-200 flex justify-end">
      <button type="button" class="close-requirements-dialog px-4 py-2 bg-[#11224D] hover:bg-[#1e293b] text-white text-xs font-semibold rounded-lg transition">Close</button>
    </div>
  </dialog>
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
