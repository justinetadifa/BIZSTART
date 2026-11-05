import React from 'react';
import { renderToString } from 'react-dom/server';
import { HomeHero } from './HomeHero.jsx';

export const html = renderToString(<HomeHero assetBase="__LOCUS_ASSET_BASE__" availability="__LOCUS_AVAILABILITY__" />);
