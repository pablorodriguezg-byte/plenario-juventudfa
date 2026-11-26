import React, { useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  FileText, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Vote, 
  CheckCircle2, 
  Download,
  FileCheck,
  ShieldCheck,
  Lock,
  Clock,
  Award
} from 'lucide-react';
import { LaunchVotingModal } from './LaunchVotingModal';
import { InlineDiffViewer } from '../../utils/textDiff';
import { Motion } from '../../types/plenario';
import { exportMotionCertificatePDF } from '../../utils/exportMotionCertificatePDF';

export const TextoFinalView: React.FC = () => {
  const { 
    synthesisChapters, 
    isPresynthesisApproved,
    motionsHistory,
    launchFinalSynthesisVote,
    exportFinalSynthesisPDF,
    isChapterMotionsEnabled,
    currentUser,
    isSecretariaTecnica,
    isDelegate,
    setActiveTab
  } = usePlenario();

  const [activeChapterIndex, setActiveChapterIndex] = useState<number | 'ALL'>('ALL');
  const [modalState, setModalState] = useState<{
    open: boolean;
    tab: 'ABC' | 'EXTENSIVA' | 'SUPRESIVA' | 'GENERAL';
    preselectedParagraph?: { chapterId: string; paragraphId: string };
  }>({
    open: false,
    tab: 'EXTENSIVA'
  });

  // Calculate Metrics
  const allParagraphs = (synthesisChapters || []).flatMap(ch => ch.paragraphs || []);
  const totalApproved = isPresynthesisApproved
    ? allParagraphs.filter(p => p.status !== 'SUPRIMIDO').length
    : 0;
  const totalExtended = allParagraphs.filter(p => p.status === 'EXTENDIDO').length;
  const totalSuppressed = allParagraphs.filter(p => p.status === 'SUPRIMIDO').length;
  
  const allDissensus = (synthesisChapters || []).flatMap(ch => ch.dissensusItems || []);
  const totalDissensusResolved = allDissensus.filter(d => d.status === 'RESUELTO').length;

  const finalSynthesisMotion = motionsHistory.find(m => m.motionKind === 'GENERAL_SINTESIS_FINAL');

  const chaptersToDisplay = activeChapterIndex === 'ALL'
    ? (synthesisChapters || [])
    : [synthesisChapters[activeChapterIndex]].filter(Boolean);

  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const myPresentedMotions = React.useMemo(() => {
    if (!isDelegate || !currentUser) return [];
    const expectedProposer = `${currentUser.name} (${currentUser.region})`.trim().toLowerCase();
    const fallbackName = currentUser.name.trim().toLowerCase();
    return motionsHistory
      .filter((m) => m.motionKind === 'MOCION_EXTENSIVA' || m.motionKind === 'MOCION_SUPRESIVA')
      .filter((m) => {
        const pb = (m.proposedBy || '').trim().toLowerCase();
        return (
          pb === expectedProposer ||
          (fallbackName.length > 0 && (pb === fallbackName || pb.startsWith(`${fallbackName} (`)))
        );
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [isDelegate, currentUser, motionsHistory]);

  const handleDownloadCertificate = async (motion: Motion) => {
    setDownloadingCertId(motion.id);
    try {
      await exportMotionCertificatePDF(motion, {
        synthesisChapters,
        delegateOrganization: currentUser?.organization
      });
    } finally {
      setDownloadingCertId(null);
    }
  };

  const anyChapterMotionsEnabled = isChapterMotionsEnabled();
  const hasLockedDisplayedChapters =
    chaptersToDisplay.length > 0 && chaptersToDisplay.some((ch) => !isChapterMotionsEnabled(ch.id));

  const handleOpenExtensive = (chapterId: string, paragraphId: string) => {
    if (!isDelegate || !isPresynthesisApproved || !isChapterMotionsEnabled(chapterId)) return;
    setModalState({
      open: true,
      tab: 'EXTENSIVA',
      preselectedParagraph: { chapterId, paragraphId }
    });
  };

  const handleOpenSuppressive = (chapterId: string, paragraphId: string) => {
    if (!isDelegate || !isPresynthesisApproved || !isChapterMotionsEnabled(chapterId)) return;
    setModalState({
      open: true,
      tab: 'SUPRESIVA',
      preselectedParagraph: { chapterId, paragraphId }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      
      {/* Top Banner & Control Center */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#4A154B] dark:text-purple-200 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Documento Oficial Consolidado</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Síntesis Nacional Final y Articulado Aprobado
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Visualice cómo va quedando el texto oficial con los acuerdos base y resoluciones aprobadas.
              {isDelegate && ' Como delegada/o regional, puedes levantar mociones extensivas (50%+1) y supresivas (2/3) sobre los párrafos ya aprobados.'}
              {isSecretariaTecnica && ' Como Secretaría Técnica, custodia la fe pública y puedes exportar la síntesis ratificada en PDF.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Download Official PDF Button */}
            <button
              onClick={exportFinalSynthesisPDF}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              title="Exportar Texto Final oficial en formato PDF"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>Descargar Texto Final (PDF)</span>
            </button>

            {/* Delegates only: Nueva Moción (solo visible cuando la Presíntesis esté aprobada y existan capítulos desbloqueados) */}
            {isDelegate && isPresynthesisApproved && anyChapterMotionsEnabled && (
              <button
                onClick={() => setModalState({ open: true, tab: 'EXTENSIVA' })}
                title="Presentar nueva moción sobre párrafo aprobado"
                className="px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all bg-gradient-to-r from-[#4A154B] to-[#6A1B6B] hover:brightness-110 text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Moción sobre Párrafo</span>
              </button>
            )}

            {/* Secretaría Técnica only: Ir a Mesa de Votaciones */}
            {isSecretariaTecnica && (
              <button
                onClick={() => setActiveTab('mesa-votaciones')}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#4A154B] dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Ir a Mesa de Votaciones para tramitar mociones y lanzar votaciones"
              >
                <Vote className="w-4 h-4 text-[#4A154B] dark:text-purple-300" />
                <span>Mesa de Votaciones</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/45 border border-purple-200/80 dark:border-purple-800/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-300 tracking-wider">
              Párrafos Aprobados
            </span>
            <div className="text-lg sm:text-xl font-black text-[#4A154B] dark:text-purple-200 mt-0.5">
              {totalApproved}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">En el texto oficial</span>
          </div>

          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/45 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-300 tracking-wider">
              Mociones Extensivas
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              {totalExtended}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">+ Ampliaciones aprobadas (50%+1)</span>
          </div>

          <div className="p-3 bg-rose-50/70 dark:bg-rose-950/45 border border-rose-200/80 dark:border-rose-800/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-rose-900 dark:text-rose-300 tracking-wider">
              Mociones Supresivas
            </span>
            <div className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
              {totalSuppressed}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">✕ Párrafos excluidos (2/3)</span>
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/45 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
              Disensos A/B/C Resueltos
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
              {totalDissensusResolved} / {allDissensus.length}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Integrados al documento</span>
          </div>
        </div>

        {/* General Final Vote Trigger Callout */}
        <div className="p-3.5 bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 dark:from-purple-950/45 dark:via-slate-800/70 dark:to-purple-950/45 border border-purple-200 dark:border-purple-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-purple-950 dark:text-purple-200 font-black">
              <FileCheck className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              <span>Votación General Solemne de la Síntesis Final</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Una vez cerradas todas las mociones y resueltos los disensos, el Plenario ratifica en general el texto definitivo por mayoría simple (50%+1).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSecretariaTecnica && (
              <button
                onClick={() => launchFinalSynthesisVote()}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Votar Síntesis Final (50%+1)</span>
              </button>
            )}
            {finalSynthesisMotion && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                finalSynthesisMotion.status === 'APPROVED'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                  : finalSynthesisMotion.status === 'VOTING'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {finalSynthesisMotion.status === 'APPROVED' ? '✓ Aprobada' : finalSynthesisMotion.status === 'VOTING' ? '● En Votación' : 'Cerrada'}
              </span>
            )}
          </div>
        </div>

        {/* Delegate Personal Motion Certificates Drawer */}
        {isDelegate && myPresentedMotions.length > 0 && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Mis Mociones Presentadas ({myPresentedMotions.length}) — Certificados Descargables
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                Formato institucional FE-FA compartible
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {myPresentedMotions.map((m) => {
                const isSup = m.motionKind === 'MOCION_SUPRESIVA';
                const statusBadge =
                  m.status === 'APPROVED'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                    : m.status === 'REJECTED'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                      : m.status === 'VOTING'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                        : 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800';
                const statusText =
                  m.status === 'APPROVED'
                    ? 'Aprobada'
                    : m.status === 'REJECTED'
                      ? 'Rechazada'
                      : m.status === 'VOTING'
                        ? 'En votación'
                        : 'Ingresada';

                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black text-[#4A154B] dark:text-purple-300">
                          {m.code}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${statusBadge}`}>
                          {statusText}
                        </span>
                        {m.targetParagraphNumber && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            § {m.targetParagraphNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                        {isSup ? 'Supresiva' : 'Extensiva'} · {m.title}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadCertificate(m)}
                      disabled={downloadingCertId === m.id}
                      className="px-2.5 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all disabled:opacity-60"
                      title="Descargar certificado oficial en PDF"
                    >
                      <Download className="w-3 h-3 text-amber-300" />
                      <span>{downloadingCertId === m.id ? 'Generando...' : 'Certificado PDF'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Chapter Filter Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveChapterIndex('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeChapterIndex === 'ALL'
              ? 'bg-[#4A154B] dark:bg-purple-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Ver Documento Completo
        </button>

        {(synthesisChapters || []).map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => setActiveChapterIndex(idx)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeChapterIndex === idx
                ? 'bg-[#4A154B] dark:bg-purple-700 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Capítulo {ch.number}
          </button>
        ))}
      </div>

      {/* Single header banner when Presíntesis is pending or motions are disabled */}
      {(!isPresynthesisApproved || hasLockedDisplayedChapters) && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-950 dark:text-rose-100">
          <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-black uppercase text-[11px] tracking-wide text-rose-900 dark:text-rose-200">
            {!isPresynthesisApproved
              ? 'Mociones deshabilitadas — Los párrafos aún están pendientes de votación general de Presíntesis'
              : 'Mociones deshabilitadas en uno o más capítulos'}
          </span>
        </div>
      )}

      {/* Chapters Document Body */}
      <div className="space-y-6">
        {chaptersToDisplay.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-[#4A154B] dark:text-purple-300 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              No hay capítulos cargados en la Presíntesis aún
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              La plataforma está lista para el lanzamiento oficial. La Secretaría Técnica puede crear los capítulos y cargar los párrafos desde el panel del Plenario o la Mesa de Votaciones.
            </p>
            {isSecretariaTecnica && (
              <button
                onClick={() => setActiveTab('plenario')}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ir al Plenario a Configurar Capítulos</span>
              </button>
            )}
          </div>
        ) : (
          chaptersToDisplay.map((chapter) => {
          const paragraphs = chapter.paragraphs || [];
          const dissensusItems = chapter.dissensusItems || [];
          const chapterMotionsOpen = isChapterMotionsEnabled(chapter.id);

          return (
            <div 
              key={chapter.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5"
            >
              {/* Chapter Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-900 dark:text-purple-300 font-extrabold">
                    Capítulo {chapter.number} · Frente Estudiantil
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {chapter.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 ${
                    chapterMotionsOpen
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  }`}>
                    {!chapterMotionsOpen && <Lock className="w-3 h-3" />}
                    <span>{chapterMotionsOpen ? 'Mociones ON' : 'Mociones OFF'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {isPresynthesisApproved
                      ? `${paragraphs.filter(p => p.status !== 'SUPRIMIDO').length} párrafos ratificados`
                      : `${paragraphs.length} pendientes de Presíntesis`}
                  </span>
                </div>
              </div>

              {/* Section 1: Approved Paragraphs & Live Motions */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#4A154B] dark:text-purple-400" />
                    <span>{isPresynthesisApproved ? 'Articulado Consolidado del Capítulo' : 'Párrafos Presentados (Pendientes de Presíntesis)'}</span>
                  </h4>
                </div>

                <div className="space-y-3">
                  {paragraphs.map((p) => {
                    const isExtended = p.status === 'EXTENDIDO';
                    const isSuppressed = p.status === 'SUPRIMIDO';

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSuppressed
                            ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 opacity-60'
                            : isExtended
                              ? 'bg-purple-50/30 dark:bg-purple-950/35 border-purple-300 dark:border-purple-700 shadow-2xs'
                              : 'bg-slate-50/50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {/* Paragraph meta and status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-purple-950 dark:text-purple-300 font-mono font-black text-xs shadow-2xs">
                              § {p.number}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {p.title || (isPresynthesisApproved ? 'Párrafo Base Aprobado' : `Párrafo § ${p.number}`)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSuppressed && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-[10px] font-bold">
                                ✕ Suprimido por Moción ({p.appliedMotionCode || '2/3 calificado'})
                              </span>
                            )}
                            {isExtended && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 text-[10px] font-bold">
                                ✓ Extendido por Moción ({p.appliedMotionCode || '50%+1'})
                              </span>
                            )}
                            {!isSuppressed && !isExtended && (
                              isPresynthesisApproved ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                  ✓ Párrafo Aprobado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Pendiente Presíntesis</span>
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {/* Paragraph Text: Inline Diff if EXTENDIDO, strike-through if SUPRIMIDO, normal otherwise */}
                        {isExtended ? (
                          <div className="mt-1">
                            <InlineDiffViewer
                              original={p.originalText}
                              modified={p.modifiedText || p.extensionText}
                              showLegend={true}
                              className="text-xs sm:text-[13px]"
                            />
                          </div>
                        ) : (
                          <p className={`text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 ${isSuppressed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                            {p.originalText}
                          </p>
                        )}

                        {/* Interactive Motion Raising on Approved Paragraph: ONLY FOR DELEGATES WHEN UNLOCKED */}
                        {isDelegate && !isSuppressed && isPresynthesisApproved && chapterMotionsOpen && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              Levantar moción reglamentaria sobre este párrafo aprobado:
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenExtensive(chapter.id, p.id)}
                                className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-[#4A154B] dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Proponer moción extensiva para añadir redacción (50%+1)"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#4A154B] dark:text-purple-300" />
                                <span>Moción Extensiva (50%+1)</span>
                              </button>

                              <button
                                onClick={() => handleOpenSuppressive(chapter.id, p.id)}
                                className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Proponer moción supresiva para eliminar el párrafo (2/3)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Moción Supresiva (2/3)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Acuerdos de Disensos Resueltos Consolidados */}
              {dissensusItems.filter(d => d.status === 'RESUELTO').length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#4A154B] dark:text-purple-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Disensos Resueltos Incorporados al Capítulo</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Acuerdos definitivos dirimidos por el Plenario e integrados formalmente al articulado.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {dissensusItems.filter(d => d.status === 'RESUELTO').map(dis => {
                      const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;
                      if (!winObj) return null;
                      return (
                        <div key={dis.id} className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-100">
                            <span>{dis.title}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 text-[10px] font-mono font-black">
                              Acuerdo Plenario: Opción {dis.winner} ({winObj.label})
                            </span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed italic mt-1">
                            "{winObj.text}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })
      )}
      </div>

      {/* Reusable Launch Voting Modal */}
      <LaunchVotingModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false, tab: 'EXTENSIVA' })}
        defaultTab={modalState.tab}
        preselectedParagraph={modalState.preselectedParagraph}
      />

    </div>
  );
};
