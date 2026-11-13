import React, { useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  Vote, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Lock, 
  RotateCcw, 
  Plus, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  X,
  AlertCircle,
  FileText,
  RotateCw,
  Scale,
  Clock,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { VoteOption, Motion } from '../../types/plenario';
import { VotingTimeline, VoteBreakdownModal } from './VotingTimeline';
import { useVotoConfirmation } from '../../hooks/useVotoConfirmation';
import { VotoConfirmationModal } from './VotoConfirmationModal';

export const VotacionBox: React.FC = () => {
  const { 
    currentUser, 
    activeMotion, 
    activeMotionId,
    setActiveMotionId,
    motionsHistory,
    castVote, 
    closeVotingForMotion, 
    openVotingForMotion,
    passDissensusToRound2,
    createNewMotion,
    isSecretariaTecnica,
    canVote,
    isAnyVotingOpen,
    activeOpenVotingMotion,
    setShowLoginModal,
    setActiveTab
  } = usePlenario();

  const [elapsedVotingTime, setElapsedVotingTime] = useState<string>('00:00');
  const [breakdownMotion, setBreakdownMotion] = useState<Motion | null>(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState<boolean>(false);

  const {
    isOpen: isConfirmOpen,
    pendingVote,
    isSubmitting: isConfirmingVote,
    requestConfirmation,
    confirmVote,
    cancelConfirmation
  } = useVotoConfirmation({
    onConfirmVote: (option) => {
      castVote(option);
    }
  });

  const selectableMotions = React.useMemo(() => {
    return motionsHistory.filter(m => m.status !== 'DRAFT');
  }, [motionsHistory]);

  // Auto-close confirmation modal if the motion stops being open for voting
  React.useEffect(() => {
    if (
      isConfirmOpen &&
      pendingVote &&
      (!activeMotion || activeMotion.id !== pendingVote.motion.id || activeMotion.status !== 'VOTING')
    ) {
      cancelConfirmation();
    }
  }, [isConfirmOpen, pendingVote, activeMotion, cancelConfirmation]);

  React.useEffect(() => {
    if (!activeMotion || activeMotion.status !== 'VOTING') {
      setElapsedVotingTime('00:00');
      return;
    }
    const started = activeMotion.startedAt || activeMotion.createdAt || Date.now();
    const update = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setElapsedVotingTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeMotion?.status, activeMotion?.startedAt, activeMotion?.createdAt, activeMotion?.id]);

  if (!activeMotion) {
    return (
      <div className="flex flex-col h-full w-full min-w-0 bg-white border border-slate-200 rounded-2xl shadow-xs p-5 overflow-hidden justify-center items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#4A154B] flex items-center justify-center mb-3">
          <Vote className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">
          Sin votaciones abiertas
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mb-4">
          No hay votaciones registradas en el Plenario en este momento. La Secretaría Técnica puede abrir o tramitar mociones.
        </p>
        {isSecretariaTecnica && (
          <button
            onClick={() => setActiveTab('mesa-votaciones')}
            className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Mesa de Votaciones</span>
          </button>
        )}
      </div>
    );
  }

  const hasVoted = currentUser && !!activeMotion.votes[currentUser.id];
  const userVote = currentUser ? activeMotion.votes[currentUser.id] : null;

  // Tally counts
  const votesArray = Object.values(activeMotion.votes || {});
  const totalCast = votesArray.length;

  const countFavor = votesArray.filter(v => v.vote === 'A_FAVOR').length;
  const countContra = votesArray.filter(v => v.vote === 'EN_CONTRA').length;
  const countAbstencion = votesArray.filter(v => v.vote === 'ABSTENCION').length;
  const countOpcionA = votesArray.filter(v => v.vote === 'OPCION_A').length;
  const countOpcionB = votesArray.filter(v => v.vote === 'OPCION_B').length;
  const countOpcionC = votesArray.filter(v => v.vote === 'OPCION_C').length;

  const isDissensusR1 = activeMotion.motionKind === 'DISENSO_PRIMERA_VUELTA';
  const isDissensusR2 = activeMotion.motionKind === 'DISENSO_SEGUNDA_VUELTA';

  // Quorum badge label
  const getQuorumBadge = () => {
    switch (activeMotion.motionKind) {
      case 'MOCION_EXTENSIVA':
        return { text: 'Moción Extensiva · Quórum 50% + 1', color: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'MOCION_SUPRESIVA':
        return { text: 'Moción Supresiva · Quórum 2/3', color: 'bg-rose-100 text-rose-900 border-rose-200' };
      case 'DISENSO_PRIMERA_VUELTA':
        return { text: 'Disenso 1ª Vuelta · Mayoría Absoluta (>50%)', color: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'DISENSO_SEGUNDA_VUELTA':
        return { text: 'Disenso 2ª Vuelta (Balotaje) · Quórum 50% + 1', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      case 'GENERAL_PRESINTESIS':
        return { text: 'Votación General Presíntesis · 50% + 1', color: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'GENERAL_SINTESIS_FINAL':
        return { text: 'Votación General Síntesis Final · 50% + 1', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'MOCION_ORDINARIA':
        return {
          text: activeMotion.quorumType === 'TWO_THIRDS' ? 'Moción General · Quórum 2/3' : 'Moción General · Quórum 50% + 1',
          color: 'bg-slate-100 text-slate-900 border-slate-300'
        };
      default:
        return { text: 'Quórum 50% + 1', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const quorumInfo = getQuorumBadge();


  return (
    <div className="flex flex-col h-full min-h-[430px] md:min-h-0 w-full min-w-0 bg-white border border-slate-200 rounded-2xl shadow-xs p-3.5 overflow-hidden">
      
      {/* Header corresponding to Sketch [H] [VOTACIÓN] */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-lg bg-[#4A154B] text-white text-[11px] font-black flex items-center justify-center shadow-xs shrink-0 select-none"
            title="Cabina de votación plenaria"
          >
            H
          </div>
          
          <div className="flex items-center gap-1.5 truncate">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">
              VOTACIÓN
            </h3>
            <span className="text-[11px] text-purple-950 font-mono font-bold shrink-0">
              ({activeMotion.code})
            </span>
          </div>
        </div>

        {/* Motion Switcher & Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={activeMotion.id}
            onChange={(e) => setActiveMotionId(e.target.value)}
            className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer max-w-[130px] truncate"
            title="Seleccionar votación para visualizar o votar"
          >
            {selectableMotions.map(m => (
              <option key={m.id} value={m.id}>
                {m.code}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
              activeMotion.status === 'VOTING' 
                ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                : activeMotion.status === 'APPROVED' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : activeMotion.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : activeMotion.status === 'PASSED_TO_RUNOFF'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
            }`}>
              {activeMotion.status === 'VOTING'
                ? '● En Votación'
                : activeMotion.status === 'APPROVED'
                  ? '✓ Aprobada'
                  : activeMotion.status === 'REJECTED'
                    ? '✕ Rechazada'
                    : activeMotion.status === 'PASSED_TO_RUNOFF'
                      ? 'Balotaje'
                      : 'Cerrada'}
            </span>

            {activeMotion.status === 'VOTING' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-1 shrink-0 animate-pulse" title="Tiempo que lleva abierta esta votación en sala">
                <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                <span>{elapsedVotingTime} min</span>
              </span>
            )}
          </div>

          {isSecretariaTecnica && (
            <button
              onClick={() => setActiveTab('mesa-votaciones')}
              className="px-2 py-1 rounded-lg border shadow-2xs transition-all bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200 cursor-pointer flex items-center gap-1"
              title="Ir a Mesa de Votaciones para tramitar mociones y lanzar votaciones"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">Mesa / Lanzar</span>
            </button>
          )}
        </div>
      </div>

      {/* Quórum & Active indicator (clean and non-redundant) */}
      <div className="mb-2 shrink-0 flex items-center justify-between gap-1.5 text-[10px] font-bold">
        <span className={`px-2 py-0.5 rounded-md border ${quorumInfo.color}`}>
          {quorumInfo.text}
        </span>
        {activeMotion.targetParagraphNumber && (
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
            § {activeMotion.targetParagraphNumber}
          </span>
        )}
      </div>

      {/* Return to ongoing in-room vote banner if user is viewing a historical motion */}
      {activeOpenVotingMotion && activeOpenVotingMotion.id !== activeMotion.id && (
        <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-2 text-xs shrink-0 shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            <span className="text-[11px] text-purple-950 font-bold truncate">
              Votación abierta en sala: <strong>{activeOpenVotingMotion.code}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveMotionId(activeOpenVotingMotion.id)}
            className="px-2.5 py-1 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1"
            title="Volver a la votación en curso en sala"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Volver a Sala</span>
          </button>
        </div>
      )}

      {/* TIMELINE: Chronological sequence of the last 5 motions passed or rejected */}
      <div className="shrink-0">
        <VotingTimeline 
          motionsHistory={motionsHistory}
          activeMotionId={activeMotionId}
          onSelectMotion={(id) => setActiveMotionId(id)}
          onOpenBreakdown={(motion) => {
            setBreakdownMotion(motion);
            setShowBreakdownModal(true);
          }}
        />
      </div>

      {/* VOTING BOOTH / SELECTION BUTTONS */}
      <div className="flex-1 flex flex-col justify-start my-1 overflow-y-auto pr-0.5 space-y-2">
        {/* Materia exacta en votación (siempre visible en cabina para evitar confusión entre disensos y mociones) */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-left space-y-0.5 shrink-0">
          <div className="text-[9.5px] font-black uppercase tracking-wider text-purple-900">
            Materia en Cabina · {activeMotion.code}
          </div>
          <div className="text-xs font-black text-slate-900 leading-snug">
            {activeMotion.title}
          </div>
          {activeMotion.description && (
            <p className="text-[10.5px] text-slate-600 leading-snug line-clamp-2">
              {activeMotion.description}
            </p>
          )}
        </div>

        {activeMotion.status === 'VOTING' ? (
          canVote ? (
            /* Voting booth for accredited regional delegates */
            <div className="space-y-1.5">
              {hasVoted && userVote && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <div className="leading-snug">
                    <strong>Voto emitido y confirmado:</strong> su sufragio quedó registrado de forma definitiva y no puede modificarse.
                  </div>
                </div>
              )}
              
              {/* CASE 1: DISENSO PRIMERA VUELTA (A, B, C, Abstención) */}
              {isDissensusR1 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {hasVoted ? 'Sufragio registrado en este disenso:' : 'Emita su voto por una opción de disenso:'}
                  </div>

                  {/* Option A */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'OPCION_A', userVote?.vote)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 border ${
                      userVote?.vote === 'OPCION_A'
                        ? 'bg-[#0284C7] text-white border-sky-800 shadow-xs ring-2 ring-sky-200 cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-white hover:bg-sky-50/60 text-slate-800 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        userVote?.vote === 'OPCION_A' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'OPCION_A' && <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />}
                      </span>
                      <span className="text-xs font-black truncate">
                        Opción A: {activeMotion.dissensusOptions?.a?.label || activeMotion.dissensusOptions?.a?.title || 'Visión Uno'}
                      </span>
                    </div>
                    {userVote?.vote === 'OPCION_A' && (
                      <span className="text-[9px] bg-sky-900 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                        Confirmado ✓
                      </span>
                    )}
                  </button>

                  {/* Option B */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'OPCION_B', userVote?.vote)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 border ${
                      userVote?.vote === 'OPCION_B'
                        ? 'bg-[#D97706] text-white border-amber-800 shadow-xs ring-2 ring-amber-200 cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-white hover:bg-amber-50/60 text-slate-800 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        userVote?.vote === 'OPCION_B' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'OPCION_B' && <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />}
                      </span>
                      <span className="text-xs font-black truncate">
                        Opción B: {activeMotion.dissensusOptions?.b?.label || activeMotion.dissensusOptions?.b?.title || 'Visión Dos'}
                      </span>
                    </div>
                    {userVote?.vote === 'OPCION_B' && (
                      <span className="text-[9px] bg-amber-900 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                        Confirmado ✓
                      </span>
                    )}
                  </button>

                  {/* Option C (Consenso) */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'OPCION_C', userVote?.vote)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 border ${
                      userVote?.vote === 'OPCION_C'
                        ? 'bg-[#059669] text-white border-emerald-800 shadow-xs ring-2 ring-emerald-200 cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-white hover:bg-emerald-50/60 text-slate-800 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-left min-w-0">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        userVote?.vote === 'OPCION_C' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'OPCION_C' && <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
                      </span>
                      <span className="text-xs font-black truncate">
                        Opción C: {activeMotion.dissensusOptions?.c?.label || activeMotion.dissensusOptions?.c?.title || 'Visión de Consenso'}
                      </span>
                    </div>
                    {userVote?.vote === 'OPCION_C' && (
                      <span className="text-[9px] bg-emerald-900 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                        Confirmado ✓
                      </span>
                    )}
                  </button>

                  {/* Abstención */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'ABSTENCION', userVote?.vote)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                      userVote?.vote === 'ABSTENCION'
                        ? 'bg-slate-700 text-white border-slate-900 shadow-xs cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        userVote?.vote === 'ABSTENCION' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'ABSTENCION' && <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                      </span>
                      <span className="text-[11px] font-bold">ABSTENERSE</span>
                    </div>
                    {userVote?.vote === 'ABSTENCION' && (
                      <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-mono">
                        Confirmado ✓
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* CASE 2: DISENSO SEGUNDA VUELTA (Balotaje entre las 2 primeras opciones) */}
              {isDissensusR2 && activeMotion.runoffOptions && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                    Balotaje de 2ª Vuelta (Quórum 50% + 1):
                  </div>

                  {/* Runoff Option 1 */}
                  {(() => {
                    const optKey = activeMotion.runoffOptions[0];
                    const voteKey: VoteOption = optKey === 'A' ? 'OPCION_A' : optKey === 'B' ? 'OPCION_B' : 'OPCION_C';
                    const optObj = optKey === 'A' ? activeMotion.dissensusOptions?.a : optKey === 'B' ? activeMotion.dissensusOptions?.b : activeMotion.dissensusOptions?.c;

                    return (
                      <button
                        type="button"
                        disabled={Boolean(hasVoted)}
                        onClick={() => requestConfirmation(activeMotion, voteKey, userVote?.vote)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                          userVote?.vote === voteKey
                            ? 'bg-[#4A154B] text-white border-purple-950 shadow-xs ring-2 ring-purple-200 cursor-default'
                            : hasVoted
                              ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                              : 'bg-white hover:bg-purple-50 text-slate-800 border-slate-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            userVote?.vote === voteKey ? 'border-white bg-white' : 'border-slate-400'
                          }`}>
                            {userVote?.vote === voteKey && <span className="w-1.5 h-1.5 rounded-full bg-[#4A154B]" />}
                          </span>
                          <span className="text-xs font-black truncate">Opción {optKey}: {optObj ? (optObj.label || optObj.title || 'Propuesta') : ''}</span>
                        </div>
                        {userVote?.vote === voteKey && (
                          <span className="text-[9px] bg-purple-900 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                            Confirmado ✓
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Runoff Option 2 */}
                  {(() => {
                    const optKey = activeMotion.runoffOptions[1];
                    const voteKey: VoteOption = optKey === 'A' ? 'OPCION_A' : optKey === 'B' ? 'OPCION_B' : 'OPCION_C';
                    const optObj = optKey === 'A' ? activeMotion.dissensusOptions?.a : optKey === 'B' ? activeMotion.dissensusOptions?.b : activeMotion.dissensusOptions?.c;

                    return (
                      <button
                        type="button"
                        disabled={Boolean(hasVoted)}
                        onClick={() => requestConfirmation(activeMotion, voteKey, userVote?.vote)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                          userVote?.vote === voteKey
                            ? 'bg-[#4A154B] text-white border-purple-950 shadow-xs ring-2 ring-purple-200 cursor-default'
                            : hasVoted
                              ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                              : 'bg-white hover:bg-purple-50 text-slate-800 border-slate-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-left min-w-0">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            userVote?.vote === voteKey ? 'border-white bg-white' : 'border-slate-400'
                          }`}>
                            {userVote?.vote === voteKey && <span className="w-1.5 h-1.5 rounded-full bg-[#4A154B]" />}
                          </span>
                          <span className="text-xs font-black truncate">Opción {optKey}: {optObj ? (optObj.label || optObj.title || 'Propuesta') : ''}</span>
                        </div>
                        {userVote?.vote === voteKey && (
                          <span className="text-[9px] bg-purple-900 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                            Confirmado ✓
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Abstención */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'ABSTENCION', userVote?.vote)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                      userVote?.vote === 'ABSTENCION'
                        ? 'bg-slate-700 text-white border-slate-900 shadow-xs cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                        userVote?.vote === 'ABSTENCION' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'ABSTENCION' && <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                      </span>
                      <span className="text-[11px] font-bold">ABSTENERSE</span>
                    </div>
                    {userVote?.vote === 'ABSTENCION' && (
                      <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-mono">
                        Confirmado ✓
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* CASE 3: BINARY VOTES (Extensiva, Supresiva, General Presíntesis, General Síntesis Final) */}
              {!isDissensusR1 && !isDissensusR2 && (
                <div className="space-y-1.5">
                  {/* Option A FAVOR */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'A_FAVOR', userVote?.vote)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                      userVote?.vote === 'A_FAVOR'
                        ? 'bg-[#4A154B] text-white border-purple-950 shadow-xs ring-2 ring-purple-200 cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-purple-50/60 text-slate-800 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        userVote?.vote === 'A_FAVOR' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'A_FAVOR' && <span className="w-1.5 h-1.5 rounded-full bg-[#4A154B]" />}
                      </span>
                      <span className="text-[11px] tracking-wide">A FAVOR</span>
                    </div>
                    {userVote?.vote === 'A_FAVOR' && (
                      <span className="text-[9px] bg-purple-900 text-white px-1.5 py-0.2 rounded font-mono">
                        Confirmado ✓
                      </span>
                    )}
                  </button>

                  {/* Option EN CONTRA */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'EN_CONTRA', userVote?.vote)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                      userVote?.vote === 'EN_CONTRA'
                        ? 'bg-rose-600 text-white border-rose-800 shadow-xs ring-2 ring-rose-200 cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-rose-50/60 text-slate-800 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        userVote?.vote === 'EN_CONTRA' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'EN_CONTRA' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                      </span>
                      <span className="text-[11px] tracking-wide">EN CONTRA</span>
                    </div>
                    {userVote?.vote === 'EN_CONTRA' && (
                      <span className="text-[9px] bg-rose-800 text-white px-1.5 py-0.2 rounded font-mono">
                        Confirmado ✓
                      </span>
                    )}
                  </button>

                  {/* Option ABSTENERSE */}
                  <button
                    type="button"
                    disabled={Boolean(hasVoted)}
                    onClick={() => requestConfirmation(activeMotion, 'ABSTENCION', userVote?.vote)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                      userVote?.vote === 'ABSTENCION'
                        ? 'bg-slate-700 text-white border-slate-900 shadow-xs ring-2 ring-slate-200 cursor-default'
                        : hasVoted
                          ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-65 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        userVote?.vote === 'ABSTENCION' ? 'border-white bg-white' : 'border-slate-400'
                      }`}>
                        {userVote?.vote === 'ABSTENCION' && <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                      </span>
                      <span className="text-[11px] tracking-wide">ABSTENERSE</span>
                    </div>
                    {userVote?.vote === 'ABSTENCION' && (
                      <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-mono">
                        Confirmado ✓
                      </span>
                    )}
                  </button>
                </div>
              )}

            </div>
          ) : isSecretariaTecnica ? (
            /* Banner para Secretaría Técnica */
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-left space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>Secretaría Técnica: Mesa y Fe Pública</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-snug">
                Encargada de certificar quórums reglamentarios, redactar actas oficiales y articular disensos. No emite sufragio.
              </p>
            </div>
          ) : (
            <div className="p-3 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-600">Acreditación requerida para emitir sufragio vinculante</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3 py-1 bg-[#4A154B] text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Acreditarse Ahora
              </button>
            </div>
          )
        ) : (
          /* When voting is closed */
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1.5">
            <div className="text-xs font-extrabold text-slate-800">
              {activeMotion.status === 'APPROVED' ? (
                <span className="text-emerald-700 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {(isDissensusR1 || isDissensusR2) && activeMotion.resultSummary?.winner
                      ? `Disenso Resuelto · Aprobada Opción ${activeMotion.resultSummary.winner}`
                      : 'Moción Aprobada y Promulgada'}
                  </span>
                </span>
              ) : activeMotion.status === 'REJECTED' ? (
                <span className="text-rose-700 flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4" />
                  <span>Moción Rechazada en Sala</span>
                </span>
              ) : activeMotion.status === 'PASSED_TO_RUNOFF' ? (
                <span className="text-amber-700 flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Sin Mayoría Absoluta (&gt;50%) · Requiere Balotaje</span>
                </span>
              ) : (
                <span className="text-slate-700">Votación Cerrada</span>
              )}
            </div>

            {/* View Final Vote Breakdown button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setBreakdownMotion(activeMotion);
                  setShowBreakdownModal(true);
                }}
                className="w-full py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-[#4A154B] border border-purple-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title="Ver desglose detallado de sufragios y nómina de delegados"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Ver Desglose de Votación (Escrutinio Nominal)</span>
              </button>
            </div>

            {/* Runoff trigger button for Mesa / Secretaria if applicable */}
            {activeMotion.status === 'PASSED_TO_RUNOFF' && activeMotion.runoffOptions && activeMotion.dissensusId && isSecretariaTecnica && (
              <div className="pt-1.5">
                <button
                  onClick={() => passDissensusToRound2(activeMotion.dissensusId!, activeMotion.runoffOptions![0], activeMotion.runoffOptions![1])}
                  disabled={isAnyVotingOpen}
                  className="w-full py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                  title={isAnyVotingOpen ? `Ya existe la votación ${activeOpenVotingMotion?.code} activa en sala. Solo se puede tener una abierta a la vez.` : 'Lanzar 2ª Vuelta'}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Lanzar 2ª Vuelta: Opción {activeMotion.runoffOptions[0]} vs Opción {activeMotion.runoffOptions[1]}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REAL-TIME TALLY PROGRESS STRIP */}
      <div className="pt-2 border-t border-slate-100 shrink-0">
        
        {/* Tally text summary */}
        {isDissensusR1 ? (
          <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-700">
            <span>Emitidos: <strong>{totalCast}</strong></span>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-[#0284C7]">A: {countOpcionA}</span>
              <span className="text-[#D97706]">B: {countOpcionB}</span>
              <span className="text-[#059669]">C: {countOpcionC}</span>
              <span className="text-slate-500">Abs: {countAbstencion}</span>
            </div>
          </div>
        ) : isDissensusR2 && activeMotion.runoffOptions ? (
          <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-700">
            <span>Emitidos: <strong>{totalCast}</strong></span>
            <div className="flex items-center gap-2 font-bold">
              {activeMotion.runoffOptions.map((optKey) => {
                const count = optKey === 'A' ? countOpcionA : optKey === 'B' ? countOpcionB : countOpcionC;
                const colorCls = optKey === 'A' ? 'text-[#0284C7]' : optKey === 'B' ? 'text-[#D97706]' : 'text-[#059669]';
                return (
                  <span key={optKey} className={colorCls}>
                    Op. {optKey}: {count}
                  </span>
                );
              })}
              <span className="text-slate-500">Abs: {countAbstencion}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-700">
            <span>Emitidos: <strong>{totalCast}</strong></span>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-purple-900">{countFavor} Fav</span>
              <span className="text-rose-700">{countContra} Con</span>
              <span className="text-slate-500">{countAbstencion} Abs</span>
            </div>
          </div>
        )}

        {/* Multi-segment progress bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden">
          {isDissensusR1 || isDissensusR2 ? (
            <>
              <div 
                style={{ width: `${totalCast > 0 ? (countOpcionA / totalCast) * 100 : 0}%` }}
                className="bg-[#0284C7] h-full transition-all duration-300"
                title={`Opción A: ${countOpcionA}`}
              />
              <div 
                style={{ width: `${totalCast > 0 ? (countOpcionB / totalCast) * 100 : 0}%` }}
                className="bg-[#D97706] h-full transition-all duration-300"
                title={`Opción B: ${countOpcionB}`}
              />
              <div 
                style={{ width: `${totalCast > 0 ? (countOpcionC / totalCast) * 100 : 0}%` }}
                className="bg-[#059669] h-full transition-all duration-300"
                title={`Opción C: ${countOpcionC}`}
              />
              <div 
                style={{ width: `${totalCast > 0 ? (countAbstencion / totalCast) * 100 : 0}%` }}
                className="bg-slate-400 h-full transition-all duration-300"
                title={`Abstención: ${countAbstencion}`}
              />
            </>
          ) : (
            <>
              <div 
                style={{ width: `${totalCast > 0 ? (countFavor / totalCast) * 100 : 0}%` }}
                className="bg-[#4A154B] h-full transition-all duration-300"
                title={`A Favor: ${countFavor}`}
              />
              <div 
                style={{ width: `${totalCast > 0 ? (countContra / totalCast) * 100 : 0}%` }}
                className="bg-rose-600 h-full transition-all duration-300"
                title={`En Contra: ${countContra}`}
              />
              <div 
                style={{ width: `${totalCast > 0 ? (countAbstencion / totalCast) * 100 : 0}%` }}
                className="bg-slate-400 h-full transition-all duration-300"
                title={`Abstención: ${countAbstencion}`}
              />
            </>
          )}
        </div>

        {/* Secretaría Técnica Escrutinio Actions */}
        {isSecretariaTecnica && (
          <div className="mt-2 flex items-center gap-1.5">
            {activeMotion.status === 'VOTING' ? (
              <button
                onClick={() => closeVotingForMotion(activeMotion.id)}
                className="flex-1 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Cerrar Votación y Escrutar</span>
              </button>
            ) : (
              <button
                onClick={() => openVotingForMotion(activeMotion.id)}
                disabled={isAnyVotingOpen}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                title={isAnyVotingOpen ? `Ya existe la votación ${activeOpenVotingMotion?.code} activa en sala. Solo se puede tener una abierta a la vez.` : 'Reabrir votación'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isAnyVotingOpen ? 'Votación Bloqueada (Sala Ocupada)' : 'Reabrir Votación'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vote Breakdown Modal */}
      <VoteBreakdownModal
        motion={breakdownMotion}
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
      />

      {/* Vote Confirmation Modal */}
      <VotoConfirmationModal
        isOpen={isConfirmOpen}
        pendingVote={pendingVote}
        isSubmitting={isConfirmingVote}
        onConfirm={confirmVote}
        onCancel={cancelConfirmation}
      />

    </div>
  );
};
