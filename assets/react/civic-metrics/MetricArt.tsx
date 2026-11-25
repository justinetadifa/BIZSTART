import React from 'react';

export type MetricKind = 'residents' | 'households' | 'businesses' | 'finance' | 'education' | 'health' | 'land' | 'roads';

type ArtworkProps = {
  kind: MetricKind;
  assetBase: string;
};

const PHOTO_SPEC: Record<MetricKind, { file: string; position: string; tag: string }> = {
  residents:  { file: 'residents.jpg',  position: '50% 56%', tag: 'City Plaza' },
  households: { file: 'households.jpg', position: '50% 48%', tag: 'City Proper' },
  businesses: { file: 'businesses.jpg', position: '52% 40%', tag: 'Downtown CBD' },
  finance:    { file: 'finance.jpg',    position: '50% 44%', tag: 'LandBank SF' },
  education:  { file: 'education.jpg',  position: '52% 38%', tag: 'DMMMSU · MLUC' },
  health:     { file: 'health.jpg',     position: '62% 80%', tag: 'Lorma Medical' },
  land:       { file: 'land.jpg',       position: '50% 54%', tag: 'Poro Point' },
  roads:      { file: 'roads.jpg',      position: '48% 60%', tag: 'MacArthur Hwy' },
};

export function MetricArt({ kind, assetBase }: ArtworkProps) {
  const { file, position, tag } = PHOTO_SPEC[kind];
  const base = assetBase.replace(/\/+$/, '');
  return (
    <span className={`civic-art civic-art--${kind}`} aria-hidden="true">
      <img
        className="civic-art-photo"
        src={`${base}/images/civic/${file}`}
        alt=""
        width={800}
        height={600}
        style={{ objectPosition: position }}
      />
      <span className="civic-art-tag">{tag}</span>
    </span>
  );
}
