import React from 'react';
import { renderToString } from 'react-dom/server';
import { CivicMetrics } from './CivicMetrics';
export const html = renderToString(<CivicMetrics assetBase="__LOCUS_ASSET_BASE__" />);
