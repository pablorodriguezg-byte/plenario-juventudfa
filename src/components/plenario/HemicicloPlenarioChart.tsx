import React, { useMemo, useState } from 'react';
import { ChileanRegion, Delegate, Motion, MotionVote } from '../../types/plenario';
import { CHILE_REGIONS_GEO, getChileRegionColor } from '../../data/chileRegionsGeo';

interface HemicicloPlenarioChartProps {
  motion: Motion | null;
  delegates: Delegate[];
  maxHeightClass?: string;
}

export const HemicicloPlenarioChart: React.FC<HemicicloPlenarioChartProps> = ({
  motion,
  delegates,
  maxHeightClass = 'max-h-[165px]'
}) => {
  const [selectedDel, setSelectedDel] = useState<{ delegate: Delegate; vote?: MotionVote } | null>(null);

  const isLiveVoting = motion?.status === 'VOTING';
  const isDissensus =
    motion?.motionKind === 'DISENSO_PRIMERA_VUELTA' ||
    motion?.motionKind === 'DISENSO_SEGUNDA_VUELTA';

  const votes = motion?.votes || {};

  // Combine accredited voting delegates with any historical voters not currently in padrón
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

    return [...base, ...extraHistorical];
  }, [delegates, votes]);

  // Regions currently represented in the hemiciclo (ordered north-to-south matching map)
  const representedRegions = useMemo(() => {
    const counts = new Map<ChileanRegion, number>();
    votingDelegates.forEach((d) => {
      counts.set(d.region, (counts.get(d.region) || 0) + 1);
    });

    const ordered = CHILE_REGIONS_GEO.filter((r) => counts.has(r.id)).map((r) => ({
      id: r.id,
      numeral: r.numeral,
      color: r.accent,
      count: counts.get(r.id) || 0
    }));

    // Include any region outside the 8 active map entries if present in padrón
    counts.forEach((count, regionId) => {
      if (!CHILE_REGIONS_GEO.some((r) => r.id === regionId)) {
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

  // Arc layout calculation (supports > 24 seats if needed)
  const hemicircleNodes = useMemo(() => {
    const total = votingDelegates.length;
    const arcs = [
      { radius: 64, count: 6 },
      { radius: 92, count: 8 },
      { radius: 120, count: Math.max(10, total - 14) }
    ];

    const nodes: Array<{
      delegate: Delegate;
      x: number;
      y: number;
    }> = [];

    let currentIdx = 0;
    arcs.forEach((arc) => {
      const seatsInArc = Math.min(arc.count, total - currentIdx);
      for (let i = 0; i < seatsInArc && currentIdx < total; i++) {
        const angleSpan = 152;
        const step = seatsInArc > 1 ? angleSpan / (seatsInArc - 1) : 0;
        const angleDeg = seatsInArc === 1 ? 270 : 194 + i * step;
        const angleRad = (angleDeg * Math.PI) / 180;

        const cx = 150;
        const cy = 138;
        const x = cx + arc.radius * Math.cos(angleRad);
        const y = cy + arc.radius * Math.sin(angleRad);

        nodes.push({
          delegate: votingDelegates[currentIdx],
          x,
          y
        });
        currentIdx++;
      }
    });

    return nodes;
  }, [votingDelegates]);

  const getNodeColor = (delId: string) => {
    const v = votes[delId];
    if (!v) return '#CBD5E1';
    if (v.vote === 'A_FAVOR') return '#4A154B';
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
      <div className="relative flex items-center justify-center min-h-[130px] py-1 bg-white rounded-xl border border-slate-200/80">
        {votingDelegates.length > 0 ? (
          <svg
            viewBox="0 0 300 158"
            className={`w-full h-full ${maxHeightClass} drop-shadow-2xs`}
          >
            {/* Guide Arcs */}
            <path d="M 86,138 A 64,64 0 0,1 214,138" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M 58,138 A 92,92 0 0,1 242,138" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M 30,138 A 120,120 0 0,1 270,138" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />

            {/* Central Podium */}
            <rect x="135" y="128" width="30" height="12" rx="4" fill="#4A154B" />
            <text x="150" y="136" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">MESA</text>

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
                  {/* Inner vote curul circle with hairline white separation */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 7.2 : 5.6}
                    fill={voteFillColor}
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    className="transition-all duration-200"
                  />
                  {/* Outer border line matching region color on Chile map */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 9.1 : 7.4}
                    fill="none"
                    stroke={regionBorderColor}
                    strokeWidth={isSelected ? 2.5 : 2.1}
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="py-8 text-center text-[11px] text-slate-500 italic">
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-medium text-slate-700">
            <span className="flex items-center gap-1 font-bold text-[#0284C7]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
              <span>{opcA} Op. A</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-[#D97706]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span>{opcB} Op. B</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-[#059669]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span>{opcC} Op. C</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>{abstencion} Abs</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>{pendientes} {isLiveVoting ? 'Pend' : 'Sin voto'}</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-medium text-slate-700">
            <span className="flex items-center gap-1 font-bold text-purple-950">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A154B]" />
              <span>{aFavor} Fav</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>{enContra} Con</span>
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>{abstencion} Abs</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>{pendientes} {isLiveVoting ? 'Pend' : 'Sin voto'}</span>
            </span>
          </div>
        )}

        {/* Regional Curul Border Legend (syncs with Chile Map palette) */}
        {representedRegions.length > 0 && (
          <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-600">
            <span className="font-bold text-slate-500 uppercase tracking-tight">Borde regional:</span>
            {representedRegions.map((reg) => (
              <span key={reg.id} className="inline-flex items-center gap-1 font-medium text-slate-700">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-white border-2 inline-block shrink-0"
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

