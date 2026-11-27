import React, { useMemo, useState } from 'react';
import { ChileanRegion, Delegate, Motion, MotionVote } from '../../types/plenario';
import { CHILE_REGIONS_GEO, getChileRegionColor } from '../../data/chileRegionsGeo';
import { usePlenario } from '../../context/PlenarioContext';

interface HemicicloPlenarioChartProps {
  motion: Motion | null;
  delegates: Delegate[];
  maxHeightClass?: string;
}

const REGION_NORTH_TO_SOUTH_ORDER: ChileanRegion[] = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes'
];

export const HemicicloPlenarioChart: React.FC<HemicicloPlenarioChartProps> = ({
  motion,
  delegates,
  maxHeightClass = 'max-h-[165px]'
}) => {
  const { theme } = usePlenario();
  const isDark = theme === 'dark';
  const [selectedDel, setSelectedDel] = useState<{ delegate: Delegate; vote?: MotionVote } | null>(null);

  const isLiveVoting = motion?.status === 'VOTING';
  const isDissensus =
    motion?.motionKind === 'DISENSO_PRIMERA_VUELTA' ||
    motion?.motionKind === 'DISENSO_SEGUNDA_VUELTA';

  const votes = motion?.votes || {};

  // Combine accredited voting delegates with any historical voters not currently in padrón,
  // sorted strictly north-to-south by region and alphabetically by name within each region
  const votingDelegates = useMemo(() => {
    const base = delegates.filter(d => d.role === 'DELEGATE');
    const knownIds = new Set(base.map(d => d.id));
    const extraHistorical: Delegate[] = [];

    Object.values(votes).forEach((v) => {
      if (!knownIds.has(v.delegateId)) {
        knownIds.add(v.delegateId);
        extraHistorical.push({
          id: v.delegateId,
          name: v.delegateName,
          username: '',
          region: v.region,
          role: 'DELEGATE',
          organization: 'Delegación Regional',
          isOnline: false,
          hasSpokenInCurrentMotion: false
        });
      }
    });

    const regionOrderMap = new Map<string, number>();
    REGION_NORTH_TO_SOUTH_ORDER.forEach((reg, idx) => regionOrderMap.set(reg, idx));

    return [...base, ...extraHistorical].sort((a, b) => {
      const orderA = regionOrderMap.has(a.region) ? regionOrderMap.get(a.region)! : 99;
      const orderB = regionOrderMap.has(b.region) ? regionOrderMap.get(b.region)! : 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.region !== b.region) return a.region.localeCompare(b.region, 'es', { sensitivity: 'base' });
      const nameCmp = (a.name || '').trim().localeCompare((b.name || '').trim(), 'es', { sensitivity: 'base' });
      if (nameCmp !== 0) return nameCmp;
      return a.id.localeCompare(b.id);
    });
  }, [delegates, votes]);

  // Regions currently represented in the hemiciclo (ordered north-to-south matching map)
  const representedRegions = useMemo(() => {
    const counts = new Map<ChileanRegion, number>();
    votingDelegates.forEach((d) => {
      counts.set(d.region, (counts.get(d.region) || 0) + 1);
    });

    const geoById = new Map(CHILE_REGIONS_GEO.map((r) => [r.id, r]));

    const ordered = REGION_NORTH_TO_SOUTH_ORDER.filter((regionId) => counts.has(regionId)).map((regionId) => {
      const geo = geoById.get(regionId);
      return {
        id: regionId,
        numeral: geo?.numeral || '',
        color: geo?.accent || getChileRegionColor(regionId),
        count: counts.get(regionId) || 0
      };
    });

    counts.forEach((count, regionId) => {
      if (!REGION_NORTH_TO_SOUTH_ORDER.includes(regionId)) {
        ordered.push({
          id: regionId,
          numeral: '',
          color: getChileRegionColor(regionId),
          count
        });
      }
    });

    return ordered;
  }, [votingDelegates]);

  // Balanced concentric parliamentary arc layout:
  // fills left-to-right, from the outermost (back) arc inward toward the center (MESA)
  const {
    hemicircleNodes,
    guideRadii,
    seatInnerR,
    seatOuterR,
    whiteStrokeW,
    regionStrokeW
  } = useMemo(() => {
    const total = votingDelegates.length;
    const cx = 150;
    const cy = 142;

    if (total === 0) {
      return {
        hemicircleNodes: [] as Array<{ delegate: Delegate; x: number; y: number }>,
        guideRadii: [120, 92, 64],
        seatInnerR: 5.6,
        seatOuterR: 7.4,
        whiteStrokeW: 1.2,
        regionStrokeW: 2.1
      };
    }

    // Radii ordered from back (outermost) to center (innermost)
    let radii: number[];
    if (total <= 6) {
      radii = [92];
    } else if (total <= 13) {
      radii = [108, 72];
    } else if (total <= 33) {
      radii = [120, 92, 64];
    } else if (total <= 58) {
      radii = [124, 100, 76, 52];
    } else if (total <= 90) {
      radii = [124, 104, 84, 64, 44];
    } else {
      radii = [125, 108, 91, 74, 57, 40];
    }

    // Proportional seat allocation by arc radius (Largest Remainder Method)
    const sumRadii = radii.reduce((acc, r) => acc + r, 0);
    const exact = radii.map((r) => (total * r) / sumRadii);
    const counts = exact.map((val) => Math.floor(val));
    const remainder = total - counts.reduce((acc, c) => acc + c, 0);

    const remaindersOrder = exact
      .map((val, idx) => ({ idx, frac: val - counts[idx] }))
      .sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : a.idx - b.idx));

    for (let k = 0; k < remainder; k++) {
      counts[remaindersOrder[k].idx] += 1;
    }

    // Fill back-to-center (outer radius -> inner radius), left-to-right (startAngle -> endAngle)
    let minCircPitch = 999;
    const nodes: Array<{ delegate: Delegate; x: number; y: number }> = [];
    let currentIdx = 0;

    radii.forEach((radius, arcIdx) => {
      const seatsInArc = counts[arcIdx];
      if (seatsInArc <= 0) return;

      const effectiveSpanDeg =
        seatsInArc <= 1 ? 0 :
        seatsInArc === 2 ? 44 :
        seatsInArc === 3 ? 76 :
        seatsInArc === 4 ? 104 :
        seatsInArc === 5 ? 128 :
        152;

      if (seatsInArc > 1) {
        const spanRad = (effectiveSpanDeg * Math.PI) / 180;
        const arcStepDist = (radius * spanRad) / (seatsInArc - 1);
        if (arcStepDist < minCircPitch) {
          minCircPitch = arcStepDist;
        }
      }

      const startAngleDeg = 270 - effectiveSpanDeg / 2;
      const stepDeg = seatsInArc > 1 ? effectiveSpanDeg / (seatsInArc - 1) : 0;

      for (let i = 0; i < seatsInArc && currentIdx < total; i++) {
        const angleDeg = seatsInArc === 1 ? 270 : startAngleDeg + i * stepDeg;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = cx + radius * Math.cos(angleRad);
        const y = cy + radius * Math.sin(angleRad);

        nodes.push({
          delegate: votingDelegates[currentIdx],
          x,
          y
        });
        currentIdx++;
      }
    });

    const radialPitch = radii.length > 1 ? Math.abs(radii[0] - radii[1]) : 30;
    const minPitch = Math.min(minCircPitch, radialPitch);
    const computedOuterR = Math.min(7.4, Math.max(3.6, minPitch * 0.36));
    const scale = computedOuterR / 7.4;

    return {
      hemicircleNodes: nodes,
      guideRadii: radii,
      seatInnerR: 5.6 * scale,
      seatOuterR: computedOuterR,
      whiteStrokeW: Math.max(0.7, 1.2 * scale),
      regionStrokeW: Math.max(1.2, 2.1 * scale)
    };
  }, [votingDelegates]);

  const getNodeColor = (delId: string) => {
    const v = votes[delId];
    if (!v) return isDark ? '#475569' : '#CBD5E1';
    if (v.vote === 'A_FAVOR') return isDark ? '#7E22CE' : '#4A154B';
    if (v.vote === 'EN_CONTRA') return '#DC2626';
    if (v.vote === 'ABSTENCION') return '#64748B';
    if (v.vote === 'OPCION_A') return '#0284C7';
    if (v.vote === 'OPCION_B') return '#D97706';
    if (v.vote === 'OPCION_C') return '#059669';
    return '#64748B';
  };

  const votesList = Object.values(votes);
  const totalCast = votesList.length;
  const pendientes = Math.max(0, votingDelegates.length - totalCast);

  const aFavor = votesList.filter(v => v.vote === 'A_FAVOR').length;
  const enContra = votesList.filter(v => v.vote === 'EN_CONTRA').length;
  const abstencion = votesList.filter(v => v.vote === 'ABSTENCION').length;

  const opcA = votesList.filter(v => v.vote === 'OPCION_A').length;
  const opcB = votesList.filter(v => v.vote === 'OPCION_B').length;
  const opcC = votesList.filter(v => v.vote === 'OPCION_C').length;

  const formatVoteTag = (voteStr?: string) => {
    if (!voteStr) return isLiveVoting ? 'VOTO PENDIENTE' : 'NO EMITIÓ VOTO';
    switch (voteStr) {
      case 'A_FAVOR': return 'A FAVOR';
      case 'EN_CONTRA': return 'EN CONTRA';
      case 'ABSTENCION': return 'ABSTENCIÓN';
      case 'OPCION_A': return 'OPCIÓN A';
      case 'OPCION_B': return 'OPCIÓN B';
      case 'OPCION_C': return 'OPCIÓN C';
      default: return voteStr.replace('_', ' ');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative flex items-center justify-center min-h-[130px] py-1 px-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        {votingDelegates.length > 0 ? (
          <svg
            viewBox="0 0 300 160"
            preserveAspectRatio="xMidYMid meet"
            className={`w-full aspect-[300/160] ${maxHeightClass} drop-shadow-2xs`}
          >
            {/* Dynamic Guide Arcs matching active concentric rows */}
            {guideRadii.map((r) => (
              <path
                key={r}
                d={`M ${150 - r},142 A ${r},${r} 0 0,1 ${150 + r},142`}
                fill="none"
                stroke={isDark ? '#334155' : '#F1F5F9'}
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            ))}

            {/* Central Podium */}
            <rect x="133" y="132" width="34" height="12" rx="4" fill={isDark ? '#7E22CE' : '#4A154B'} />
            <text x="150" y="140" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">MESA</text>

            {/* Seat Nodes (fill = vote color, outer border ring = region color matching Chile map) */}
            {hemicircleNodes.map(({ delegate, x, y }) => {
              const v = votes[delegate.id];
              const voteFillColor = getNodeColor(delegate.id);
              const regionBorderColor = getChileRegionColor(delegate.region);
              const isSelected = selectedDel?.delegate.id === delegate.id;

              return (
                <g
                  key={delegate.id}
                  onMouseEnter={() => setSelectedDel({ delegate, vote: v })}
                  onMouseLeave={() => setSelectedDel(null)}
                  onClick={() => setSelectedDel(prev => (prev?.delegate.id === delegate.id ? null : { delegate, vote: v }))}
                  className="cursor-pointer transition-transform duration-200"
                >
                  {/* Inner vote curul circle with hairline separation */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? seatInnerR * 1.26 : seatInnerR}
                    fill={voteFillColor}
                    stroke={isDark ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={whiteStrokeW}
                    className="transition-all duration-200"
                  />
                  {/* Outer border line matching region color on Chile map */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? seatOuterR * 1.22 : seatOuterR}
                    fill="none"
                    stroke={regionBorderColor}
                    strokeWidth={isSelected ? regionStrokeW * 1.18 : regionStrokeW}
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="py-8 text-center text-[11px] text-slate-500 dark:text-slate-400 italic">
            Sin delegados habilitados registrados para representar en el hemiciclo.
          </div>
        )}

        {/* Tooltip overlay */}
        {selectedDel && (
          <div className="absolute bottom-1.5 inset-x-3 bg-slate-900/95 backdrop-blur-xs text-white p-2 rounded-xl text-center text-[10px] pointer-events-none animate-in fade-in duration-100 shadow-lg border border-slate-700 z-20">
            <div className="font-bold text-white text-[11px]">{selectedDel.delegate.name}</div>
            <div className="text-slate-300 text-[10px] inline-flex items-center justify-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/80 inline-block shrink-0"
                style={{ backgroundColor: getChileRegionColor(selectedDel.delegate.region) }}
              />
              <span>{selectedDel.delegate.region}</span>
            </div>
            <div className="mt-0.5">
              <span
                className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px] ${
                  selectedDel.vote?.vote === 'A_FAVOR'
                    ? 'bg-[#4A154B] text-white'
                    : selectedDel.vote?.vote === 'EN_CONTRA'
                      ? 'bg-rose-600 text-white'
                      : selectedDel.vote?.vote === 'OPCION_A'
                        ? 'bg-sky-600 text-white'
                        : selectedDel.vote?.vote === 'OPCION_B'
                          ? 'bg-amber-600 text-white'
                          : selectedDel.vote?.vote === 'OPCION_C'
                            ? 'bg-emerald-600 text-white'
                            : selectedDel.vote?.vote === 'ABSTENCION'
                              ? 'bg-slate-600 text-white'
                              : 'bg-slate-700 text-slate-300'
                }`}
              >
                {formatVoteTag(selectedDel.vote?.vote)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tally Legend Bar */}
      <div className="pt-1 space-y-1.5">
        {isDissensus ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1 font-bold text-[#0284C7] dark:text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
              <span>{opcA} Op. A</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-[#D97706] dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span>{opcB} Op. B</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-[#059669] dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span>{opcC} Op. C</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>{abstencion} Abs</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{pendientes} {isLiveVoting ? 'Pend' : 'Sin voto'}</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1 font-bold text-purple-950 dark:text-purple-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A154B] dark:bg-purple-600" />
              <span>{aFavor} Fav</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>{enContra} Con</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>{abstencion} Abs</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{pendientes} {isLiveVoting ? 'Pend' : 'Sin voto'}</span>
            </span>
          </div>
        )}

        {/* Regional Curul Border Legend (syncs with Chile Map palette) */}
        {representedRegions.length > 0 && (
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Borde regional:</span>
            {representedRegions.map((reg) => (
              <span key={reg.id} className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 inline-block shrink-0"
                  style={{ borderColor: reg.color }}
                />
                <span>{reg.numeral ? `${reg.numeral} · ` : ''}{reg.id}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

