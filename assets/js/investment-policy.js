// Policy support is separate from the departmental MCE / IAI calculation.
export function priorityActivity(policy, key) {
  return (policy?.business_types || []).find(activity => activity.id === key) || null;
}

export function policyScore(base, activity, policy) {
  if (base === null || base === undefined || base === '' || !Number.isFinite(Number(base))) {
    return { base: null, percent: 0, adjustment: null, applied: null, final: null };
  }
  const value = Math.max(0, Math.min(100, Number(base)));
  const configured = Number(policy?.policy_priority_adjustment_percent);
  const approved = policy?.priority_modifier_approved === true && Boolean(String(policy?.priority_modifier_approval_reference || '').trim());
  const percent = activity?.sector && approved && Number.isFinite(configured)
    ? Math.max(0, Math.min(100, configured)) : 0;
  const round = number => Math.round((number + Number.EPSILON) * 10) / 10;
  const adjustment = round(value * percent / 100);
  const final = round(Math.min(100, value + adjustment));
  return { base: value, percent, adjustment, applied: round(final - value), final };
}

export function potentialIncentive(capital, policy) {
  const amount = Number(capital);
  if (capital === '' || capital === null || !Number.isFinite(amount) || amount < 0) {
    return { badge: 'Enter capitalization', copy: 'Enter a valid proposed amount in PHP.', eligible: false };
  }
  if (policy?.incentives_verified !== true) {
    return { badge: 'Subject to verification', copy: 'Ask LEBDO to verify the applicable incentive for this investment.', eligible: false };
  }
  const thresholds = policy.incentive_thresholds || {};
  const { tier1_min_capital: exemptMin, tier1_exemption_years: years, tier2_min_capital: discountMin, tier2_max_capital: discountMax, tier2_discount_percent: discount } = thresholds;
  if (![exemptMin, years, discountMin, discountMax, discount].every(value => typeof value === 'number' && Number.isFinite(value)) || exemptMin <= discountMax || discountMin > discountMax || discountMin < 0 || years <= 0 || discount <= 0 || discount > 100) {
    return { badge: 'Subject to verification', copy: 'Ask LEBDO to verify the applicable incentive for this investment.', eligible: false };
  }
  if (amount >= exemptMin) {
    return { badge: 'Potential exemption', copy: `Potentially eligible for a ${years}-year Local Business Tax exemption, subject to LGU approval.`, eligible: true };
  }
  if (amount >= discountMin && amount <= discountMax) {
    return { badge: 'Potential discount', copy: `Potentially eligible for a ${discount}% Local Business Tax discount, subject to LGU approval.`, eligible: true };
  }
  if (amount > discountMax) {
    return { badge: 'LGU clarification needed', copy: 'This amount falls between the ordinance’s stated discount ceiling and exemption threshold. Ask LEBDO to confirm its treatment.', eligible: false };
  }
  return { badge: 'Small enterprise review', copy: 'Ask LEBDO about small-enterprise or BMBE registration. BMBE eligibility uses total assets excluding land and other conditions; capitalization alone does not establish eligibility.', eligible: false };
}
