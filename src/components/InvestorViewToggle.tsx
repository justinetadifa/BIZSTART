import React, { useState } from 'react';
import { motion } from 'framer-motion';

export type ViewMode = 'Basic' | 'Advanced';

export interface InvestorViewToggleProps {
  /** The currently active view mode ('Basic' | 'Advanced') in controlled mode */
  value?: ViewMode;
  /** The initial active view mode in uncontrolled mode (default: 'Basic') */
  defaultValue?: ViewMode;
  /** Callback fired whenever the selection changes */
  onChange?: (mode: ViewMode) => void;
  /** Custom options array (defaults to ['Basic', 'Advanced']) */
  options?: readonly [ViewMode, ViewMode] | ViewMode[];
  /** Optional custom class name applied to the outer container */
  className?: string;
  /** Optional custom layoutId for Framer Motion (useful if multiple toggles exist on the same page) */
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

const DEFAULT_OPTIONS: readonly [ViewMode, ViewMode] = ['Basic', 'Advanced'];

/**
 * Modern React Toggle Component ('Basic' vs 'Advanced')
 * 
 * Replaces the outdated heavy dark-blue container and bright red active pill with
 * a clean, minimalist light theme:
 * - Container: Light grayish-white background with subtle border and soft rounded corners.
 * - Active State: Solid dark navy background block with crisp white text.
 * - Inactive State: Transparent background with muted grayish-blue text (no italics, no drop-shadows).
 * - Animation: Framer Motion `layoutId` solid sliding background behind the text.
 */
export const InvestorViewToggle: React.FC<InvestorViewToggleProps> = ({
  value,
  defaultValue = 'Basic',
  onChange,
  options = DEFAULT_OPTIONS,
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

  // Size styling tokens
  const sizeClasses = {
    sm: {
      container: 'p-1 rounded-xl',
      button: 'px-4 py-1.5 text-xs rounded-lg min-h-[32px]',
    },
    md: {
      container: 'p-1 sm:p-1.5 rounded-[14px]',
      button: 'px-5 py-2 text-xs sm:text-sm rounded-[10px] min-h-[38px]',
    },
    lg: {
      container: 'p-1.5 rounded-2xl',
      button: 'px-6 py-2.5 text-sm sm:text-base rounded-xl min-h-[44px]',
    },
  }[size];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex items-center gap-1 select-none
        bg-[#F1F3F7] border border-[#E2E6EE] shadow-[0_1px_2px_rgba(17,34,77,0.04)]
        transition-opacity duration-150
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${sizeClasses.container}
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
              relative font-semibold tracking-wide
              transition-colors duration-200 ease-out
              outline-none focus-visible:ring-2 focus-visible:ring-[#11224D]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F3F7]
              ${sizeClasses.button}
              ${isActive ? 'text-white' : 'text-[#5A6578] hover:text-[#11224D]'}
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
                className="absolute inset-0 bg-[#11224D] rounded-[10px] shadow-[0_2px_6px_rgba(17,34,77,0.22)] z-0 pointer-events-none"
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
