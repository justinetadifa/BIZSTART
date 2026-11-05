import React from 'react';

export type MetricKind = 'residents' | 'households' | 'businesses' | 'finance' | 'education' | 'health' | 'land' | 'roads';

type ArtworkProps = { kind: MetricKind };

// These drawings are conceptual visual treatments, not historical data plots
// or a geographic map. All geometry is deterministic for server hydration.
function Contours() {
  const outline = (ring: number) => {
    const points = Array.from({ length: 20 }, (_, index) => {
      const angle = index * Math.PI / 10;
      const radius = 17 + ring * 8;
      const irregularity = 1 + .12 * Math.sin(angle * 3 + .5) + .08 * Math.cos(angle * 5);
      return [187 + Math.cos(angle) * radius * irregularity, 132 + Math.sin(angle) * radius * .43 * irregularity];
    });
    return points.map((point, index) => {
      const previous = points[(index + points.length - 1) % points.length];
      const next = points[(index + 1) % points.length];
      const following = points[(index + 2) % points.length];
      const end = `${next[0].toFixed(2)} ${next[1].toFixed(2)}`;
      const first = `${(point[0] + (next[0] - previous[0]) / 6).toFixed(2)} ${(point[1] + (next[1] - previous[1]) / 6).toFixed(2)}`;
      const second = `${(next[0] - (following[0] - point[0]) / 6).toFixed(2)} ${(next[1] - (following[1] - point[1]) / 6).toFixed(2)}`;
      return `${index === 0 ? `M${point[0].toFixed(2)} ${point[1].toFixed(2)} ` : ''}C${first} ${second} ${end}`;
    }).join(' ') + 'Z';
  };
  return <>
    {Array.from({ length: 11 }, (_, index) => <path key={index} d={outline(index)} stroke="#69D49A" strokeWidth={index % 3 === 0 ? 1 : .65} opacity={.38 - index * .019} />)}
    <path d="M45 78c14 5 19 14 17 26s13 16 13 28-10 18-4 29 7 19 5 27" stroke="#A5EDD1" strokeWidth="1.4" opacity=".7" />
    <path d="M37 84c13 5 17 11 15 23s12 18 12 27-8 16-4 25 6 17 5 24" stroke="#69D49A" strokeWidth=".65" opacity=".26" />
    <path d="m74 103 30-16 34 8 14-17 42 11 22 28 30 9-7 25-34 10-20 23-28-9-21 6-24-24-27-5-13-27Z" stroke="#97E1B2" strokeWidth=".85" strokeDasharray="2 3" opacity=".45" />
    <path d="m95 147 27-19 24 12 31-25 24 15 22-6M119 91l9 37 21 47m28-60 10 35 17 12" stroke="#A8E9C4" strokeWidth=".65" opacity=".2" />
    <circle cx="177" cy="115" r="2.8" fill="#BCEFD2" opacity=".8" />
    <circle cx="177" cy="115" r="7" stroke="#BCEFD2" strokeWidth=".6" opacity=".3" />
  </>;
}

