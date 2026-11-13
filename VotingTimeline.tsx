import React, { useMemo, useState } from 'react';
import { Motion, MotionVote } from '../../types/plenario';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  BarChart3, 
  FileCheck2, 
  X, 
  Search, 
  ShieldCheck, 
  Filter, 
  Check,
  History,
  Info,
  Users
} from 'lucide-react';
import { usePlenario } from '../../context/PlenarioContext';
import { HemicicloPlenarioChart } from './HemicicloPlenarioChart';

interface VotingTimelineProps {
  motionsHistory: Motion[];
  activeMotionId: string;
  onSelectMotion: (motionId: string) => void;
  onOpenBreakdown?: (motion: Motion) => void;
}

export const VotingTimeline: React.FC<VotingTimelineProps> = ({
  motionsHistory,
  activeMotionId,
  onSelectMotion,
  onOpenBreakdown
}) => {
  // Chronological sequence of the last 5 motions passed or rejected
  const completedTimelineMotions = useMemo(() => {
    // Filter for resolved motions: APPROVED or REJECTED (or CLOSED with a verdict)
    const resolved = motionsHistory.filter(m => {
      if (m.status === 'APPROVED' || m.status === 'REJECTED') return true;
      if (m.status === 'CLOSED' && m.resultSummary && !m.resultSummary.needsRunoff) return true;
      return false;
    });

    // Sort descending by completion time to take the most recent 5
    const sortedDesc = [...resolved].sort((a, b) => {
      const timeA = a.closedAt || a.startedAt || a.createdAt || 0;
      const timeB = b.closedAt || b.startedAt || b.createdAt || 0;
      return timeB - timeA;
    });

    const last5Desc = sortedDesc.slice(0, 5);
    // Reverse to display in chronological order from left (earlier) to right (most recent)
    return last5Desc.reverse();
  }, [motionsHistory]);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'recién';
    if (diffMins < 60) return `hace ${diffMins}m`;
    const diffHours = (diffMins / 60).toFixed(1);
    return `hace ${diffHours.replace('.0', '')}h`;
  };

  const getMotionResultSummary = (m: Motion) => {
    const isApproved = m.status === 'APPROVED' || m.resultSummary?.isApproved;
    const isTripartite = m.motionKind === 'DISENSO_PRIMERA_VUELTA' || m.motionKind === 'DISENSO_SEGUNDA_VUELTA';
    const votesArr = Object.values(m.votes || {});
    const totalCast = m.resultSummary?.totalCast ?? votesArr.length;

    let percentageText = '';
    let verdictLabel = isApproved ? 'Aprobada' : 'Rechazada';

    if (isTripartite) {
      const countA = votesArr.filter(v => v.vote === 'OPCION_A').length;
      const countB = votesArr.filter(v => v.vote === 'OPCION_B').length;
      const countC = votesArr.filter(v => v.vote === 'OPCION_C').length;
      const pctA = m.resultSummary?.percentageA ?? (totalCast > 0 ? (countA / totalCast) * 100 : 0);
      const pctB = m.resultSummary?.percentageB ?? (totalCast > 0 ? (countB / totalCast) * 100 : 0);
      const pctC = m.resultSummary?.percentageC ?? (totalCast > 0 ? (countC / totalCast) * 100 : 0);

      let winner = m.resultSummary?.winner;
      if (!winner && totalCast > 0) {
        if (countA >= countB && countA >= countC) winner = 'A';
        else if (countB >= countA && countB >= countC) winner = 'B';
        else winner = 'C';
      }

      if (winner === 'A') {
        percentageText = `${pctA.toFixed(1)}%`;
        verdictLabel = isApproved ? 'Op. A' : 'Sin quórum (A)';
      } else if (winner === 'B') {
        percentageText = `${pctB.toFixed(1)}%`;
        verdictLabel = isApproved ? 'Op. B' : 'Sin quórum (B)';
      } else if (winner === 'C') {
        percentageText = `${pctC.toFixed(1)}%`;
        verdictLabel = isApproved ? 'Op. C' : 'Sin quórum (C)';
      }
    } else {
      if (m.resultSummary?.percentageFavor !== undefined) {
        percentageText = `${m.resultSummary.percentageFavor.toFixed(1)}%`;
      } else if (totalCast > 0) {
        const favor = votesArr.filter(v => v.vote === 'A_FAVOR').length;
        percentageText = `${((favor / totalCast) * 100).toFixed(1)}%`;
      }
    }

    return {
      isApproved,
      percentageText,
      verdictLabel,
      totalCast
    };
  };

  if (completedTimelineMotions.length === 0) {
    return (
      <div className="w-full min-h-[96px] p-2.5 my-1.5 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5 mb-1 text-slate-700 font-black uppercase tracking-wider text-[10px]">
          <History className="w-3.5 h-3.5 text-[#4A154B]" />
          <span>Línea de Tiempo de Votaciones</span>
        </div>
        <span>No hay votaciones concluidas en el historial aún.</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 my-1.5 shadow-2xs">
      {/* Timeline Section Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/80">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-[#4A154B]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
            Línea de Tiempo · Últimas {completedTimelineMotions.length} Votaciones
          </span>
        </div>
        <span className="text-[9px] font-semibold text-slate-500 hidden sm:inline">
          Secuencia cronológica (clic para ver desglose)
        </span>
      </div>

      {/* Chronological Rail */}
      <div className="relative">
        {/* Continuous connector line behind nodes (desktop / horizontal) */}
        <div 
          className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0 hidden md:block" 
          aria-hidden="true" 
        />

        {/* 5 Sequence Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 relative z-10">
          {completedTimelineMotions.map((motion, index) => {
            const isSelected = activeMotionId === motion.id;
            const { isApproved, percentageText, verdictLabel } = getMotionResultSummary(motion);
            const relativeTime = formatRelativeTime(motion.closedAt || motion.startedAt);
            const isLatest = index === completedTimelineMotions.length - 1;

            return (
              <button
                key={motion.id}
                type="button"
                onClick={() => {
                  onSelectMotion(motion.id);
                  if (onOpenBreakdown) {
                    onOpenBreakdown(motion);
                  }
                }}
                className={`flex flex-col text-left p-2 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected 
                    ? 'bg-white border-[#4A154B] shadow-sm ring-2 ring-purple-100' 
                    : 'bg-white hover:bg-purple-50/50 border-slate-200 hover:border-purple-300'
                }`}
                title={`Votación ${motion.code}: ${isApproved ? 'Aprobada' : 'Rechazada'}. Clic para abrir desglose de sufragios`}
              >
                {/* Node Top Row: Order Index & Status Icon */}
                <div className="flex items-center justify-between gap-1 w-full mb-1">
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-md bg-slate-100 text-slate-600 font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    {isLatest && (
                      <span className="text-[8px] font-black uppercase tracking-tight text-purple-700 bg-purple-100 px-1 py-0.2 rounded shrink-0">
                        Última
                      </span>
                    )}
                  </div>

                  <div className="flex items-center shrink-0">
                    {isApproved ? (
                      <div className="flex items-center gap-0.5 text-emerald-700" title="Aprobada">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 text-rose-600" title="Rechazada">
                        <XCircle className="w-3.5 h-3.5 fill-rose-100" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Motion Code */}
                <div className="text-[11px] font-mono font-black text-slate-900 truncate w-full group-hover:text-[#4A154B]">
                  {motion.code}
                </div>

                {/* Verdict & % */}
                <div className="flex items-center justify-between gap-1 text-[10px] mt-0.5 font-bold tabular-nums">
                  <span className={`truncate ${isApproved ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}`}>
                    {verdictLabel}
                  </span>
                  {percentageText && (
                    <span className="text-slate-600 font-mono text-[9px] shrink-0">
                      {percentageText}
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                {relativeTime && (
                  <div className="text-[9px] text-slate-600 mt-1 flex items-center gap-0.5 truncate">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span>{relativeTime}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface VoteBreakdownModalProps {
  motion: Motion | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VoteBreakdownModal: React.FC<VoteBreakdownModalProps> = ({
  motion,
  isOpen,
  onClose
}) => {
  const { delegates } = usePlenario();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState<string>('ALL');

  if (!isOpen || !motion) return null;

  const isApproved = motion.status === 'APPROVED' || motion.resultSummary?.isApproved;
  const votesArray = Object.values(motion.votes || {});
  const totalCast = motion.resultSummary?.totalCast ?? votesArray.length;
  const totalEligible = motion.resultSummary?.totalEligible ?? votesArray.length;

  const isDissensusR1 = motion.motionKind === 'DISENSO_PRIMERA_VUELTA';
  const isDissensusR2 = motion.motionKind === 'DISENSO_SEGUNDA_VUELTA';
  const isTripartite = isDissensusR1 || isDissensusR2;

  // Vote counts
  const countFavor = votesArray.filter(v => v.vote === 'A_FAVOR').length;
  const countContra = votesArray.filter(v => v.vote === 'EN_CONTRA').length;
  const countAbstencion = votesArray.filter(v => v.vote === 'ABSTENCION').length;
  const countOpcionA = votesArray.filter(v => v.vote === 'OPCION_A').length;
  const countOpcionB = votesArray.filter(v => v.vote === 'OPCION_B').length;
  const countOpcionC = votesArray.filter(v => v.vote === 'OPCION_C').length;

  const percentageFavor = motion.resultSummary?.percentageFavor ?? (totalCast > 0 ? (countFavor / totalCast) * 100 : 0);
  const pctA = motion.resultSummary?.percentageA ?? (totalCast > 0 ? (countOpcionA / totalCast) * 100 : 0);
  const pctB = motion.resultSummary?.percentageB ?? (totalCast > 0 ? (countOpcionB / totalCast) * 100 : 0);
  const pctC = motion.resultSummary?.percentageC ?? (totalCast > 0 ? (countOpcionC / totalCast) * 100 : 0);
  const winnerKey = motion.resultSummary?.winner;
  const winnerPct = winnerKey === 'A' ? pctA : winnerKey === 'B' ? pctB : winnerKey === 'C' ? pctC : Math.max(pctA, pctB, pctC);
  const optALabel = motion.dissensusOptions?.a?.label || 'Opción A';
  const optBLabel = motion.dissensusOptions?.b?.label || 'Opción B';
  const optCLabel = motion.dissensusOptions?.c?.label || 'Opción C (Consenso)';
  const winnerOptLabel = winnerKey === 'A' ? optALabel : winnerKey === 'B' ? optBLabel : winnerKey === 'C' ? optCLabel : '';

  // Filtered delegate votes for nominal roll call table
  const filteredVotes = votesArray.filter(vote => {
    const matchSearch = 
      vote.delegateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vote.region.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchSearch) return false;
    if (filterOption === 'ALL') return true;
    return vote.vote === filterOption;
  });

  const getQuorumLabel = () => {
    switch (motion.quorumType) {
      case 'TWO_THIRDS':
        return 'Quórum 2/3 Calificado (66.7%)';
      case 'ABSOLUTE_MAJORITY':
        return 'Mayoría Absoluta (>50%)';
      default:
        return 'Mayoría Simple (50% + 1)';
    }
  };

  const getVoteBadge = (vote: string) => {
    switch (vote) {
      case 'A_FAVOR':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">A FAVOR</span>;
      case 'EN_CONTRA':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">EN CONTRA</span>;
      case 'ABSTENCION':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">ABSTENCIÓN</span>;
      case 'OPCION_A':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">OPCIÓN A</span>;
      case 'OPCION_B':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">OPCIÓN B</span>;
      case 'OPCION_C':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">OPCIÓN C (CONSENSO)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600">{vote}</span>;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-[#4A154B] to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-purple-200" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-wider text-purple-200">
                  {motion.code}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  isApproved 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-rose-500 text-white'
                }`}>
                  {isApproved ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>
              <h2 className="text-sm font-black text-white truncate max-w-md">
                Desglose Oficial y Escrutinio Nominal
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Cerrar desglose"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Motion Title & Context Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 leading-snug">
              {motion.title}
            </h3>
            {motion.description && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {motion.description}
              </p>
            )}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-600 font-medium">
              <span>Presentada por: <strong className="text-slate-800">{motion.proposedBy}</strong></span>
              <span>•</span>
              <span>Quórum: <strong className="text-slate-800">{getQuorumLabel()}</strong></span>
              {motion.closedAt && (
                <>
                  <span>•</span>
                  <span>Cerrada: <strong className="text-slate-800 font-mono">{new Date(motion.closedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Quorum & Outcome Verdict Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isApproved 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}>
            <div className="flex items-center gap-2.5">
              {isApproved ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="text-xs font-black uppercase tracking-wide">
                  {isApproved ? 'Moción Aprobada y Certificada' : 'Moción Rechazada en Sala'}
                </div>
                <div className="text-[11px] opacity-90">
                  {isTripartite ? (
                    isApproved
                      ? `Resultó ganadora la Opción ${winnerKey || '-'}${winnerOptLabel ? ` (${winnerOptLabel})` : ''} con ${winnerPct.toFixed(1)}% de los votos emitidos.`
                      : `No alcanzó el quórum requerido de ${getQuorumLabel()} (mayor respaldo: ${winnerPct.toFixed(1)}%).`
                  ) : (
                    isApproved 
                      ? `Alcanzó el quórum reglamentario exigido con ${percentageFavor.toFixed(1)}% de adhesión favorable.`
                      : `No alcanzó el quórum requerido de ${getQuorumLabel()} (${percentageFavor.toFixed(1)}% favorable).`
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono">
              <div className="text-lg font-black tabular-nums">
                {totalCast} / {totalEligible}
              </div>
              <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                Delegados Emitidos
              </div>
            </div>
          </div>

          {/* Graphical Tally Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#4A154B]" />
                <span>Distribución Final de Sufragios</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                Total escrutado: {totalCast} votos
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-lg flex overflow-hidden">
              {isTripartite ? (
                <>
                  <div 
                    style={{ width: `${totalCast > 0 ? (countOpcionA / totalCast) * 100 : 0}%` }}
                    className="bg-[#0284C7] h-full transition-all"
                    title={`${optALabel}: ${countOpcionA}`}
                  />
                  <div 
                    style={{ width: `${totalCast > 0 ? (countOpcionB / totalCast) * 100 : 0}%` }}
                    className="bg-[#D97706] h-full transition-all"
                    title={`${optBLabel}: ${countOpcionB}`}
                  />
                  <div 
                    style={{ width: `${totalCast > 0 ? (countOpcionC / totalCast) * 100 : 0}%` }}
                    className="bg-[#059669] h-full transition-all"
                    title={`${optCLabel}: ${countOpcionC}`}
                  />
                  <div 
                    style={{ width: `${totalCast > 0 ? (countAbstencion / totalCast) * 100 : 0}%` }}
                    className="bg-slate-400 h-full transition-all"
                    title={`Abstención: ${countAbstencion}`}
                  />
                </>
              ) : (
                <>
                  <div 
                    style={{ width: `${totalCast > 0 ? (countFavor / totalCast) * 100 : 0}%` }}
                    className="bg-[#4A154B] h-full transition-all"
                    title={`A Favor: ${countFavor}`}
                  />
                  <div 
                    style={{ width: `${totalCast > 0 ? (countContra / totalCast) * 100 : 0}%` }}
                    className="bg-rose-600 h-full transition-all"
                    title={`En Contra: ${countContra}`}
                  />
                  <div 
                    style={{ width: `${totalCast > 0 ? (countAbstencion / totalCast) * 100 : 0}%` }}
                    className="bg-slate-400 h-full transition-all"
                    title={`Abstención: ${countAbstencion}`}
                  />
                </>
              )}
            </div>

            {/* Tally Metric Badges */}
            {isTripartite ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 bg-sky-50 border border-sky-200 rounded-xl text-center min-w-0">
                  <div className="text-[10px] font-bold text-sky-900 truncate" title={optALabel}>{optALabel}</div>
                  <div className="text-base font-black text-sky-700 font-mono tabular-nums">{countOpcionA}</div>
                  <div className="text-[9px] text-sky-600 font-mono">{totalCast > 0 ? ((countOpcionA / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-0">
                  <div className="text-[10px] font-bold text-amber-900 truncate" title={optBLabel}>{optBLabel}</div>
                  <div className="text-base font-black text-amber-700 font-mono tabular-nums">{countOpcionB}</div>
                  <div className="text-[9px] text-amber-600 font-mono">{totalCast > 0 ? ((countOpcionB / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-0">
                  <div className="text-[10px] font-bold text-emerald-900 truncate" title={optCLabel}>{optCLabel}</div>
                  <div className="text-base font-black text-emerald-700 font-mono tabular-nums">{countOpcionC}</div>
                  <div className="text-[9px] text-emerald-600 font-mono">{totalCast > 0 ? ((countOpcionC / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-0">
                  <div className="text-[10px] font-bold text-slate-700">Abstenciones</div>
                  <div className="text-base font-black text-slate-700 font-mono tabular-nums">{countAbstencion}</div>
                  <div className="text-[9px] text-slate-500 font-mono">{totalCast > 0 ? ((countAbstencion / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-purple-900">A Favor</div>
                  <div className="text-base font-black text-[#4A154B] font-mono tabular-nums">{countFavor}</div>
                  <div className="text-[9px] text-purple-700 font-mono">{totalCast > 0 ? ((countFavor / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-rose-900">En Contra</div>
                  <div className="text-base font-black text-rose-700 font-mono tabular-nums">{countContra}</div>
                  <div className="text-[9px] text-rose-600 font-mono">{totalCast > 0 ? ((countContra / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-700">Abstenciones</div>
                  <div className="text-base font-black text-slate-700 font-mono tabular-nums">{countAbstencion}</div>
                  <div className="text-[9px] text-slate-500 font-mono">{totalCast > 0 ? ((countAbstencion / totalCast) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Hemiciclo Parlamentario de la Votación (antes del Registro de Fe Pública) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#4A154B]" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Plenario de la Votación · Hemiciclo Parlamentario
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Pase el cursor o toque una curul para ver el voto
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
              <HemicicloPlenarioChart motion={motion} delegates={delegates} />
            </div>
          </div>

          {/* Nominal Roll Call Table (Voto Nominal de Delegados) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#4A154B]" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Registro de Fe Pública · Escrutinio Nominal
                </h4>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar delegado o región..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-6 pr-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4A154B] w-36 sm:w-44"
                  />
                </div>

                <select
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value)}
                  className="py-1 px-1.5 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todos los votos</option>
                  {!isTripartite && (
                    <>
                      <option value="A_FAVOR">A Favor</option>
                      <option value="EN_CONTRA">En Contra</option>
                      <option value="ABSTENCION">Abstención</option>
                    </>
                  )}
                  {isTripartite && (
                    <>
                      <option value="OPCION_A">{optALabel}</option>
                      <option value="OPCION_B">{optBLabel}</option>
                      <option value="OPCION_C">{optCLabel}</option>
                      <option value="ABSTENCION">Abstención</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Delegates Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider z-10">
                    <tr>
                      <th className="py-2 px-3">Delegada / Delegado</th>
                      <th className="py-2 px-2">Región</th>
                      <th className="py-2 px-2 text-center">Sufragio</th>
                      <th className="py-2 px-3 text-right">Firma Digital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {filteredVotes.length > 0 ? (
                      filteredVotes.map((v) => (
                        <tr key={v.delegateId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {v.delegateName}
                          </td>
                          <td className="py-2 px-2 text-slate-600 font-medium text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {v.region}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {getVoteBadge(v.vote)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[9px] text-slate-600">
                            <span title={`Sello de Integridad: ${v.digitalSignatureHash}`}>
                              {v.digitalSignatureHash ? v.digitalSignatureHash.slice(0, 10) + '...' : 'fe4a...sig'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-600 text-xs">
                          No se encontraron sufragios con el criterio de búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Certificado según Reglamento de Sala y Fe Pública FE-FA</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            Cerrar Desglose
          </button>
        </div>

      </div>
    </div>
  );
};
