import React, { useState } from 'react';

/**
 * TypeScript Interfaces for Business Opportunities
 */
export interface SupportingPlace {
  id: string;
  name: string;
  category: string;
  distanceMeters: number;
  distanceFormatted: string;
  bearingDegrees?: number;
}

export interface OpportunityMatch {
  id: string;
  label: string;
  sector: 'food_retail' | 'everyday_services' | 'professional_services' | 'tourism_recreation' | 'industrial_agricultural';
  sectorLabel: string;
  rank: number;
  statusLabel: string;
  description: string;
  explanation: string;
  mainUnresolvedNotice: string;
  supportingPlaces: SupportingPlace[];
  areaGuideline: string;
  areaStatus: string;
  zoningStatus: string;
  zoningClassification: string;
  roadAccessRequirement: string;
  missingEvidence: string[];
  competitorsNotice: string;
  competitorSample?: string[];
  complementaryCount: number;
  complementarySample?: string[];
  ruleSource: string;
  version: string;
}

export interface BusinessOpportunitiesProps {
  title?: string;
  subtitle?: string;
  screeningRadiusLabel?: string;
  analysisOrigin?: string;
  totalPlacesInRadius?: number;
  matches?: OpportunityMatch[];
  onOpenCatalog?: () => void;
  className?: string;
}

/**
 * Sector badge color mapping with soft pastel backgrounds
 */
