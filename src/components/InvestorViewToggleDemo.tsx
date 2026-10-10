import React, { useState } from 'react';
import { InvestorViewToggle, ViewMode } from './InvestorViewToggle';
import { motion, AnimatePresence } from 'framer-motion';

export const InvestorViewToggleDemo: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('Basic');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#11224D] font-sans flex flex-col justify-between antialiased p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#11224D] text-white flex items-center justify-center font-black text-sm tracking-tight shadow-sm">
            LOCUS
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">
              Investor Interface <span className="text-slate-400 font-normal">/ Property View</span>
            </div>
            <div className="text-xs text-slate-500">San Fernando, La Union</div>
          </div>
        </div>

        {/* The Toggle Component */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            Mode:
          </span>
          <InvestorViewToggle
            value={viewMode}
            onChange={(mode) => setViewMode(mode)}
          />
        </div>
      </header>

      {/* Main Content Area Illustrating View Switching */}
      <main className="max-w-4xl mx-auto w-full my-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-[#11224D]">
                Active View: {viewMode}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Prime Commercial Corner Lot · Sevilla
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Barangay Sevilla, San Fernando City, La Union
              </p>
            </div>

            <div className="text-right sm:text-right">
              <div className="text-2xl font-extrabold text-[#11224D]">
                ₱ 18,500,000
              </div>
              <div className="text-xs text-slate-500">
                ₱ 25,000 / m² · Available
              </div>
            </div>
          </div>

          {/* Animated View Transition */}
          <div className="mt-6">
            <AnimatePresence mode="wait">
              {viewMode === 'Basic' ? (
                <motion.div
                  key="basic-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      Basic Investor Summary
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Streamlined essentials view focused on core property metrics, location boundaries, and listing broker contact info. High-level safety screenings remain visible.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50">
                      <span className="text-slate-400 block mb-0.5">Land Area</span>
                      <strong className="text-slate-800 text-sm">740 m²</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <span className="text-slate-400 block mb-0.5">Zoning</span>
                      <strong className="text-slate-800 text-sm">Commercial</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <span className="text-slate-400 block mb-0.5">Road Access</span>
                      <strong className="text-slate-800 text-sm">Paved 4-lane</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50">
                      <span className="text-slate-400 block mb-0.5">Authority to Sell</span>
                      <strong className="text-emerald-700 text-sm">✓ Verified</strong>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="advanced-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-[#11224D]/5 border border-[#11224D]/15">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-[#11224D]">
                        Advanced Analytical Mode Unlocked
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#11224D] text-white">
                        MCE + IAI Activated
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Deep investment models, 7-criterion weighted assessment breakdown, verified data sources, 500m straight-line surroundings radar, and business opportunities matching.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-sm">
                      <span className="text-slate-500 text-[11px] font-semibold block mb-1">IAI Score</span>
                      <div className="text-2xl font-black text-[#11224D]">87.4 <span className="text-xs font-normal text-slate-400">/ 100</span></div>
                      <p className="text-[11px] text-slate-500 mt-1">High investment viability alignment</p>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-sm">
                      <span className="text-slate-500 text-[11px] font-semibold block mb-1">MCE Score</span>
                      <div className="text-2xl font-black text-[#11224D]">84.0 <span className="text-xs font-normal text-slate-400">/ 100</span></div>
                      <p className="text-[11px] text-slate-500 mt-1">Weighted across all 7 city criteria</p>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-sm">
                      <span className="text-slate-500 text-[11px] font-semibold block mb-1">Business Matching</span>
                      <div className="text-sm font-bold text-slate-800">3 Opportunities</div>
                      <p className="text-[11px] text-slate-500 mt-1">500m screening radius verified</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        LOCUS-SF &middot; Modern Minimalist Toggle &middot; Tailwind CSS + Framer Motion
      </footer>
    </div>
  );
};

export default InvestorViewToggleDemo;
