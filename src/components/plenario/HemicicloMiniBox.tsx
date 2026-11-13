import React, { useMemo, useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { Delegate, MotionVote, Motion } from '../../types/plenario';
import { Radio, CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react';

export const HemicicloMiniBox: React.FC = () => {
  const { delegates, activeMotion, motionsHistory } = usePlenario();
  const [hoveredDel, setHoveredDel] = useState<{ delegate: Delegate; vote?: MotionVote } | null>(null);

  // Determine which motion is being reflected in real time
  const motionReflected: Motion | null = useMemo(() => {
    // 1. If there is a motion actively in voting in room:
    const votingMotion = motionsHistory.find(m => m.status === 'VOTING');
    if (votingMotion) {
      return votingMotion;
    }
    if (activeMotion && activeMotion.status === 'VOTING') {
      return activeMotion;
    }

    // 2. When there are NO votings in course, show the LAST VOTING THAT WAS CLOSED
    const closedMotions = motionsHistory.filter(m => 
      m.status === 'APPROVED' || m.status === 'REJECTED' || m.status === 'CLOSED' || m.status === 'PASSED_TO_RUNOFF'
    );
    if (closedMotions.length > 0) {
      const sorted = [...closedMotions].sort((a, b) => {
        const timeA = a.closedAt || a.startedAt || a.createdAt;
        const timeB = b.closedAt || b.startedAt || b.createdAt;
        return timeB - timeA;
      });
      return sorted[0];
    }

    return activeMotion || motionsHistory[0] || null;
  }, [activeMotion, motionsHistory]);

  const isLiveVoting = motionReflected?.status === 'VOTING';
  const isDissensus = motionReflected?.motionKind === 'DISENSO_PRIMERA_VUELTA' || motionReflected?.motionKind === 'DISENSO_SEGUNDA_VUELTA';

  const votingDelegates = useMemo(() => {
    return delegates.filter(d => d.role === 'DELEGATE');
  }, [delegates]);

  const votes = motionReflected?.votes || {};

  // Arc layout calculation for voting seats in 3 concentric arcs (6, 8, 10)
  const hemicircleNodes = useMemo(() => {
    const total = votingDelegates.length;
    const arcs = [
      { radius: 68, count: 6 },
      { radius: 98, count: 8 },
      { radius: 128, count: 10 }
    ];

    const nodes: Array<{
      delegate: Delegate;
      x: number;
      y: number;
    }> = [];

    let currentIdx = 0;
    arcs.forEach((arc) => {
      const count = arc.count;
      for (let i = 0; i < count && currentIdx < total; i++) {
        const angleSpan = 150;
        const step = count > 1 ? angleSpan / (count - 1) : 0;
        const angleDeg = 195 + i * step;
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
    if (!v) return '#CBD5E1'; // Pending (Light slate)
    if (v.vote === 'A_FAVOR') return '#4A154B'; // Morado Cardenal
    if (v.vote === 'EN_CONTRA') return '#DC2626'; // Rojo
    if (v.vote === 'ABSTENCION') return '#64748B'; // Gris Abstención
    if (v.vote === 'OPCION_A') return '#0284C7'; // Sky Blue
    if (v.vote === 'OPCION_B') return '#D97706'; // Amber
    if (v.vote === 'OPCION_C') return '#059669'; // Emerald
    return '#64748B';
  };

  const votesList = Object.values(votes);
  const totalCast = votesList.length;
  const pendientes = Math.max(0, votingDelegates.length - totalCast);

  // Binary counts
  const aFavor = votesList.filter(v => v.vote === 'A_FAVOR').length;
  const enContra = votesList.filter(v => v.vote === 'EN_CONTRA').length;
  const abstencion = votesList.filter(v => v.vote === 'ABSTENCION').length;

  // Dissensus counts
  const opcA = votesList.filter(v => v.vote === 'OPCION_A').length;
  const opcB = votesList.filter(v => v.vote === 'OPCION_B').length;
  const opcC = votesList.filter(v => v.vote === 'OPCION_C').length;

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white border border-slate-200 rounded-2xl shadow-xs p-3 overflow-hidden">
      
      {/* Header: Indicates clearly which motion is reflected in real time */}
      <div className="flex flex-col gap-1 pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#4A154B] shrink-0" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">
              HEMICICLO PARLAMENTARIO
            </h3>
          </div>

          <div className="shrink-0">
            {isLiveVoting ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                <span>En Votación en Vivo</span>
              </span>
            ) : motionReflected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
                <Clock className="w-3 h-3 text-[#4A154B]" />
                <span>Última Votación Cerrada</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <span>En Espera</span>
              </span>
            )}
          </div>
        </div>

        {/* Reflected Motion Title & Code */}
        <div className="flex items-center justify-between gap-2 text-[11px] leading-tight">
          <div className="text-slate-800 font-bold truncate">
            {motionReflected ? (
              <>
                <span className="text-purple-950 font-mono font-extrabold mr-1">[{motionReflected.code}]</span>
                <span>{motionReflected.title}</span>
              </>
            ) : (
              <span className="text-slate-500 italic">Sin votaciones registradas en sala</span>
            )}
          </div>
          {motionReflected && (
            <span className={`text-[10px] font-bold shrink-0 ${
              motionReflected.status === 'APPROVED' ? 'text-emerald-700' :
              motionReflected.status === 'REJECTED' ? 'text-rose-700' : 
              motionReflected.status === 'PASSED_TO_RUNOFF' ? 'text-amber-700' : 'text-purple-900'
            }`}>
              {motionReflected.status === 'APPROVED' ? '✓ Aprobada' : 
               motionReflected.status === 'REJECTED' ? '✗ Rechazada' : 
               motionReflected.status === 'PASSED_TO_RUNOFF' ? 'Balotaje Requerido' :
               '● Abierta'}
            </span>
          )}
        </div>
      </div>

      {/* Semicircular Seats Visualization with Real-Time Updates */}
      <div className="relative flex-1 flex items-center justify-center min-h-[110px] py-1">
        <svg 
          viewBox="0 0 300 160" 
          className="w-full h-full max-h-[145px] drop-shadow-2xs"
        >
          {/* Guide Arcs */}
          <path d="M 82,138 A 68,68 0 0,1 218,138" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M 52,138 A 98,98 0 0,1 248,138" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M 22,138 A 128,128 0 0,1 278,138" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3 3" />

          {/* Central Podium / Mesa Directiva Indicator */}
          <rect x="135" y="128" width="30" height="12" rx="4" fill="#4A154B" />
          <text x="150" y="136" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">MESA</text>

          {/* Delegate Seat Nodes with Dynamic Colors */}
          {hemicircleNodes.map(({ delegate, x, y }) => {
            const v = votes[delegate.id];
            const color = getNodeColor(delegate.id);
            const isHovered = hoveredDel?.delegate.id === delegate.id;

            return (
              <g 
                key={delegate.id}
                onMouseEnter={() => setHoveredDel({ delegate, vote: v })}
                onMouseLeave={() => setHoveredDel(null)}
                className="cursor-pointer transition-transform duration-200"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 6.5}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover delegate tooltip overlay */}
        {hoveredDel && (
          <div className="absolute bottom-1 inset-x-2 bg-slate-900/95 backdrop-blur-xs text-white p-2 rounded-xl text-center text-[10px] pointer-events-none animate-in fade-in duration-100 shadow-lg border border-slate-700 z-20">
            <div className="font-bold text-white text-[11px]">{hoveredDel.delegate.name}</div>
            <div className="text-slate-300 text-[10px]">{hoveredDel.delegate.region}</div>
            <div className="mt-0.5">
              <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px] ${
                hoveredDel.vote?.vote === 'A_FAVOR' ? 'bg-[#4A154B] text-white' :
                hoveredDel.vote?.vote === 'EN_CONTRA' ? 'bg-rose-600 text-white' :
                hoveredDel.vote?.vote === 'OPCION_A' ? 'bg-sky-600 text-white' :
                hoveredDel.vote?.vote === 'OPCION_B' ? 'bg-amber-600 text-white' :
                hoveredDel.vote?.vote === 'OPCION_C' ? 'bg-emerald-600 text-white' :
                hoveredDel.vote?.vote === 'ABSTENCION' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {hoveredDel.vote ? hoveredDel.vote.vote.replace('_', ' ') : (isLiveVoting ? 'VOTO PENDIENTE' : 'NO EMITIÓ VOTO')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mini Live Tally Legend Bar */}
      <div className="pt-1.5 border-t border-slate-100 shrink-0">
        {isDissensus ? (
          <div className="flex items-center justify-between text-[10px] font-mono font-medium text-slate-700">
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
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>{pendientes} {isLiveVoting ? 'Pend' : 'Sin voto'}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] font-mono font-medium text-slate-700">
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
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span>{pendientes} {isLiveVoting ? 'Pend' : 'Sin voto'}</span>
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
