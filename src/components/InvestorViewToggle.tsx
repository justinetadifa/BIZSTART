import React, { useState } from 'react';
import { motion } from 'framer-motion';

export type ViewMode = 'Basic' | 'Advance' | 'Advanced';

export interface InvestorViewToggleProps {
  /** The currently active view mode in controlled mode */
  value?: ViewMode;
  /** The initial active view mode in uncontrolled mode (default: 'Basic') */
  defaultValue?: ViewMode;
  /** Callback fired whenever the selection changes */
  onChange?: (mode: ViewMode) => void;
  /** Custom options array (defaults to ['Basic', 'Advance']) */
  options?: readonly ViewMode[] | ViewMode[];
  /** Visual variant: 'dark-red' (Image 2: Dark Navy pill + Bright Red slider) or 'minimal-light' (Image 1: Light Gray + Navy) */
  variant?: 'dark-red' | 'minimal-light';
  /** Optional custom class name applied to the outer container */
  className?: string;
  /** Optional custom layoutId for Framer Motion */
  layoutId?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Accessible label for the control group */
  ariaLabel?: string;
}

/**
 * Spring physics for solid "Anti-Gravity" sliding pill animation:
 * Snappy, solid, and perfectly smooth without causing text overlap or glitching.
 */
const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
};

const DEFAULT_OPTIONS: readonly ViewMode[] = ['Basic', 'Advance'];

/**
 * Modern React Toggle Component ('Basic' vs 'Advance')
 * 
 * Supports:
 * - 'dark-red' (Default / Image 2): Dark Navy pill container with vibrant Red sliding active pill,
 *   bold italic active text, and crisp white inactive text.
 * - 'minimal-light' (Image 1): Light grayish-white container with Dark Navy active block.
 */
export const InvestorViewToggle: React.FC<InvestorViewToggleProps> = ({
  value,
  defaultValue = 'Basic',
  onChange,
  options = DEFAULT_OPTIONS,
  variant = 'dark-red',
  className = '',
  layoutId = 'investorViewToggleActivePill',
  size = 'md',
  disabled = false,
  ariaLabel = 'View mode toggle',
}) => {
  const [internalMode, setInternalMode] = useState<ViewMode>(defaultValue);
  const activeMode = value !== undefined ? value : internalMode;

  const handleSelect = (mode: ViewMode) => {
    if (disabled || mode === activeMode) return;
    if (value === undefined) {
      setInternalMode(mode);
    }
    onChange?.(mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const currentIndex = options.indexOf(activeMode);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % options.length;
      handleSelect(options[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      handleSelect(options[prevIndex]);
    }
  };

  // Variant themes
  const isDarkRed = variant === 'dark-red';

  // Size styling tokens
  const sizeClasses = {
    sm: {
      container: isDarkRed ? 'p-0.5 rounded-full' : 'p-1 rounded-xl',
      button: isDarkRed ? 'px-4 py-1 text-xs rounded-full min-h-[30px]' : 'px-4 py-1.5 text-xs rounded-lg min-h-[32px]',
      pillRadius: isDarkRed ? 'rounded-full' : 'rounded-lg',
    },
    md: {
      container: isDarkRed ? 'p-1 rounded-full' : 'p-1 sm:p-1.5 rounded-[14px]',
      button: isDarkRed ? 'px-5 py-2 text-xs sm:text-sm rounded-full min-h-[38px]' : 'px-5 py-2 text-xs sm:text-sm rounded-[10px] min-h-[38px]',
      pillRadius: isDarkRed ? 'rounded-full' : 'rounded-[10px]',
    },
    lg: {
      container: isDarkRed ? 'p-1.5 rounded-full' : 'p-1.5 rounded-2xl',
      button: isDarkRed ? 'px-6 py-2.5 text-sm sm:text-base rounded-full min-h-[44px]' : 'px-6 py-2.5 text-sm sm:text-base rounded-xl min-h-[44px]',
      pillRadius: isDarkRed ? 'rounded-full' : 'rounded-xl',
    },
  }[size];

  const containerTheme = isDarkRed
    ? 'bg-[#11224D] border border-[#0d1b3e] shadow-[0_4px_14px_rgba(17,34,77,0.3)]'
    : 'bg-[#F1F3F7] border border-[#E2E6EE] shadow-[0_1px_2px_rgba(17,34,77,0.04)]';

  const activePillTheme = isDarkRed
    ? 'bg-gradient-to-r from-[#FF1A4B] to-[#D90429] shadow-[0_2px_10px_rgba(217,4,41,0.5)]'
    : 'bg-[#11224D] shadow-[0_2px_6px_rgba(17,34,77,0.22)]';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex items-center gap-0 select-none
        transition-opacity duration-150
        ${containerTheme}
        ${sizeClasses.container}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
    >
      {options.map((option) => {
        const isActive = option === activeMode;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => handleSelect(option)}
            className={`
              relative tracking-wide
              transition-all duration-200 ease-out
              outline-none
              ${sizeClasses.button}
              ${isDarkRed ? (
                isActive
                  ? 'text-white font-black italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                  : 'text-white/90 hover:text-white font-bold'
              ) : (
                isActive
                  ? 'text-white font-bold'
                  : 'text-[#5A6578] hover:text-[#11224D] font-semibold'
              )}
            `}
          >
            {/* 
              Solid 'Anti-Gravity' layout-animated background pill:
              Rendered as an absolute div behind the text via layoutId.
              Instead of fading or snapping, it slides seamlessly behind the text.
            */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={SPRING_TRANSITION}
                className={`absolute inset-0 ${sizeClasses.pillRadius} ${activePillTheme} z-0 pointer-events-none`}
              />
            )}

            {/* Label text positioned strictly above the sliding background pill */}
            <span className="relative z-10 block pointer-events-none">
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Aliases for convenience and flexible naming conventions
export const ViewToggle = InvestorViewToggle;
export const BasicAdvancedToggle = InvestorViewToggle;
export default InvestorViewToggle;
