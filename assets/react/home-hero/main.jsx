import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HomeHero } from './HomeHero.jsx';

const root = document.getElementById('locus-react-hero');
if (root && !root.dataset.hydrated) {
  hydrateRoot(root, <HomeHero assetBase={root.dataset.assetBase} availability={root.dataset.availability} />, {
    onRecoverableError(error) { console.error('LOCUS-SF hero hydration:', error); },
  });
  root.dataset.hydrated = 'true';
}