const SECTOR_BADGE_STYLES: Record<string, string> = {
  food_retail: 'bg-orange-50 text-orange-700 border-orange-100',
  everyday_services: 'bg-blue-50 text-blue-700 border-blue-100',
  professional_services: 'bg-purple-50 text-purple-700 border-purple-100',
  tourism_recreation: 'bg-teal-50 text-teal-700 border-teal-100',
  industrial_agricultural: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

/**
 * Sample realistic data matching LOCUS-SF City Plaza scenario
 */
export const SAMPLE_OPPORTUNITIES: OpportunityMatch[] = [
  {
    id: 'bakery',
    label: 'Bakery & Pastry Shop',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    rank: 1,
    statusLabel: 'Draft screening · Unvalidated',
    description: 'Fresh bread, breakfast pastries, snacks, and coffee service for daytime pedestrians, office staff, and students.',
    explanation: 'High daytime foot-traffic anchor Saint Louis College is 165m away, plus City Hall (185m). Morning commuter flow supports high-turnover baked goods.',
    mainUnresolvedNotice: 'Confirm dedicated water service pressure, sanitary grease-trap compliance, and commercial kitchen ventilation.',
    supportingPlaces: [
      { id: 'sp-1', name: 'Saint Louis College', category: 'College & Higher Education', distanceMeters: 165, distanceFormatted: '165 m' },
      { id: 'sp-2', name: 'City Hall of San Fernando', category: 'Local Government & Public Hall', distanceMeters: 185, distanceFormatted: '185 m' },
    ],
    areaGuideline: '50 - 150 m²',
    areaStatus: 'Meets minimum guideline (500 m² lot recorded)',
    zoningStatus: 'Permitted in General Commercial Zone',
    zoningClassification: 'General Commercial',
    roadAccessRequirement: 'Secondary 2-lane',
    missingEvidence: ['Water service pressure rating', 'Dedicated grease trap provision'],
    competitorsNotice: 'No competitors recorded in this dataset',
    complementaryCount: 3,
    complementarySample: ['Coffee counter', 'Daily grocery', 'Convenience store'],
    ruleSource: 'San Fernando LEBDO v1.0-draft',
    version: '1.0-draft',
  },
  {
    id: 'eatery',
    label: 'Affordable Eatery / Casual Dining',
    sector: 'food_retail',
    sectorLabel: 'Food & Retail',
    rank: 2,
    statusLabel: 'Draft screening · Unvalidated',
    description: 'Hot meal combinations, snacks, and beverage options serving nearby government employees, college students, and shoppers.',
    explanation: 'Surrounded by Saint Louis College (165m) and City Hall (185m) creating concentrated noon and evening meal demand.',
    mainUnresolvedNotice: 'Verify wastewater grease trap and kitchen exhaust compliance under City Health sanitation rules.',
    supportingPlaces: [
      { id: 'sp-1', name: 'Saint Louis College', category: 'College & Higher Education', distanceMeters: 165, distanceFormatted: '165 m' },
      { id: 'sp-2', name: 'City Hall of San Fernando', category: 'Local Government & Public Hall', distanceMeters: 185, distanceFormatted: '185 m' },
    ],
    areaGuideline: '80 - 250 m²',
    areaStatus: 'Compatible with lot size',
    zoningStatus: 'Permitted in General Commercial Zone',
    zoningClassification: 'General Commercial',
    roadAccessRequirement: 'Secondary 2-lane',
    missingEvidence: ['Sanitation inspection history', 'Exhaust clearance'],
    competitorsNotice: 'No competitors recorded in this dataset',
    complementaryCount: 2,
    complementarySample: ['Convenience kiosk', 'Juice bar'],
    ruleSource: 'San Fernando LEBDO v1.0-draft',
    version: '1.0-draft',
  },
  {
    id: 'printing',
    label: 'Printing & Document Services',
    sector: 'everyday_services',
    sectorLabel: 'Everyday Services',
    rank: 3,
    statusLabel: 'Draft screening · Unvalidated',
    description: 'Photocopying, thesis printing, bookbinding, ID laminating, blueprint plotting, and government form assistance.',
    explanation: 'Immediately adjacent to higher education facilities and municipal administration requiring continuous official document handling.',
    mainUnresolvedNotice: 'Review stable commercial electrical capacity (dedicated 220V lines) and dry storage protection.',
    supportingPlaces: [
      { id: 'sp-1', name: 'City Hall of San Fernando', category: 'Local Government & Public Hall', distanceMeters: 185, distanceFormatted: '185 m' },
      { id: 'sp-2', name: 'Saint Louis College', category: 'College & Higher Education', distanceMeters: 165, distanceFormatted: '165 m' },
    ],
    areaGuideline: '25 - 80 m²',
    areaStatus: 'Suitable for frontage or sub-lease',
    zoningStatus: 'Permitted in General Commercial Zone',
    zoningClassification: 'General Commercial',
    roadAccessRequirement: 'Pedestrian or standard street',
    missingEvidence: ['Power grid surge protection', 'Broadband fiber stability'],
    competitorsNotice: 'No competitors recorded in this dataset',
    complementaryCount: 2,
    complementarySample: ['School supplies station', 'Courier counter'],
    ruleSource: 'San Fernando LEBDO v1.0-draft',
    version: '1.0-draft',
  },
];

/**
 * Modern, Minimalist Business Opportunity Interface Component
 * Matches precise Poppins + Inter typography, 3-column grid, soft badges, and smooth accordions.
 */
export const BusinessOpportunities: React.FC<BusinessOpportunitiesProps> = ({
  title = 'Business opportunities to explore',
  subtitle = 'Suggestions based on nearby establishments, property characteristics, infrastructure and available zoning information.',
  screeningRadiusLabel = '500-meter straight-line screening radius',
  analysisOrigin = '16.6159° N, 120.3209° E',
  totalPlacesInRadius = 2,
  matches = SAMPLE_OPPORTUNITIES,
  onOpenCatalog,
  className = '',
}) => {
  // State for tracking open card accordions
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleModeChange = (mode: 'compact' | 'detailed') => {
    setViewMode(mode);
    if (mode === 'detailed') {
      const allOpen: Record<string, boolean> = {};
      matches.forEach(m => { allOpen[m.id] = true; });
      setOpenAccordions(allOpen);
    } else {
      setOpenAccordions({});
    }
  };

  return (
    <section
      id="propertyOpportunitiesSection"
      aria-labelledby="propertyOpportunitiesTitle"
      className={`w-full bg-gray-50 border border-gray-200/90 rounded-2xl p-6 sm:p-8 font-['Inter'] text-slate-800 ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-gray-200/70">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase text-slate-900 bg-slate-200/70 font-['Inter']">
              <svg className="w-3 h-3 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 6 12 12 16 14" />
              </svg>
              Exploratory Matching
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 font-['Inter']">
              Draft screening · Unvalidated
            </span>
          </div>

          <h2
            id="propertyOpportunitiesTitle"
            className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Poppins'] tracking-tight"
          >
            {title}
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl font-['Inter']">
            {subtitle}
          </p>
        </div>

        {/* Action button: Explore full catalog */}
        <div className="flex items-center gap-3 shrink-0 pt-1">
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              data-open-opportunities-catalog
              id="openOpportunitiesCatalogBtn"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg border border-gray-300 shadow-sm transition-all duration-150 hover:shadow"
            >
              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Explore all business types</span>
            </button>
          )}
        </div>
      </div>

      {/* Spatial screening provenance bar */}
      <div className="my-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200/80 rounded-xl text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="12" x2="19" y2="12" />
            </svg>
            <strong>{screeningRadiusLabel}</strong>
          </span>
          <span className="text-slate-500">Origin: <span className="font-mono text-slate-700">{analysisOrigin}</span></span>
          <span className="text-emerald-700 font-medium">· {totalPlacesInRadius} nearby places within dataset</span>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg gap-1 border border-gray-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleModeChange('compact')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'compact'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Compact view
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('detailed')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'detailed'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Detailed evidence
          </button>
        </div>
      </div>

      {/* Main Content Grid: Responsive 3-Column Layout */}
      {matches.length > 0 ? (
        <div id="opportunitiesCardsGrid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {matches.map((item) => {
            const isExpanded = !!openAccordions[item.id];
            const sectorColorClass = SECTOR_BADGE_STYLES[item.sector] || 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <article
                key={item.id}
                id={`oppCard-${item.id}`}
                data-opportunity-id={item.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col space-y-4 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative"
              >
                {/* Top Tags / Badges Row */}
                <div className="flex flex-row gap-2 items-center flex-wrap">
                  {/* Number Badge: Dark navy/slate box */}
                  <span className="bg-slate-900 text-white font-semibold text-xs px-2.5 py-1 rounded-md font-['Inter'] shadow-2xs">
                    #{item.rank}
                  </span>

                  {/* Sector Pill Tag */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md border font-['Inter'] ${sectorColorClass}`}>
                    {item.sectorLabel}
                  </span>

                  {/* Status Tag */}
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/50 font-['Inter'] ml-auto">
                    {item.statusLabel}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="font-['Poppins'] text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight">
                    {item.label}
                  </h3>
                  <p className="font-['Inter'] text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Neighborhood Evidence Box */}
                <div className="bg-slate-50 p-4 rounded-lg text-sm border-l-2 border-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-['Inter']">
                    <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>Neighborhood Evidence</span>
                  </div>
                  <p className="font-['Inter'] text-sm text-slate-700 leading-relaxed font-normal">
                    {item.explanation}
                  </p>
                </div>

                {/* Unresolved Requirement Box */}
                <div className="bg-amber-50 p-4 rounded-lg text-sm border border-amber-100 text-amber-800 flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-xs shrink-0 mt-0.5 shadow-2xs" aria-hidden="true">
                    !
                  </span>
                  <div className="space-y-0.5 leading-snug">
                    <strong className="font-semibold font-['Inter'] block text-amber-900 text-xs">
                      Main unresolved requirement:
                    </strong>
                    <span className="text-amber-800 text-xs font-['Inter'] block leading-relaxed">
                      {item.mainUnresolvedNotice}
                    </span>
                  </div>
                </div>

                {/* The Accordion Dropdown (Crucial) */}
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`oppDetails-${item.id}`}
                    data-toggle-opportunity-details={item.id}
                    className="text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg p-3 flex justify-between items-center transition-colors cursor-pointer w-full border border-slate-200/70"
                  >
                    <span className="font-['Inter'] text-xs sm:text-sm font-semibold text-slate-800">
                      Why this suggestion?
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Hidden Traceable Assessment Evidence Drawer */}
                  <div
                    id={`oppDetails-${item.id}`}
                    hidden={!isExpanded}
                    className={`mt-3 pt-3 border-t border-slate-200 space-y-3.5 transition-all duration-200 ${!isExpanded ? 'hidden' : 'block'}`}
                  >
                    <div className="space-y-3 font-['Inter'] text-xs text-slate-600">
                      <h4 className="font-['Poppins'] text-xs font-bold text-slate-900 tracking-tight uppercase">
                        Traceable Assessment Evidence
                      </h4>

                      {/* Supporting places table/list with exact straight-line distances */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-700 block">
                          Actual supporting places within radius:
                        </span>
                        <div className="space-y-1.5">
                          {item.supportingPlaces.map((sp) => (
                            <div
                              key={sp.id}
                              className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-md"
                            >
                              <span className="font-medium text-slate-800">{sp.name}</span>
                              <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                                {sp.distanceFormatted} straight-line · {sp.category}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Property requirements specs */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-700 block">
                          Property requirements vs recorded site:
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 bg-slate-50 rounded border border-slate-200/60">
                            <span className="text-slate-500 block">Area guideline</span>
                            <strong className="text-slate-800 block">{item.areaGuideline}</strong>
                            <small className="text-slate-500">{item.areaStatus}</small>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200/60">
                            <span className="text-slate-500 block">Zoning status</span>
                            <strong className="text-slate-800 block">{item.zoningStatus}</strong>
                            <small className="text-slate-500">{item.zoningClassification}</small>
                          </div>
                        </div>
                      </div>

                      {/* Competitor count & notice */}
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px] space-y-1">
                        <div>
                          <strong className="text-slate-700">Recorded competitors:</strong>{' '}
                          <span className="text-slate-600">{item.competitorsNotice}</span>
                        </div>
                        {item.complementaryCount > 0 && (
                          <div>
                            <strong className="text-slate-700">Complementary businesses:</strong>{' '}
                            <span className="text-slate-600">
                              {item.complementaryCount} complementary anchors recorded
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rule Provenance */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Source: {item.ruleSource}</span>
                        <span>v{item.version} · Draft rule</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 space-y-2">
          <h3 className="font-['Poppins'] text-lg font-bold text-slate-800">
            No supported business suggestions under current evidence
          </h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            No catalog business profiles meet the required activity center relationships or zoning criteria within the screening radius.
          </p>
        </div>
      )}

      {/* Methodology Disclaimer */}
      <div className="mt-6 pt-4 border-t border-gray-200/60 text-xs text-slate-500 leading-relaxed font-['Inter']">
        <strong className="font-semibold text-slate-700">Integrity & methodology note:</strong> Suggestions are exploratory decision-support ideas derived from traceable spatial proximity and property characteristics. They do not claim profitability, guaranteed investment returns, or proven unmet customer demand. MCE/IAI scoring formulas remain completely separate and unmodified.
      </div>
    </section>
  );
};

export default BusinessOpportunities;