function Drawing({ kind }: ArtworkProps) {
  switch (kind) {
    case 'residents':
      return <>
        <defs>
          <linearGradient id="civic-residents-area" x1="0" y1="80" x2="0" y2="174" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF1E9" stopOpacity=".23" /><stop offset="1" stopColor="#FFF1E9" stopOpacity="0" /></linearGradient>
          <radialGradient id="civic-residents-glow"><stop stopColor="#FFF" stopOpacity=".8" /><stop offset="1" stopColor="#FFF" stopOpacity="0" /></radialGradient>
        </defs>
        {Array.from({ length: 8 }, (_, row) => Array.from({ length: 45 }, (_, column) => {
          const x = 6 + column * 6.2;
          const y = 153 + row * 3.7 + Math.sin(column * .21 + row * .32) * (4 + row * .6);
          return <circle key={`${row}-${column}`} cx={x} cy={y} r=".65" fill="#FFF0EC" opacity={.14 + row * .012} />;
        }))}
        <path d="M18 143c12-3 15-14 25-11s13 7 22-3 12-3 20-10 10 3 17-6 12 2 19-8 12 5 21-8 13 13 22-1 12 4 20-3 13 4 23-8 10 6 19-6 9 5 16-4 10-2 18-8v105H18Z" fill="url(#civic-residents-area)" />
        <path d="M18 143c12-3 15-14 25-11s13 7 22-3 12-3 20-10 10 3 17-6 12 2 19-8 12 5 21-8 13 13 22-1 12 4 20-3 13 4 23-8 10 6 19-6 9 5 16-4 10-2 18-8" fill="none" stroke="#FFECE4" strokeWidth="7" opacity=".08" strokeLinecap="round" />
        <path d="M18 143c12-3 15-14 25-11s13 7 22-3 12-3 20-10 10 3 17-6 12 2 19-8 12 5 21-8 13 13 22-1 12 4 20-3 13 4 23-8 10 6 19-6 9 5 16-4 10-2 18-8" fill="none" stroke="#FFF2EB" strokeWidth="1.8" opacity=".9" strokeLinecap="round" />
        <circle className="civic-art-pulse" cx="260" cy="67" r="13" fill="url(#civic-residents-glow)" opacity=".65" />
        <circle cx="260" cy="67" r="3" fill="#FFF8EF" />
      </>;
    case 'households':
      return <>
        <path d="M0 150c23-11 29-39 58-36s34 28 62 13 37-39 69-35 53 37 91 26v72H0Z" fill="#A94936" opacity=".15" />
        <path d="M0 160c25-8 33-30 61-27s34 15 56 6 39-34 67-33 61 33 96 27v57H0Z" fill="#B84E3E" opacity=".22" />
        <path d="M0 171c34-13 44-17 67-15s36 7 57-2 47-37 69-35 47 31 87 30v41H0Z" fill="#FFE4D7" opacity=".38" />
        <path d="M0 171c34-13 44-17 67-15s36 7 57-2 47-37 69-35 47 31 87 30" fill="none" stroke="#FFEAE0" strokeWidth="1" opacity=".5" />
        <g stroke="#FFF0E8" strokeWidth=".6" strokeLinejoin="round">
          <path d="m197 175 14-8 43 25-14 8Z" fill="#FFF4EB" opacity=".36" />
          <path d="m205 161 9-5 10 6-9 5Z" fill="#FDE2D3" opacity=".92" /><path d="M205 161v19l10 6v-19Z" fill="#BD6552" opacity=".75" /><path d="m215 167 9-5v19l-9 5Z" fill="#E8A08A" opacity=".9" />
          <path d="m218 145 9-5 10 6-9 5Z" fill="#FFE5D7" opacity=".95" /><path d="M218 145v31l10 6v-31Z" fill="#C26C58" opacity=".72" /><path d="m228 151 9-5v31l-9 5Z" fill="#EBA18A" opacity=".95" />
          <path d="m231 129 9-5 10 6-9 5Z" fill="#FFEDDF" /><path d="M231 129v43l10 6v-43Z" fill="#C6715B" opacity=".78" /><path d="m241 135 9-5v43l-9 5Z" fill="#F5B39B" />
        </g>
      </>;
    case 'businesses':
      return <>
        <defs><radialGradient id="civic-businesses-glow"><stop stopColor="#FFF0B5" stopOpacity=".8" /><stop offset="1" stopColor="#FFF0B5" stopOpacity="0" /></radialGradient></defs>
        <g fill="none" stroke="#FFE8AE" strokeWidth=".65" opacity=".25">
          {Array.from({ length: 15 }, (_, index) => <path key={`v${index}`} d={`M${112 + index * 4} 77 ${-12 + index * 22} 177`} />)}
          {[82, 89, 99, 113, 132, 156, 177].map((y, index) => <path key={`h${index}`} d={`M${108 - index * 20} ${y}h${68 + index * 40}`} />)}
        </g>
        {Array.from({ length: 9 }, (_, row) => Array.from({ length: 15 }, (_, column) => {
          const spread = .26 + row * .094;
          const x = 140 + (column - 7) * 18 * spread;
          const y = 82 + row * row * 1.4;
          return <circle key={`${row}-${column}`} cx={x} cy={y} r={.65 + row * .03} fill="#FFE7A9" opacity={.2 + ((row * 7 + column) % 5) * .065} />;
        }))}
        <g fill="#FFF1C1">
          {[[97, 123], [168, 105], [209, 148], [138, 157], [61, 156]].map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="12" fill="url(#civic-businesses-glow)" opacity=".65" /><circle cx={x} cy={y} r="1.7" opacity=".9" /><path d={`M${x} ${y - 9}v18m-9-9h18`} stroke="#FFE9A9" strokeWidth=".5" opacity=".35" /></g>)}
        </g>
        <path d="m83 149 16-10 16 6 27-23 18 8 28-17 17 9 29-16" fill="none" stroke="#FFEBC0" strokeWidth="1" strokeDasharray="2 5" opacity=".35" />
      </>;
    case 'finance':
      return <>
        <defs><linearGradient id="civic-finance-pillar" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F4D9A2" stopOpacity=".28" /><stop offset="1" stopColor="#D4A65E" stopOpacity=".03" /></linearGradient><radialGradient id="civic-finance-glow"><stop stopColor="#FFEBC1" stopOpacity=".6" /><stop offset="1" stopColor="#FFEBC1" stopOpacity="0" /></radialGradient></defs>
        <g stroke="#D1AF77" strokeWidth=".6" fill="url(#civic-finance-pillar)">
          {[16, 29, 43, 60].map((height, index) => <g key={height}><rect x={169 + index * 22} y={177 - height} width="14" height={height} rx="2" opacity=".66" /><path d={`M${172 + index * 22} ${181 - height}h8`} opacity=".4" /></g>)}
        </g>
        <path d="M19 157c14-11 22-32 34-25s11 14 22 3 18-13 29-12 12-15 23-15 11 10 20 3 17-33 29-27 14 19 25 9 18-18 30-30" fill="none" stroke="#F4C467" strokeWidth="7" strokeLinecap="round" opacity=".07" />
        <path d="M19 157c14-11 22-32 34-25s11 14 22 3 18-13 29-12 12-15 23-15 11 10 20 3 17-33 29-27 14 19 25 9 18-18 30-30" fill="none" stroke="#F4C467" strokeWidth="1.9" strokeLinecap="round" opacity=".95" />
        <circle cx="231" cy="63" r="14" fill="url(#civic-finance-glow)" /><circle cx="231" cy="63" r="2.6" fill="#FFE7AE" />
        <path d="M18 178h243" fill="none" stroke="#E7CC9A" strokeWidth=".55" opacity=".16" />
      </>;
    case 'education':
      return <>
        <g fill="none" stroke="#C7DDFF" strokeLinecap="round" strokeLinejoin="round">
          <path d="M49 169h183M57 164h167M64 113h153v48H64Z" strokeWidth="1" opacity=".65" />
          <path d="M52 113h174v-7H52ZM97 106l43-29 44 29ZM105 104l35-22 35 22Z" strokeWidth="1" opacity=".85" />
          <path d="M140 77V64m0 0 15 3-15 5" strokeWidth="1" opacity=".8" />
          <path d="M100 112h81v49h-81Z" fill="#DDEAFF" fillOpacity=".04" strokeWidth=".8" opacity=".7" />
          {[105, 123, 151, 169].map(x => <g key={x}><path d={`M${x} 119h6v36h-6Zm-2-3h10m-10 42h10`} strokeWidth=".9" opacity=".85" /></g>)}
          <path d="M135 161v-20a6 6 0 0 1 12 0v20M134 124a7 7 0 0 1 14 0v6h-14Z" strokeWidth=".9" opacity=".8" />
          {[72, 85, 188, 201].map(x => <g key={x}>{[121, 138].map(y => <path key={y} d={`M${x} ${y}h6v11h-6Zm3 0v11m-3-5.5h6`} strokeWidth=".65" opacity=".7" />)}</g>)}
          <path d="M45 175h192M45 105V94h26m150 0h16v11M91 77h-9v20m116-20h9v20" strokeWidth=".6" opacity=".3" />
          {Array.from({ length: 34 }, (_, index) => <path key={index} d={`M${25 + index * 7} 178v${index % 5 === 0 ? 7 : 4}`} strokeWidth=".6" opacity={index % 5 === 0 ? .65 : .3} />)}
        </g>
        <circle cx="140" cy="96" r="3.2" fill="#DDEAFF" opacity=".55" />
      </>;
    case 'health':
      return <>
        <defs><radialGradient id="civic-health-aura"><stop stopColor="#64B5AB" stopOpacity=".27" /><stop offset="1" stopColor="#64B5AB" stopOpacity="0" /></radialGradient></defs>
        <circle cx="54" cy="131" r="39" fill="url(#civic-health-aura)" />
        <path d="m54 105 8 5 10 1 2 9 5 9-5 8-2 10-10 2-8 5-8-5-10-2-2-10-5-8 5-9 2-9 10-1Z" fill="#318A80" opacity=".14" />
        <circle cx="54" cy="130" r="20" fill="#26796F" opacity=".65" /><circle cx="54" cy="130" r="17" fill="none" stroke="#F1FFFC" strokeWidth=".8" opacity=".65" />
        <path d="M50 119h8v7h7v8h-7v7h-8v-7h-7v-8h7Z" fill="#F0FFFA" opacity=".9" />
        <g stroke="#347C76" strokeWidth=".9" strokeLinejoin="round">
          <path d="m139 157 32-18 83 35-31 18Z" fill="#5BA79E" fillOpacity=".12" strokeOpacity=".12" />
          <path d="m153 110 43-21 42 19-43 22Z" fill="#E8FAF5" fillOpacity=".65" strokeOpacity=".6" />
          <path d="M153 110v55l42 20v-55Z" fill="#F0FFFB" fillOpacity=".58" strokeOpacity=".55" /><path d="m195 130 43-22v56l-43 21Z" fill="#70B9AF" fillOpacity=".2" strokeOpacity=".55" />
          <path d="m158 109 38-17 36 16-37 18Z" fill="#3E8E85" fillOpacity=".18" strokeOpacity=".4" />
          <path d="m169 172 10 5v-19l-10-5Z" fill="#246D66" fillOpacity=".55" strokeOpacity=".6" /><path d="M174 156v18" stroke="#D7F2EA" strokeOpacity=".7" />
          {[0, 1].map(column => [0, 1].map(row => <path key={`${column}-${row}`} d={`m${161 + column * 18} ${124 + row * 16} 7 3v8l-7-3Z`} fill="#398E86" fillOpacity=".3" strokeOpacity=".15" />))}
          {[0, 1].map(column => [0, 1, 2].map(row => <path key={`${column}-${row}`} d={`m${204 + column * 17} ${137 + row * 12} 7-4v7l-7 4Z`} fill="#2C7D74" fillOpacity=".3" strokeOpacity=".15" />))}
          <path d="m209 108 5-2v-5l5-3v5l5-2v5l-5 3v5l-5 2v-5l-5 2Z" fill="#A6413E" fillOpacity=".82" stroke="none" />
        </g>
      </>;
    case 'land':
      return <g fill="none"><Contours /></g>;
    case 'roads':
      return <>
        <defs><radialGradient id="civic-roads-node"><stop stopColor="#FFE1CF" stopOpacity=".65" /><stop offset="1" stopColor="#FFB09C" stopOpacity="0" /></radialGradient></defs>
        <g fill="none" stroke="#C4D4DE" strokeWidth=".55" opacity=".13">
          {Array.from({ length: 10 }, (_, index) => <path key={`v${index}`} d={`M${25 + index * 25} 70v108`} />)}
          {Array.from({ length: 6 }, (_, index) => <path key={`h${index}`} d={`M20 ${78 + index * 19}h242`} />)}
        </g>
        <g fill="none" stroke="#E5ECF1" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" opacity=".4">
          <path d="m35 89 28 24h32l28 25h32l22-20h38l24-18m-213 45h65l21 21h68l24-23h49M81 78v35l28 27v37m34-104v34l16 15v51m41-94v30l23 22v42M54 170l31-29 27-19h42l29-30h58" />
          <path d="M28 124h40l23-25h44l25 28h36l24 21h42M47 78l28 17v31l21 18h55l19 18h63" strokeDasharray="2 3" opacity=".65" />
        </g>
        <g fill="none" stroke="#EBA48F" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity=".75"><path d="m62 81 27 28h28l21 22v27h37l28-28V97h30m-113 74v-23l27-27v-31m-5 42h60l23 21h40" /></g>
        {[[63, 113], [95, 113], [123, 138], [155, 138], [177, 118], [215, 118], [91, 145], [112, 166], [180, 166], [204, 143], [143, 107], [200, 109]].map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r={index % 3 === 0 ? 5.5 : 3.5} fill="url(#civic-roads-node)" opacity=".6" /><circle cx={x} cy={y} r="1.5" fill={index % 3 === 0 ? '#FFC4AC' : '#E1EBEE'} opacity=".9" /><circle cx={x} cy={y} r="2.6" fill="none" stroke="#EAD8D0" strokeWidth=".5" opacity=".4" /></g>)}
      </>;
  }
}

export function MetricArt({ kind }: ArtworkProps) {
  return <svg className={`civic-art civic-art--${kind}`} viewBox="0 0 280 230" preserveAspectRatio="none" aria-hidden="true" focusable="false" fill="none">
    <Drawing kind={kind} />
  </svg>;
}
