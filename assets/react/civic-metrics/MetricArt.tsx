import React from 'react';

export type MetricKind = 'residents' | 'households' | 'businesses' | 'finance' | 'education' | 'health' | 'land' | 'roads';

type ArtworkProps = {
  kind: MetricKind;
  assetBase: string;
};

const PHOTO_SPEC: Record<MetricKind, { file: string; position: string }> = {
  residents:  { file: 'residents.jpg',  position: '50% 56%' },
  households: { file: 'households.jpg', position: '50% 52%' },
  businesses: { file: 'businesses.jpg', position: '54% 48%' },
  finance:    { file: 'finance.jpg',    position: '50% 42%' },
  education:  { file: 'education.jpg',  position: '52% 40%' },
  health:     { file: 'health.jpg',     position: '50% 48%' },
  land:       { file: 'land.jpg',       position: '50% 52%' },
  roads:      { file: 'roads.jpg',      position: '48% 60%' },
};

export function MetricArt({ kind, assetBase }: ArtworkProps) {
  const { file, position } = PHOTO_SPEC[kind];
  const base = assetBase.replace(/\/+$/, '');
  return (
    <span className={`civic-art civic-art--${kind}`} aria-hidden="true">
      <img
        className="civic-art-photo"
        src={`${base}/images/civic/${file}`}
        alt=""
        width={800}
        height={600}
        decoding="async"
        style={{ objectPosition: position }}
      />
      <span className="civic-art-scrim" />
    </span>
  );
}
