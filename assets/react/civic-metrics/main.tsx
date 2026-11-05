import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { CivicMetrics } from './CivicMetrics';

const element = document.getElementById('locus-civic-metrics');
if (element && !element.dataset.hydrated) {
  hydrateRoot(element, <CivicMetrics />, { onRecoverableError(error) { console.error('LOCUS-SF civic widgets:', error); } });
  element.dataset.hydrated = 'true';
}
