import React, { useState } from 'react';
import { motion } from 'framer-motion';

export type RoleOption = 'Investor' | 'City staff' | 'Broker';

export interface RoleSegmentedControlProps {
  /** The currently active role (controlled mode) */
  value?: RoleOption;
  /** The initial active role (uncontrolled mode, default: 'Investor') */
  defaultValue?: RoleOption;
  /** Callback fired whenever active role changes */
  onChange?: (role: RoleOption) => void;
  /** Optional custom class name for the outer container */
  className?: string;
  /** Optional custom dark red accent hex (default: '#88050B') */
  activeColor?: string;
}

/**
 * Circular order configurations ensuring the active option is ALWAYS centered (index 1).
 * Inactive options flank on the left (index 0) and right (index 2).
 */
const ROLE_LAYOUT_MAP: Record<RoleOption, [RoleOption, RoleOption, RoleOption]> = {
  'Investor': ['Broker', 'Investor', 'City staff'],
  'Broker': ['City staff', 'Broker', 'Investor'],
  'City staff': ['Investor', 'City staff', 'Broker'],
};

/**
 * Anti-Gravity fluid spring transition physics:
 * Snappy, weightless, and perfectly smooth without overlapping.
 */
const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 30,
  mass: 0.8,
};

/**
 * Modern Segmented Control with Anti-Gravity Framer Motion physics.
 * Active option is always pinned to the center with a dark red pill background.
 */
export const RoleSegmentedControl: React.FC<RoleSegmentedControlProps> = ({
  value,
  defaultValue = 'Investor',
  onChange,
  className = '',
  activeColor = '#88050B',
}) => {
  const [internalRole, setInternalRole] = useState<RoleOption>(defaultValue);
  const activeRole = value !== undefined ? value : internalRole;

  // Retrieve current 3-item order with activeRole guaranteed at slot index 1 (center)
  const currentSlots = ROLE_LAYOUT_MAP[activeRole] || ROLE_LAYOUT_MAP['Investor'];

  const handleSelect = (role: RoleOption) => {
    if (role === activeRole) return;
    if (value === undefined) {
      setInternalRole(role);
    }
    onChange?.(role);
  };

  return (
    <nav
      aria-label="Role selector"
      role="tablist"
      className={`relative flex items-center justify-between p-1 rounded-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] w-full max-w-[370px] h-[46px] select-none ${className}`}
    >
      {/* 
        Stationary Centered Dark Red Active Pill Background
        Positioned strictly in the exact center of the segmented container
      */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(33.333%-6px)] h-[calc(100%-8px)] rounded-full shadow-[0_4px_14px_rgba(136,5,11,0.35)] pointer-events-none transition-colors duration-200"
        style={{ backgroundColor: activeColor }}
      />

      {/* 
        Text Wrappers with Framer Motion <motion.div layout>
        As items reorder, Framer Motion smoothly glides the clicked label into the center
        and the previously active label to the side with weightless anti-gravity spring physics.
      */}
      {currentSlots.map((role) => {
        const isActive = role === activeRole;

        return (
          <motion.div
            key={role}
            layout
            transition={SPRING_TRANSITION}
            className="relative z-10 flex-1 h-full flex items-center justify-center"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handleSelect(role)}
              className={`w-full h-full flex items-center justify-center text-[13px] sm:text-[13.5px] font-semibold rounded-full select-none cursor-pointer outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#88050B] focus-visible:ring-offset-2 ${
                isActive
                  ? 'text-white font-bold cursor-default'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <motion.span layout="position">
                {role}
              </motion.span>
            </button>
          </motion.div>
        );
      })}
    </nav>
  );
};

export default RoleSegmentedControl;
