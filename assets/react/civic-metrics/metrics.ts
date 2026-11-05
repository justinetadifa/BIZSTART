import type { MetricKind } from './MetricArt';

export interface CivicMetric {
  id: MetricKind;
  value: string;
  unit?: string;
  label: string;
  source: string;
  caption: string;
  substat?: string;
  growth?: string;
  theme: string;
}
export interface CivicCategory { id: string; title: string; metrics: readonly CivicMetric[] }

// Figures and additions supplied in the civic-widget brief. The SVGs are
// conceptual illustrations; their coordinates do not encode additional data.
export const civicCategories: readonly CivicCategory[] = [
  { id: 'people', title: 'People', metrics: [
    { id: 'residents', value: '128,024', label: 'Residents', source: 'PSA Census', caption: 'PSA Census · ▲ 1.4% YoY', theme: 'crimson' },
    { id: 'households', value: '32,202', label: 'Households', source: 'PSA Census · 4.0 people per household', caption: 'PSA Census · Avg. 4.0 people per household', theme: 'peach' },
  ] },
  { id: 'business', title: 'Business', metrics: [
    { id: 'businesses', value: '9,129', label: 'Registered businesses', source: 'BPLO / CPDO', caption: 'BPLO / CPDO', growth: '▲ 2.7%', theme: 'amber' },
    { id: 'finance', value: '170', label: 'Financial institutions', source: 'BSP Region I', caption: 'BSP Region I', theme: 'navy' },
  ] },
  { id: 'services', title: 'Education & health', metrics: [
    { id: 'education', value: '11', label: 'Universities & colleges', source: 'CHED Region I', caption: 'CHED Region I', theme: 'cobalt' },
    { id: 'health', value: '292', label: 'Healthcare facilities', source: 'DOH / City Health Office', caption: 'DOH / City Health Office', substat: 'Public: 84 · Private: 208', theme: 'mint' },
  ] },
  { id: 'connections', title: 'City & connections', metrics: [
    { id: 'land', value: '105.26', unit: 'km²', label: 'Land area', source: '59 barangays · City Assessor / CPDO', caption: '59 barangays · City Assessor / CPDO', theme: 'forest' },
    { id: 'roads', value: '279.52', unit: 'km', label: 'Road network', source: 'DPWH / City Engineering', caption: 'DPWH / City Engineering', theme: 'slate' },
  ] },
];

export const civicMetrics = civicCategories.flatMap(category => category.metrics.map(metric => ({ ...metric, category: category.title, categoryId: category.id })));
export type FullMetric = typeof civicMetrics[number];
