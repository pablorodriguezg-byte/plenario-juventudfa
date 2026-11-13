import React, { useState, useEffect } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  Vote, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Lock, 
  Play, 
  Trash2, 
  FileCheck, 
  Layers, 
  Scale, 
  Plus, 
  RotateCw, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Users,
  Edit2,
  X,
  BarChart3,
  History,
  Search
} from 'lucide-react';
import { Motion, DissensusItem } from '../../types/plenario';
import { InlineDiffViewer } from '../../utils/textDiff';
import { VoteBreakdownModal } from './VotingTimeline';

export const MesaVotacionesView: React.FC = () => {
  const { 
    currentUser,
    isSecretariaTecnica,
    motionsHistory,
    hasActiveVoting,
    activeVotingMotion,
    openVotingForMotion,
    closeVotingForMotion,
    discardPresentedMotion,
    launchABCVote,
    launchDissensusRound1,
    passDissensusToRound2,
    launchGeneralPresynthesisVote,
    launchFinalSynthesisVote,
    createNewMotion,
    synthesisChapters,
    delegates,
    setActiveTab,
    setActiveMotionId,
    addDissensusItem,
    updateDissensusItem,
    deleteDissensusItem
  } = usePlenario();

  // Elapsed timer for active voting in sala
  const [activeVotingElapsed, setActiveVotingElapsed] = useState<string>('00:00');

  useEffect(() => {
    if (!activeVotingMotion || activeVotingMotion.status !== 'VOTING') {
      setActiveVotingElapsed('00:00');
      return;
    }
    const started = activeVotingMotion.startedAt || activeVotingMotion.createdAt || Date.now();
    const update = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setActiveVotingElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeVotingMotion?.id, activeVotingMotion?.status, activeVotingMotion?.startedAt, activeVotingMotion?.createdAt]);

  // Subtab for Launchers: Disensos unificados, Presíntesis general, Síntesis final, Ordinaria
  const [activeLauncher, setActiveLauncher] = useState<'DISENSOS' | 'PRESINTESIS_GRAL' | 'SINTESIS_FINAL' | 'ORDINARIA'>('DISENSOS');

  // State for Add Dissensus Form
  const [isAddingDissensus, setIsAddingDissensus] = useState(false);
  const [newDisChapterId, setNewDisChapterId] = useState(synthesisChapters[0]?.id || 'AUTO_CAP_1');

  useEffect(() => {
    if (synthesisChapters.length > 0 && !synthesisChapters.some(ch => ch.id === newDisChapterId)) {
      setNewDisChapterId(synthesisChapters[0].id);
    } else if (synthesisChapters.length === 0 && newDisChapterId !== 'AUTO_CAP_1') {
      setNewDisChapterId('AUTO_CAP_1');
    }
  }, [synthesisChapters, newDisChapterId]);
  const [newDisTitle, setNewDisTitle] = useState('');
  const [newDisDesc, setNewDisDesc] = useState('');
  const [newDisOptALabel, setNewDisOptALabel] = useState('Visión Uno');
  const [newDisOptAText, setNewDisOptAText] = useState('');
  const [newDisOptARegion, setNewDisOptARegion] = useState('Bancada Regional');
  const [newDisOptBLabel, setNewDisOptBLabel] = useState('Visión Dos');
  const [newDisOptBText, setNewDisOptBText] = useState('');
  const [newDisOptBRegion, setNewDisOptBRegion] = useState('Bancada Metropolitana');
  const [newDisOptCLabel, setNewDisOptCLabel] = useState('Visión de Consenso');
  const [newDisOptCText, setNewDisOptCText] = useState('');
  const [newDisOptCRegion, setNewDisOptCRegion] = useState('Mesa de Síntesis');

  // State for Edit Dissensus Modal
  const [editingDissensus, setEditingDissensus] = useState<{
    open: boolean;
    id: string;
    chapterId: string;
    chapterNumber?: number;
    title: string;
    context: string;
    optionA: { label: string; text: string; region: string };
    optionB: { label: string; text: string; region: string };
    optionC: { label: string; text: string; region: string };
  } | null>(null);

  // Form state for Ordinaria
  const [ordTitle, setOrdTitle] = useState('');
  const [ordDesc, setOrdDesc] = useState('');
  const [ordQuorum, setOrdQuorum] = useState<'SIMPLE_MAJORITY' | 'TWO_THIRDS'>('SIMPLE_MAJORITY');

  // Feedback banner state
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // State for All Votings Paginated Registry (10 per page)
  const [allMotionsSearch, setAllMotionsSearch] = useState('');
  const [allMotionsStatusFilter, setAllMotionsStatusFilter] = useState<'ALL' | 'VOTING' | 'APPROVED' | 'REJECTED' | 'PASSED_TO_RUNOFF' | 'DRAFT'>('ALL');
  const [allMotionsPage, setAllMotionsPage] = useState(1);
  const [selectedBreakdownMotion, setSelectedBreakdownMotion] = useState<Motion | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Filter presented motions in DRAFT (submitted by delegates)
  const presentedMotions = motionsHistory.filter(
    m => m.status === 'DRAFT' && (m.motionKind === 'MOCION_EXTENSIVA' || m.motionKind === 'MOCION_SUPRESIVA')
  );

  // Sorted and filtered list of ALL votings
  const sortedAllMotions = React.useMemo(() => {
    const q = allMotionsSearch.trim().toLowerCase();
    return [...motionsHistory]
      .filter((m) => {
        if (allMotionsStatusFilter !== 'ALL' && m.status !== allMotionsStatusFilter) return false;
        if (!q) return true;
        return (
          m.code.toLowerCase().includes(q) ||
          m.title.toLowerCase().includes(q) ||
          (m.proposedBy || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.status === 'VOTING' && b.status !== 'VOTING') return -1;
        if (b.status === 'VOTING' && a.status !== 'VOTING') return 1;
        const tA = a.closedAt || a.startedAt || a.createdAt || 0;
        const tB = b.closedAt || b.startedAt || b.createdAt || 0;
        return tB - tA;
      });
  }, [motionsHistory, allMotionsSearch, allMotionsStatusFilter]);

  const totalAllMotionsPages = Math.max(1, Math.ceil(sortedAllMotions.length / ITEMS_PER_PAGE));
  const safeAllMotionsPage = Math.min(allMotionsPage, totalAllMotionsPages);
  const paginatedMotions = sortedAllMotions.slice(
    (safeAllMotionsPage - 1) * ITEMS_PER_PAGE,
    safeAllMotionsPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setAllMotionsPage(1);
  }, [allMotionsSearch, allMotionsStatusFilter]);

  // Dissensus items from chapters
  const allDissensusItems = synthesisChapters.flatMap(ch => 
    ch.dissensusItems.map(d => ({ ...d, chapterNumber: ch.number, chapterTitle: ch.title }))
  );

  // Handlers
  const handleApproveAndLaunch = (motion: Motion) => {
    if (hasActiveVoting) {
      setFeedbackMsg({
        type: 'error',
        text: `Imposible abrir ${motion.code}. Ya existe una votación abierta en sala (${activeVotingMotion?.code}). Cierre la votación actual antes de lanzar otra.`
      });
      return;
    }
    openVotingForMotion(motion.id);
    setFeedbackMsg({
      type: 'success',
      text: `Moción ${motion.code} aprobada y lanzada formalmente a votación en sala.`
    });
  };

  const handleDiscard = (motionId: string, code: string) => {
    discardPresentedMotion(motionId);
    setFeedbackMsg({
      type: 'info',
      text: `Moción ${code} descartada de la bandeja de entrada.`
    });
  };

  const handleCreateDissensusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisTitle.trim() || !newDisOptAText.trim() || !newDisOptBText.trim() || !newDisOptCText.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Por favor complete el título y la redacción de las 3 opciones (A, B y C).' });
      return;
    }

    const targetChapterId = synthesisChapters.some(ch => ch.id === newDisChapterId)
      ? newDisChapterId
      : (synthesisChapters[0]?.id || 'AUTO_CAP_1');

    addDissensusItem(targetChapterId, {
      chapterId: targetChapterId,
      title: newDisTitle.trim(),
      context: newDisDesc.trim(),
      optionA: {
        label: newDisOptALabel.trim() || 'Visión Uno',
        text: newDisOptAText.trim(),
        originRegion: newDisOptARegion.trim() || 'Regional'
      },
      optionB: {
        label: newDisOptBLabel.trim() || 'Visión Dos',
        text: newDisOptBText.trim(),
        originRegion: newDisOptBRegion.trim() || 'Regional'
      },
      optionC: {
        label: newDisOptCLabel.trim() || 'Visión de Consenso',
        text: newDisOptCText.trim(),
        originRegion: newDisOptCRegion.trim() || 'Consenso'
      }
    });

    setFeedbackMsg({ type: 'success', text: `Disenso "${newDisTitle}" registrado correctamente y listo para votación.` });
    setIsAddingDissensus(false);
    setNewDisTitle('');
    setNewDisDesc('');
    setNewDisOptAText('');
    setNewDisOptBText('');
    setNewDisOptCText('');
  };

  const handleUpdateDissensusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDissensus) return;
    if (!editingDissensus.title.trim() || !editingDissensus.optionA.text.trim() || !editingDissensus.optionB.text.trim() || !editingDissensus.optionC.text.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Por favor complete todos los textos obligatorios.' });
      return;
    }

    updateDissensusItem(editingDissensus.id, {
      title: editingDissensus.title.trim(),
      context: editingDissensus.context.trim(),
      optionA: {
        label: editingDissensus.optionA.label.trim() || 'Visión Uno',
        text: editingDissensus.optionA.text.trim(),
        originRegion: editingDissensus.optionA.region.trim() || 'Regional'
      },
      optionB: {
        label: editingDissensus.optionB.label.trim() || 'Visión Dos',
        text: editingDissensus.optionB.text.trim(),
        originRegion: editingDissensus.optionB.region.trim() || 'Regional'
      },
      optionC: {
        label: editingDissensus.optionC.label.trim() || 'Visión de Consenso',
        text: editingDissensus.optionC.text.trim(),
        originRegion: editingDissensus.optionC.region.trim() || 'Consenso'
      }
    });

    setFeedbackMsg({ type: 'success', text: `Disenso "${editingDissensus.title}" actualizado correctamente.` });
    setEditingDissensus(null);
  };

  const handleDeleteDissensus = (disId: string, title: string) => {
    deleteDissensusItem(disId);
    setFeedbackMsg({ type: 'info', text: `Disenso "${title}" eliminado de la Presíntesis.` });
  };

  const handleLaunchOrdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordTitle.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Ingrese el título de la votación.' });
      return;
    }
    if (hasActiveVoting) {
      setFeedbackMsg({ type: 'error', text: `Ya existe una votación en sala (${activeVotingMotion?.code}).` });
      return;
    }

    const created = createNewMotion(ordTitle.trim(), ordDesc.trim() || ordTitle.trim(), ordQuorum, true);
    if (created) {
      setFeedbackMsg({ type: 'success', text: `Votación ordinaria ${created.code} lanzada a sala.` });
      setOrdTitle('');
      setOrdDesc('');
    }
  };

  if (!isSecretariaTecnica) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-black text-slate-800">Acceso Restringido a la Mesa de Votaciones</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Esta sección es de atribución privativa de la <strong>Secretaría Técnica</strong> para la conducción formal de las votaciones y la fe pública del Plenario.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-white via-purple-50/30 to-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-[#4A154B] text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4A154B]" />
            <span>Panel Oficial de Conducción · Secretaría Técnica</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Mesa de Conducción y Centro de Votaciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Concentrador unificado de la mesa: revise las mociones presentadas por los delegados, sométalas a votación y acceda a todas las botoneras oficiales del plenario en un solo lugar.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('plenario')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Vote className="w-4 h-4 text-purple-900" />
            <span>Ver Plenario en Vivo</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner (Flotante para no desplazar el contenido al cerrar/abrir votaciones) */}
      {feedbackMsg && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-md p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xl animate-in fade-in duration-200 ${
          feedbackMsg.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-900' :
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
          'bg-purple-50 border-purple-200 text-purple-950'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-[11px] font-bold underline cursor-pointer shrink-0">
            Cerrar
          </button>
        </div>
      )}

      {/* 2. Monitor de Estado de Sala en Vivo */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${hasActiveVoting ? 'bg-rose-600 animate-ping' : 'bg-emerald-500'}`} />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {hasActiveVoting ? 'Votación Activa en Sala del Plenario' : 'Estado de la Sala: Habilitada para Votar'}
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Padrón Habilitado: <strong>{delegates.filter(d => d.role === 'DELEGATE').length} delegados</strong>
          </span>
        </div>

        <div className="min-h-[144px] flex flex-col justify-center">
        {hasActiveVoting && activeVotingMotion ? (() => {
          const votesList = Object.values(activeVotingMotion.votes || {});
          const isDisR1 = activeVotingMotion.motionKind === 'DISENSO_PRIMERA_VUELTA';
          const isDisR2 = activeVotingMotion.motionKind === 'DISENSO_SEGUNDA_VUELTA';
          const countA = votesList.filter(v => v.vote === 'OPCION_A').length;
          const countB = votesList.filter(v => v.vote === 'OPCION_B').length;
          const countC = votesList.filter(v => v.vote === 'OPCION_C').length;
          const countFav = votesList.filter(v => v.vote === 'A_FAVOR').length;
          const countCon = votesList.filter(v => v.vote === 'EN_CONTRA').length;
          const countAbs = votesList.filter(v => v.vote === 'ABSTENCION').length;

          const getKindBadge = () => {
            switch (activeVotingMotion.motionKind) {
              case 'GENERAL_PRESINTESIS': return 'Presíntesis en General';
              case 'DISENSO_PRIMERA_VUELTA': return 'Disenso 1ª Vuelta (A/B/C)';
              case 'DISENSO_SEGUNDA_VUELTA': return 'Balotaje 2ª Vuelta';
              case 'MOCION_EXTENSIVA': return 'Moción Extensiva';
              case 'MOCION_SUPRESIVA': return 'Moción Supresiva';
              case 'GENERAL_SINTESIS_FINAL': return 'Síntesis Final';
              case 'MOCION_ORDINARIA': return 'Moción General';
              default: return 'Votación en Sala';
            }
          };

          return (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-rose-50/20 to-purple-50 border-2 border-[#4A154B]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black uppercase">
                    ● En Votación
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 border border-purple-200 text-[10px] font-black uppercase">
                    {getKindBadge()}
                  </span>
                  <span className="font-mono font-bold text-xs text-purple-950">
                    [{activeVotingMotion.code}]
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">
                    Quórum: {activeVotingMotion.quorumType === 'TWO_THIRDS' ? '2/3 Calificado' : activeVotingMotion.quorumType === 'ABSOLUTE_MAJORITY' ? 'Mayoría Absoluta (>50%)' : '50% + 1'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-1 shrink-0 animate-pulse" title="Tiempo que lleva abierta esta votación en sala">
                    <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>Tiempo abierta: {activeVotingElapsed} min</span>
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {activeVotingMotion.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {activeVotingMotion.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-purple-900 pt-1 font-bold">
                  <span>Sufragios emitidos: {votesList.length} de {delegates.filter(d => d.role === 'DELEGATE').length} delegados</span>
                  {isDisR1 || isDisR2 ? (
                    <span className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                      <span className="text-[#0284C7]">A: {countA}</span>
                      <span className="text-[#D97706]">B: {countB}</span>
                      <span className="text-[#059669]">C: {countC}</span>
                      <span className="text-slate-500">Abs: {countAbs}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                      <span className="text-[#4A154B]">Fav: {countFav}</span>
                      <span className="text-rose-700">Con: {countCon}</span>
                      <span className="text-slate-500">Abs: {countAbs}</span>
                    </span>
                  )}
                </div>
              </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  closeVotingForMotion(activeVotingMotion.id);
                  setFeedbackMsg({ type: 'success', text: `Votación ${activeVotingMotion.code} cerrada y escrutada exitosamente.` });
                }}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Votación y Escrutar</span>
              </button>
              <button
                onClick={() => {
                  setActiveMotionId(activeVotingMotion.id);
                  setActiveTab('plenario');
                }}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ir al Hemiciclo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          );
        })() : (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-950 min-h-[120px]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>
                <strong>No hay ninguna votación activa en este momento.</strong> La sala está disponible para que la Secretaría Técnica lance una moción presentada o abra cualquiera de las votaciones concertadas a continuación.
              </span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* 3. Bandeja de Entrada de Mociones Presentadas por Delegados */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#4A154B]" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Mociones Presentadas por Delegados Regionales
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                presentedMotions.length > 0 ? 'bg-purple-100 text-[#4A154B]' : 'bg-slate-100 text-slate-600'
              }`}>
                {presentedMotions.length} en espera de revisión
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Mociones extensivas (50%+1) y supresivas (2/3) ingresadas por delegadas/os. Requieren aprobación formal de la Mesa para ser lanzadas a sala.
            </p>
          </div>
        </div>

        {presentedMotions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No hay mociones pendientes de tramitación</div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Cuando los delegados presenten mociones extensivas o supresivas desde el texto de la presíntesis, ingresarán aquí para ser aprobadas y lanzadas a votación por la Secretaría Técnica.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {presentedMotions.map(motion => {
              const isExtensive = motion.motionKind === 'MOCION_EXTENSIVA';

              return (
                <div 
                  key={motion.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        isExtensive 
                          ? 'bg-purple-100 text-purple-900 border-purple-300' 
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {isExtensive ? 'Moción Extensiva · Quórum 50% + 1' : 'Moción Supresiva · Quórum 2/3'}
                      </span>
                      <span className="font-mono text-xs font-black text-purple-950">
                        [{motion.code}]
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium">
                      Presentada por: <strong className="text-slate-900">{motion.proposedBy}</strong>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {motion.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {motion.description}
                    </p>
                  </div>

                  {/* Comparación textual */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    {motion.targetParagraphNumber && (
                      <div className="text-[10px] font-mono font-bold text-purple-900 uppercase">
                        Materia Afectada: Párrafo § {motion.targetParagraphNumber} de la Presíntesis
                      </div>
                    )}
                    {motion.originalParagraphText && (
                      <div className="text-slate-600 text-[11px]">
                        <span className="font-bold text-slate-800 block text-[10px] uppercase">Texto Original Aprobado:</span>
                        "{motion.originalParagraphText}"
                      </div>
                    )}
                    {isExtensive && (
                      <div className="p-3 bg-white border border-purple-200 rounded-xl text-xs space-y-2 shadow-2xs">
                        <span className="font-bold text-slate-800 block text-[10px] uppercase">
                          Texto con Reemplazo Extensivo Propuesto (Morado: agregado / Rojo tachado: borrado):
                        </span>
                        <InlineDiffViewer
                          original={motion.originalParagraphText || ''}
                          modified={motion.proposedEditedText || motion.proposedExtensionText || ''}
                          showLegend={true}
                          className="text-xs sm:text-[13px] leading-relaxed"
                        />
                      </div>
                    )}
                    {!isExtensive && (
                      <div className="p-2.5 bg-rose-100/70 border border-rose-300 rounded-lg text-rose-950 text-[11px]">
                        <span className="font-black text-rose-900 block text-[10px] uppercase">Efecto Solicitado:</span>
                        Supresión completa del párrafo del documento oficial (requiere 2/3).
                      </div>
                    )}
                  </div>

                  {/* Botonera de Aprobación */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleDiscard(motion.id, motion.code)}
                      className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-xl font-bold cursor-pointer transition-colors"
                      title="Descartar de la bandeja"
                    >
                      Descartar
                    </button>

                    <button
                      onClick={() => handleApproveAndLaunch(motion)}
                      disabled={hasActiveVoting}
                      title={hasActiveVoting ? 'Ya existe una votación activa en sala. Cierre la votación actual primero.' : 'Aprobar moción e iniciar sufragio en el Plenario'}
                      className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all ${
                        hasActiveVoting 
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60' 
                          : 'bg-[#4A154B] hover:bg-[#5E1B5F] text-white cursor-pointer'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Aprobar y Lanzar a Votación</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Centro Unificado de Lanzamiento de Votaciones (Concertación Total) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100 space-y-1">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#4A154B]" />
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Centro Unificado de Lanzamiento de Votaciones
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Todas las botoneras del sistema concertadas en un solo panel para la Secretaría Técnica.
          </p>
        </div>

        {/* Subtabs del Launcher */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveLauncher('DISENSOS')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeLauncher === 'DISENSOS' ? 'bg-[#4A154B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            1. Disensos Documentales (A/B/C) ({allDissensusItems.length})
          </button>

          <button
            onClick={() => setActiveLauncher('PRESINTESIS_GRAL')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeLauncher === 'PRESINTESIS_GRAL' ? 'bg-[#4A154B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            2. Presíntesis en General (50%+1)
          </button>

          <button
            onClick={() => setActiveLauncher('SINTESIS_FINAL')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeLauncher === 'SINTESIS_FINAL' ? 'bg-[#4A154B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            3. Síntesis Final Ratificatoria (50%+1)
          </button>

          <button
            onClick={() => setActiveLauncher('ORDINARIA')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              activeLauncher === 'ORDINARIA' ? 'bg-[#4A154B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            4. Moción General Personalizada
          </button>
        </div>

        {/* CONTENIDO DEL SUBTAB SELECCIONADO */}

        {/* 1. ÚNICO APARTADO DE DISENSOS (AGREGAR, EDITAR, ELIMINAR Y LANZAR) */}
        {activeLauncher === 'DISENSOS' && (
          <div className="space-y-4 pt-2">
            
            {/* Cabecera del Apartado de Disensos con Botón Agregar */}
            <div className="p-4 bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#4A154B] uppercase text-xs tracking-wider">
                    Metodología Tripartita: Opciones A, B y C
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-[#4A154B]">
                    {allDissensusItems.length} registrados
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Se somete a votación 1ª Vuelta por Mayoría Absoluta (&gt;50%). Si ninguna opción supera el 50%, pasan las dos primeras mayorías a Balotaje (50%+1).
                </p>
              </div>

              <button
                onClick={() => setIsAddingDissensus(!isAddingDissensus)}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all"
              >
                {isAddingDissensus ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cerrar Formulario</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Registrar Nuevo Disenso</span>
                  </>
                )}
              </button>
            </div>

            {/* Formulario Expandible para Agregar Nuevo Disenso */}
            {isAddingDissensus && (
              <form onSubmit={handleCreateDissensusSubmit} className="p-5 bg-white border-2 border-purple-200 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#4A154B]" />
                    <span>Registrar Nuevo Disenso en la Presíntesis</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingDissensus(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Capítulo de la Presíntesis *</label>
                    <select
                      value={newDisChapterId}
                      onChange={(e) => setNewDisChapterId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#4A154B]"
                    >
                      {synthesisChapters.length === 0 ? (
                        <option value="AUTO_CAP_1">
                          Cap. 1: Acuerdos y Disensos del Plenario (Se creará automáticamente)
                        </option>
                      ) : (
                        synthesisChapters.map(ch => (
                          <option key={ch.id} value={ch.id}>
                            Capítulo {ch.number}: {ch.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Título del Disenso *</label>
                    <input
                      type="text"
                      required
                      value={newDisTitle}
                      onChange={(e) => setNewDisTitle(e.target.value)}
                      placeholder="Ej: Régimen de Financiamiento y Gratuidad en Posgrado"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Descripción o Contexto</label>
                    <input
                      type="text"
                      value={newDisDesc}
                      onChange={(e) => setNewDisDesc(e.target.value)}
                      placeholder="Breve explicación de la controversia deliberada"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                    />
                  </div>
                </div>

                {/* Las 3 Opciones para Nuevo Disenso */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Opción A */}
                  <div className="p-3 rounded-2xl border border-sky-300 bg-sky-50/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#0284C7] uppercase">Opción A</span>
                      <input
                        type="text"
                        value={newDisOptARegion}
                        onChange={(e) => setNewDisOptARegion(e.target.value)}
                        placeholder="Bancada de origen"
                        className="text-[10px] bg-white border border-sky-200 rounded-lg px-2 py-0.5 text-slate-700 w-36"
                      />
                    </div>
                    <input
                      type="text"
                      value={newDisOptALabel}
                      onChange={(e) => setNewDisOptALabel(e.target.value)}
                      placeholder="Etiqueta breve (ej: Visión Regional Norte)"
                      className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                    <textarea
                      rows={3}
                      required
                      value={newDisOptAText}
                      onChange={(e) => setNewDisOptAText(e.target.value)}
                      placeholder="Redacción concreta de la Opción A..."
                      className="w-full bg-white border border-sky-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Opción B */}
                  <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#D97706] uppercase">Opción B</span>
                      <input
                        type="text"
                        value={newDisOptBRegion}
                        onChange={(e) => setNewDisOptBRegion(e.target.value)}
                        placeholder="Bancada de origen"
                        className="text-[10px] bg-white border border-amber-200 rounded-lg px-2 py-0.5 text-slate-700 w-36"
                      />
                    </div>
                    <input
                      type="text"
                      value={newDisOptBLabel}
                      onChange={(e) => setNewDisOptBLabel(e.target.value)}
                      placeholder="Etiqueta breve (ej: Visión Metropolitana)"
                      className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                    <textarea
                      rows={3}
                      required
                      value={newDisOptBText}
                      onChange={(e) => setNewDisOptBText(e.target.value)}
                      placeholder="Redacción concreta de la Opción B..."
                      className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Opción C */}
                  <div className="p-3 rounded-2xl border border-emerald-300 bg-emerald-50/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#059669] uppercase">Opción C</span>
                      <input
                        type="text"
                        value={newDisOptCRegion}
                        onChange={(e) => setNewDisOptCRegion(e.target.value)}
                        placeholder="Mesa de Síntesis"
                        className="text-[10px] bg-white border border-emerald-200 rounded-lg px-2 py-0.5 text-slate-700 w-36"
                      />
                    </div>
                    <input
                      type="text"
                      value={newDisOptCLabel}
                      onChange={(e) => setNewDisOptCLabel(e.target.value)}
                      placeholder="Etiqueta breve (ej: Visión de Consenso)"
                      className="w-full bg-white border border-emerald-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                    <textarea
                      rows={3}
                      required
                      value={newDisOptCText}
                      onChange={(e) => setNewDisOptCText(e.target.value)}
                      placeholder="Redacción de consenso de la Opción C..."
                      className="w-full bg-white border border-emerald-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAddingDissensus(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Guardar y Registrar Disenso</span>
                  </button>
                </div>
              </form>
            )}

            {/* Listado de Disensos Registrados con Edición, Eliminación y Lanzamiento */}
            <div className="space-y-3">
              {allDissensusItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Scale className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold text-slate-700">No hay disensos registrados en la Presíntesis</div>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Haga clic en "+ Registrar Nuevo Disenso" para ingresar las tres opciones de controversia para votación plenaria.
                  </p>
                </div>
              ) : (
                allDissensusItems.map(dis => (
                  <div key={dis.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white space-y-3.5 text-xs transition-all shadow-2xs">
                    
                    {/* Header del Card de Disenso */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#4A154B] bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 text-xs">
                          Cap. {dis.chapterNumber} · Disenso
                        </span>
                        <h4 className="font-black text-slate-900 text-sm">{dis.title}</h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        dis.status === 'RESUELTO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        dis.status === 'EN_VOTACION_R1' || dis.status === 'EN_VOTACION_R2' ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {dis.status === 'RESUELTO' ? `✓ Resuelto (Ganó Opción ${dis.winner})` :
                         dis.status === 'EN_VOTACION_R1' ? '● En 1ª Vuelta en Sala' :
                         dis.status === 'EN_VOTACION_R2' ? '● En Balotaje 2ª Vuelta' :
                         'Pendiente de Votar'}
                      </span>
                    </div>

                    {dis.context && (
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {dis.context}
                      </p>
                    )}

                    {/* Columnas con las 3 Opciones (A, B y C) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                      <div className={`p-3 rounded-xl border ${dis.winner === 'A' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-sky-50/70 border-sky-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-sky-900 font-black uppercase text-[10px]">
                            Opción A: {dis.optionA.label}
                          </strong>
                          {dis.winner === 'A' && <span className="text-[10px] font-black text-emerald-700">✓ Aprobada</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mb-1">
                          Origen: {dis.optionA.originRegion || 'Regional'}
                        </span>
                        <p className="text-slate-700 leading-snug">{dis.optionA.text}</p>
                      </div>

                      <div className={`p-3 rounded-xl border ${dis.winner === 'B' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-amber-50/70 border-amber-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-amber-900 font-black uppercase text-[10px]">
                            Opción B: {dis.optionB.label}
                          </strong>
                          {dis.winner === 'B' && <span className="text-[10px] font-black text-emerald-700">✓ Aprobada</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mb-1">
                          Origen: {dis.optionB.originRegion || 'Regional'}
                        </span>
                        <p className="text-slate-700 leading-snug">{dis.optionB.text}</p>
                      </div>

                      <div className={`p-3 rounded-xl border ${dis.winner === 'C' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-emerald-50/70 border-emerald-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-emerald-900 font-black uppercase text-[10px]">
                            Opción C: {dis.optionC.label}
                          </strong>
                          {dis.winner === 'C' && <span className="text-[10px] font-black text-emerald-700">✓ Aprobada</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mb-1">
                          Origen: {dis.optionC.originRegion || 'Consenso'}
                        </span>
                        <p className="text-slate-700 leading-snug">{dis.optionC.text}</p>
                      </div>
                    </div>

                    {/* Botonera de Gestión: Editar, Eliminar y Lanzar Votación */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      
                      {/* Acciones de Edición y Eliminación */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingDissensus({
                            open: true,
                            id: dis.id,
                            chapterId: dis.chapterId,
                            chapterNumber: dis.chapterNumber,
                            title: dis.title,
                            context: dis.context || '',
                            optionA: {
                              label: dis.optionA.label,
                              text: dis.optionA.text,
                              region: dis.optionA.originRegion || ''
                            },
                            optionB: {
                              label: dis.optionB.label,
                              text: dis.optionB.text,
                              region: dis.optionB.originRegion || ''
                            },
                            optionC: {
                              label: dis.optionC.label,
                              text: dis.optionC.text,
                              region: dis.optionC.originRegion || ''
                            }
                          })}
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Modificar redacciones del disenso"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDissensus(dis.id, dis.title)}
                          className="px-2.5 py-1 text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Eliminar este disenso de la Presíntesis"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      {/* Botonera de Lanzamiento de Votaciones */}
                      <div className="flex items-center gap-2">
                        {dis.round2Runoff && dis.status !== 'RESUELTO' && (
                          <button
                            onClick={() => {
                              if (hasActiveVoting) {
                                setFeedbackMsg({ type: 'error', text: `Ya existe una votación abierta en sala (${activeVotingMotion?.code}). Cierre la votación actual primero.` });
                                return;
                              }
                              passDissensusToRound2(dis.id, dis.round2Runoff![0], dis.round2Runoff![1]);
                              setFeedbackMsg({ type: 'success', text: `Balotaje iniciado entre Opción ${dis.round2Runoff![0]} y ${dis.round2Runoff![1]}` });
                            }}
                            disabled={hasActiveVoting}
                            title={hasActiveVoting ? 'Cierre la votación activa antes de abrir otra' : 'Lanzar Balotaje'}
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Lanzar 2ª Vuelta: Opción {dis.round2Runoff[0]} vs {dis.round2Runoff[1]} (50%+1)</span>
                          </button>
                        )}

                        {dis.status !== 'RESUELTO' && !dis.round2Runoff && (
                          <button
                            onClick={() => {
                              if (hasActiveVoting) {
                                setFeedbackMsg({ type: 'error', text: `Ya existe una votación abierta en sala (${activeVotingMotion?.code}). Cierre la votación actual primero.` });
                                return;
                              }
                              launchDissensusRound1(dis.id);
                              setFeedbackMsg({ type: 'success', text: `1ª Vuelta de "${dis.title}" iniciada formalmente en sala.` });
                            }}
                            disabled={hasActiveVoting}
                            title={hasActiveVoting ? 'Cierre la votación activa antes de abrir otra' : 'Lanzar Primera Vuelta'}
                            className="px-4 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Lanzar Primera Vuelta (&gt;50%)</span>
                          </button>
                        )}

                        {dis.status === 'RESUELTO' && (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Disenso Dirimido por el Plenario</span>
                          </span>
                        )}
                      </div>

                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* 3. PRESÍNTESIS EN GENERAL */}
        {activeLauncher === 'PRESINTESIS_GRAL' && (
          <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#4A154B]" />
              <h3 className="text-sm font-black text-slate-900">
                Votación General Única de la Presíntesis Regional (50% + 1)
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
              De acuerdo con la metodología del plenario, <strong>la presíntesis se vota en general una sola vez al comenzar la discusión nacional</strong> (no por párrafos individuales). Al ratificarse la presíntesis con 50%+1, se abre formalmente la discusión de disensos y la presentación de mociones reglamentarias.
            </p>

            <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs text-slate-700">
              <span className="font-bold text-[#4A154B] block mb-1">Capítulos a someter a votación:</span>
              {synthesisChapters.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Sin capítulos cargados aún (se someterá a votación general el marco base del plenario; puede cargar capítulos en la pestaña "2. Párrafos Presentados").
                </p>
              ) : (
                <ul className="list-disc list-inside space-y-0.5">
                  {synthesisChapters.map(ch => (
                    <li key={ch.id}>Cap. {ch.number}: {ch.title} ({ch.paragraphs.length} párrafos base)</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (hasActiveVoting) {
                    setFeedbackMsg({ type: 'error', text: 'Cierre la votación activa antes.' });
                    return;
                  }
                  launchGeneralPresynthesisVote();
                  setFeedbackMsg({ type: 'success', text: 'Votación General de la Presíntesis iniciada formalmente en sala.' });
                }}
                disabled={hasActiveVoting}
                className="px-5 py-2.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Vote className="w-4 h-4" />
                <span>Lanzar Votación General de la Presíntesis (50%+1)</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. SÍNTESIS FINAL */}
        {activeLauncher === 'SINTESIS_FINAL' && (
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-black text-slate-900">
                Votación Solemne de la Síntesis Nacional Final (50% + 1)
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
              Al concluir todas las rondas de disensos y resolverse las mociones extensivas y supresivas, la Secretaría Técnica somete a <strong>ratificación soberana definitiva el documento consolidado final</strong> mediante votación general del 50%+1.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (hasActiveVoting) {
                    setFeedbackMsg({ type: 'error', text: 'Cierre la votación activa antes.' });
                    return;
                  }
                  launchFinalSynthesisVote();
                  setFeedbackMsg({ type: 'success', text: 'Votación de la Síntesis Nacional Final lanzada al Plenario.' });
                }}
                disabled={hasActiveVoting}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lanzar Votación General Síntesis Final (50%+1)</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. MOCIÓN GENERAL PERSONALIZADA */}
        {activeLauncher === 'ORDINARIA' && (
          <form onSubmit={handleLaunchOrdSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Título de la Votación *</label>
                <input
                  type="text"
                  required
                  value={ordTitle}
                  onChange={(e) => setOrdTitle(e.target.value)}
                  placeholder="Ej: Aprobación de Declaración Pública del Plenario"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Régimen de Quórum</label>
                <select
                  value={ordQuorum}
                  onChange={(e) => setOrdQuorum(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
                >
                  <option value="SIMPLE_MAJORITY">Mayoría Simple (50% + 1)</option>
                  <option value="TWO_THIRDS">Dos Tercios Calificado (2/3)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Inciso Resolutivo a Someter a Sufragio</label>
              <textarea
                rows={3}
                value={ordDesc}
                onChange={(e) => setOrdDesc(e.target.value)}
                placeholder="Redacte el texto resolutivo que se someterá a votación en sala..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={hasActiveVoting}
                title={hasActiveVoting ? 'Cierre la votación en sala antes de abrir otra' : 'Lanzar votación ordinaria'}
                className="px-5 py-2.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Lanzar Moción Ordinaria a Sala</span>
              </button>
            </div>
          </form>
        )}

      </div>

      {/* 5. Registro General de TODAS las Votaciones (Paginado de 10 en 10) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#4A154B]" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Registro General de Votaciones
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#4A154B] text-[10px] font-black font-mono">
                {motionsHistory.length} total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Listado completo de todas las votaciones abiertas, aprobadas, rechazadas, en balotaje o pendientes (10 por página).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={allMotionsSearch}
                onChange={(e) => setAllMotionsSearch(e.target.value)}
                placeholder="Buscar por código o título..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#4A154B] w-48 sm:w-56"
              />
            </div>

            <select
              value={allMotionsStatusFilter}
              onChange={(e) => setAllMotionsStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los estados</option>
              <option value="VOTING">En Votación</option>
              <option value="APPROVED">Aprobadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="PASSED_TO_RUNOFF">Balotaje</option>
              <option value="DRAFT">Pendientes (Borrador)</option>
            </select>
          </div>
        </div>

        {paginatedMotions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 border border-slate-200 rounded-2xl text-xs text-slate-500">
            {motionsHistory.length === 0
              ? 'Aún no se han registrado votaciones en el Plenario.'
              : 'No se encontraron votaciones con el filtro aplicado.'}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Código / Tipo</th>
                    <th className="py-2.5 px-3">Materia / Título</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3">Escrutinio</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMotions.map((m) => {
                    const votesArr = Object.values(m.votes || {});
                    const totalCast = votesArr.length;
                    const isTripartite = m.motionKind === 'DISENSO_PRIMERA_VUELTA' || m.motionKind === 'DISENSO_SEGUNDA_VUELTA';

                    const kindLabel = (() => {
                      switch (m.motionKind) {
                        case 'GENERAL_PRESINTESIS': return 'Presíntesis';
                        case 'DISENSO_PRIMERA_VUELTA': return 'Disenso 1ª Vuelta';
                        case 'DISENSO_SEGUNDA_VUELTA': return 'Balotaje 2ª Vuelta';
                        case 'MOCION_EXTENSIVA': return 'Moción Extensiva';
                        case 'MOCION_SUPRESIVA': return 'Moción Supresiva';
                        case 'GENERAL_SINTESIS_FINAL': return 'Síntesis Final';
                        case 'MOCION_ORDINARIA': return 'Moción General';
                        default: return 'Moción';
                      }
                    })();

                    const statusBadge = (() => {
                      switch (m.status) {
                        case 'VOTING':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">● En Sala</span>;
                        case 'APPROVED':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Aprobada</span>;
                        case 'REJECTED':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">✕ Rechazada</span>;
                        case 'PASSED_TO_RUNOFF':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">Balotaje</span>;
                        case 'DRAFT':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">Pendiente</span>;
                        default:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">Cerrada</span>;
                      }
                    })();

                    const aFav = votesArr.filter(v => v.vote === 'A_FAVOR').length;
                    const enCon = votesArr.filter(v => v.vote === 'EN_CONTRA').length;
                    const abs = votesArr.filter(v => v.vote === 'ABSTENCION').length;
                    const opA = votesArr.filter(v => v.vote === 'OPCION_A').length;
                    const opB = votesArr.filter(v => v.vote === 'OPCION_B').length;
                    const opC = votesArr.filter(v => v.vote === 'OPCION_C').length;

                    const timeRef = m.closedAt || m.startedAt || m.createdAt;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <div className="font-mono font-black text-purple-950 text-[11px]">{m.code}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-0.5">{kindLabel}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top min-w-[200px]">
                          <div className="font-bold text-slate-900 leading-snug line-clamp-2">{m.title}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {m.proposedBy}
                            {timeRef ? ` · ${new Date(timeRef).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap font-mono text-[10.5px]">
                          {m.status === 'DRAFT' ? (
                            <span className="text-slate-400 italic font-sans">Sin votación iniciada</span>
                          ) : isTripartite ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-[#0284C7]">A:{opA}</span>
                                <span className="text-[#D97706]">B:{opB}</span>
                                <span className="text-[#059669]">C:{opC}</span>
                                <span className="text-slate-500">Abs:{abs}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                {totalCast} votos{m.resultSummary?.winner ? ` · Ganó Op. ${m.resultSummary.winner}` : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-[#4A154B]">Fav:{aFav}</span>
                                <span className="text-rose-700">Con:{enCon}</span>
                                <span className="text-slate-500">Abs:{abs}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                {totalCast} votos{m.resultSummary?.percentageFavor !== undefined ? ` (${m.resultSummary.percentageFavor.toFixed(1)}%)` : ''}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                          {m.status === 'DRAFT' ? (
                            <button
                              type="button"
                              onClick={() => handleApproveAndLaunch(m)}
                              disabled={hasActiveVoting}
                              className="px-2.5 py-1 bg-[#4A154B] hover:bg-[#5E1B5F] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Lanzar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedBreakdownMotion(m)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#4A154B] border border-purple-200 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Ver plenario, escrutinio y registro de fe pública"
                            >
                              <BarChart3 className="w-3 h-3" />
                              <span>Ver Desglose</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paginación (10 por página) */}
        {sortedAllMotions.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-600 font-medium">
              Mostrando{' '}
              <strong className="text-slate-900">
                {(safeAllMotionsPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeAllMotionsPage * ITEMS_PER_PAGE, sortedAllMotions.length)}
              </strong>{' '}
              de <strong className="text-slate-900">{sortedAllMotions.length}</strong> votaciones · Página{' '}
              <strong className="text-slate-900">{safeAllMotionsPage}</strong> de <strong className="text-slate-900">{totalAllMotionsPages}</strong>
            </span>

            {totalAllMotionsPages > 1 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAllMotionsPage(p => Math.max(1, p - 1))}
                  disabled={safeAllMotionsPage <= 1}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                {Array.from({ length: totalAllMotionsPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setAllMotionsPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      pageNum === safeAllMotionsPage
                        ? 'bg-[#4A154B] text-white shadow-2xs'
                        : 'bg-white hover:bg-purple-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setAllMotionsPage(p => Math.min(totalAllMotionsPages, p + 1))}
                  disabled={safeAllMotionsPage >= totalAllMotionsPages}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Desglose / Plenario de Votación */}
      <VoteBreakdownModal
        motion={selectedBreakdownMotion}
        isOpen={Boolean(selectedBreakdownMotion)}
        onClose={() => setSelectedBreakdownMotion(null)}
      />

      {/* Modal de Edición de Disenso */}
      {editingDissensus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#4A154B] flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Editar Disenso Tripartito (Opciones A, B y C)
                  </h3>
                  {editingDissensus.chapterNumber && (
                    <span className="text-[10px] text-purple-900 font-mono">
                      Capítulo {editingDissensus.chapterNumber}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setEditingDissensus(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDissensusSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Título del Disenso *</label>
                  <input
                    type="text"
                    required
                    value={editingDissensus.title}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Descripción o Contexto</label>
                  <input
                    type="text"
                    value={editingDissensus.context}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({ ...prev, context: e.target.value }) : null)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                  />
                </div>
              </div>

              {/* Las 3 Opciones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Opción A */}
                <div className="p-3 rounded-2xl border border-sky-300 bg-sky-50/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#0284C7] uppercase">Opción A</span>
                    <input
                      type="text"
                      value={editingDissensus.optionA.region}
                      onChange={(e) => setEditingDissensus(prev => prev ? ({
                        ...prev,
                        optionA: { ...prev.optionA, region: e.target.value }
                      }) : null)}
                      placeholder="Bancada de origen"
                      className="text-[10px] bg-white border border-sky-200 rounded-lg px-2 py-0.5 text-slate-700 w-32"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingDissensus.optionA.label}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({
                      ...prev,
                      optionA: { ...prev.optionA, label: e.target.value }
                    }) : null)}
                    className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                  />
                  <textarea
                    rows={4}
                    required
                    value={editingDissensus.optionA.text}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({
                      ...prev,
                      optionA: { ...prev.optionA, text: e.target.value }
                    }) : null)}
                    className="w-full bg-white border border-sky-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Opción B */}
                <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#D97706] uppercase">Opción B</span>
                    <input
                      type="text"
                      value={editingDissensus.optionB.region}
                      onChange={(e) => setEditingDissensus(prev => prev ? ({
                        ...prev,
                        optionB: { ...prev.optionB, region: e.target.value }
                      }) : null)}
                      placeholder="Bancada de origen"
                      className="text-[10px] bg-white border border-amber-200 rounded-lg px-2 py-0.5 text-slate-700 w-32"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingDissensus.optionB.label}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({
                      ...prev,
                      optionB: { ...prev.optionB, label: e.target.value }
                    }) : null)}
                    className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                  />
                  <textarea
                    rows={4}
                    required
                    value={editingDissensus.optionB.text}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({
                      ...prev,
                      optionB: { ...prev.optionB, text: e.target.value }
                    }) : null)}
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Opción C */}
                <div className="p-3 rounded-2xl border border-emerald-300 bg-emerald-50/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#059669] uppercase">Opción C</span>
                    <input
                      type="text"
                      value={editingDissensus.optionC.region}
                      onChange={(e) => setEditingDissensus(prev => prev ? ({
                        ...prev,
                        optionC: { ...prev.optionC, region: e.target.value }
                      }) : null)}
                      placeholder="Mesa de Síntesis"
                      className="text-[10px] bg-white border border-emerald-200 rounded-lg px-2 py-0.5 text-slate-700 w-32"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingDissensus.optionC.label}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({
                      ...prev,
                      optionC: { ...prev.optionC, label: e.target.value }
                    }) : null)}
                    className="w-full bg-white border border-emerald-200 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                  />
                  <textarea
                    rows={4}
                    required
                    value={editingDissensus.optionC.text}
                    onChange={(e) => setEditingDissensus(prev => prev ? ({
                      ...prev,
                      optionC: { ...prev.optionC, text: e.target.value }
                    }) : null)}
                    className="w-full bg-white border border-emerald-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingDissensus(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
