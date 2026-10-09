import React, { useState } from 'react';
import { RoleSegmentedControl, RoleOption } from './RoleSegmentedControl';

export const RoleSegmentedControlDemo: React.FC = () => {
  const [activeRole, setActiveRole] = useState<RoleOption>('Investor');

  const roleMeta: Record<RoleOption, { title: string; subtitle: string; action: string }> = {
    'Investor': {
      title: 'STARTS HERE.',
      subtitle: 'Discover spaces, explore opportunities',
      action: 'AND INVEST IN THE CITY!',
    },
    'Broker': {
      title: 'NEW HORIZONS.',
      subtitle: 'Connect spaces, empower clients',
      action: 'AND SHAPE THE CITY!',
    },
    'City staff': {
      title: 'SHARED VISION.',
      subtitle: 'Informed decisions, seamless data',
      action: 'FOR THE CITY WE SERVE!',
    },
  };

  const current = roleMeta[activeRole];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 font-sans">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">
            LOCUS<span className="text-[#88050B]">-SF</span>
          </span>
          <span className="text-xs text-slate-400">San Fernando, La Union</span>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 flex flex-col items-center text-center">
          {/* Segmented Control */}
          <div className="mb-6 w-full flex justify-center">
            <RoleSegmentedControl
              value={activeRole}
              onChange={(role) => setActiveRole(role)}
            />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
            Current Active Role
          </span>
          <h1 className="text-2xl font-black text-[#88050B] tracking-tight uppercase mb-2">
            {activeRole}
          </h1>
          <p className="text-sm font-semibold italic text-slate-600 mb-1">
            {current.subtitle}
          </p>
          <p className="text-xs font-black uppercase text-slate-900 tracking-wide mb-6">
            {current.action}
          </p>

          <button
            type="button"
            className="w-full max-w-xs py-3 px-6 rounded-full bg-[#88050B] hover:bg-[#73060d] text-white font-bold text-sm shadow-md shadow-[#88050B]/30 transition-transform active:scale-95"
          >
            Continue as {activeRole} →
          </button>
        </div>
      </main>

      {/* Restored Dark Red Footer */}
      <footer className="w-full bg-[#88050B] text-white py-4 px-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <strong className="font-extrabold text-sm tracking-tight text-white">LOCUS-SF</strong>
            <span className="text-white/80 hidden sm:inline">San Fernando, La Union</span>
          </div>
          <nav className="flex items-center gap-5 text-white/90 font-medium">
            <a href="#privacy" className="hover:text-white hover:underline transition-colors">Privacy</a>
            <a href="#broker" className="hover:text-white hover:underline transition-colors">Broker access</a>
            <a href="#city" className="hover:text-white hover:underline transition-colors">City access</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default RoleSegmentedControlDemo;
