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
  ShieldCheck
} from 'lucide-react';
import { LaunchVotingModal } from './LaunchVotingModal';
import { InlineDiffViewer } from '../../utils/textDiff';

export const TextoFinalView: React.FC = () => {
  const { 
    synthesisChapters, 
    motionsHistory,
    launchFinalSynthesisVote,
    exportFinalSynthesisPDF,
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
  const totalApproved = allParagraphs.filter(p => p.status !== 'SUPRIMIDO').length;
  const totalExtended = allParagraphs.filter(p => p.status === 'EXTENDIDO').length;
  const totalSuppressed = allParagraphs.filter(p => p.status === 'SUPRIMIDO').length;
  
  const allDissensus = (synthesisChapters || []).flatMap(ch => ch.dissensusItems || []);
  const totalDissensusResolved = allDissensus.filter(d => d.status === 'RESUELTO').length;

  const finalSynthesisMotion = motionsHistory.find(m => m.motionKind === 'GENERAL_SINTESIS_FINAL');

  const chaptersToDisplay = activeChapterIndex === 'ALL'
    ? (synthesisChapters || [])
    : [synthesisChapters[activeChapterIndex]].filter(Boolean);

  const handleOpenExtensive = (chapterId: string, paragraphId: string) => {
    if (!isDelegate) return;
    setModalState({
      open: true,
      tab: 'EXTENSIVA',
      preselectedParagraph: { chapterId, paragraphId }
    });
  };

  const handleOpenSuppressive = (chapterId: string, paragraphId: string) => {
    if (!isDelegate) return;
    setModalState({
      open: true,
      tab: 'SUPRESIVA',
      preselectedParagraph: { chapterId, paragraphId }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      
      {/* Top Banner & Control Center */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-[#4A154B] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Documento Oficial Consolidado</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Síntesis Nacional Final y Articulado Aprobado
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
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
              title="Exportar Síntesis Nacional Final consolidada en formato PDF oficial"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>Exportar Síntesis Final en PDF</span>
            </button>

            {/* Delegates only: Nueva Moción */}
            {isDelegate && (
              <button
                onClick={() => setModalState({ open: true, tab: 'EXTENSIVA' })}
                className="px-3.5 py-2 bg-gradient-to-r from-[#4A154B] to-[#6A1B6B] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Moción sobre Párrafo</span>
              </button>
            )}

            {/* Secretaría Técnica only: Ir a Mesa de Votaciones */}
            {isSecretariaTecnica && (
              <button
                onClick={() => setActiveTab('mesa-votaciones')}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#4A154B] border border-purple-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Ir a Mesa de Votaciones para tramitar mociones y lanzar votaciones"
              >
                <Vote className="w-4 h-4 text-[#4A154B]" />
                <span>Mesa de Votaciones</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider">
              Párrafos Aprobados
            </span>
            <div className="text-lg sm:text-xl font-black text-[#4A154B] mt-0.5">
              {totalApproved}
            </div>
            <span className="text-[10px] text-slate-500">En el texto oficial</span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
              Mociones Extensivas
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
              {totalExtended}
            </div>
            <span className="text-[10px] text-slate-500">+ Ampliaciones aprobadas (50%+1)</span>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-rose-900 tracking-wider">
              Mociones Supresivas
            </span>
            <div className="text-lg sm:text-xl font-black text-rose-700 mt-0.5">
              {totalSuppressed}
            </div>
            <span className="text-[10px] text-slate-500">✕ Párrafos excluidos (2/3)</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
              Disensos A/B/C Resueltos
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-700 mt-0.5">
              {totalDissensusResolved} / {allDissensus.length}
            </div>
            <span className="text-[10px] text-slate-500">Integrados al documento</span>
          </div>
        </div>

        {/* General Final Vote Trigger Callout */}
        <div className="p-3.5 bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-purple-950 font-black">
              <FileCheck className="w-4 h-4 text-purple-700" />
              <span>Votación General Solemne de la Síntesis Final</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Una vez cerradas todas las mociones y resueltos los disensos, el Plenario ratifica en general el texto definitivo por mayoría simple (50%+1).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSecretariaTecnica && (
              <button
                onClick={() => launchFinalSynthesisVote()}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Votar Síntesis Final (50%+1)</span>
              </button>
            )}
            {finalSynthesisMotion && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                finalSynthesisMotion.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : finalSynthesisMotion.status === 'VOTING'
                    ? 'bg-rose-100 text-rose-800 animate-pulse'
                    : 'bg-slate-100 text-slate-700'
              }`}>
                {finalSynthesisMotion.status === 'APPROVED' ? '✓ Aprobada' : finalSynthesisMotion.status === 'VOTING' ? '● En Votación' : 'Cerrada'}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Chapter Filter Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveChapterIndex('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeChapterIndex === 'ALL'
              ? 'bg-[#4A154B] text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
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
                ? 'bg-[#4A154B] text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            Capítulo {ch.number}
          </button>
        ))}
      </div>

      {/* Chapters Document Body */}
      <div className="space-y-6">
        {chaptersToDisplay.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#4A154B] flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">
              No hay capítulos cargados en la Presíntesis aún
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              La plataforma está lista para el lanzamiento oficial. La Secretaría Técnica puede crear los capítulos y cargar los párrafos desde el panel del Plenario o la Mesa de Votaciones.
            </p>
            {isSecretariaTecnica && (
              <button
                onClick={() => setActiveTab('plenario')}
                className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
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

          return (
            <div 
              key={chapter.id} 
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5"
            >
              {/* Chapter Header */}
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-900 font-extrabold">
                    Capítulo {chapter.number} · Frente Estudiantil
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {chapter.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {paragraphs.filter(p => p.status !== 'SUPRIMIDO').length} párrafos ratificados
                </span>
              </div>

              {/* Section 1: Approved Paragraphs & Live Motions */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#4A154B]" />
                    <span>Articulado Consolidado del Capítulo</span>
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
                            ? 'bg-rose-50/40 border-rose-200 opacity-60'
                            : isExtended
                              ? 'bg-purple-50/30 border-purple-300 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Paragraph meta and status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-purple-950 font-mono font-black text-xs shadow-2xs">
                              § {p.number}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {p.title || `Párrafo Base Aprobado`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSuppressed && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                                ✕ Suprimido por Moción ({p.appliedMotionCode || '2/3 calificado'})
                              </span>
                            )}
                            {isExtended && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                                ✓ Extendido por Moción ({p.appliedMotionCode || '50%+1'})
                              </span>
                            )}
                            {!isSuppressed && !isExtended && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                ✓ Párrafo Aprobado
                              </span>
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
                          <p className={`text-xs sm:text-[13px] leading-relaxed text-slate-700 ${isSuppressed ? 'line-through text-slate-400' : ''}`}>
                            {p.originalText}
                          </p>
                        )}

                        {/* Interactive Motion Raising on Approved Paragraph: ONLY FOR DELEGATES */}
                        {isDelegate && !isSuppressed && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-500 font-medium">
                              Levantar moción reglamentaria sobre este párrafo aprobado:
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenExtensive(chapter.id, p.id)}
                                className="px-3 py-1 bg-white hover:bg-purple-50 text-[#4A154B] border border-purple-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Proponer moción extensiva para añadir redacción (50%+1)"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#4A154B]" />
                                <span>Moción Extensiva (50%+1)</span>
                              </button>

                              <button
                                onClick={() => handleOpenSuppressive(chapter.id, p.id)}
                                className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Proponer moción supresiva para eliminar el párrafo (2/3)"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#4A154B] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Disensos Resueltos Incorporados al Capítulo</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Acuerdos definitivos dirimidos por el Plenario e integrados formalmente al articulado.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {dissensusItems.filter(d => d.status === 'RESUELTO').map(dis => {
                      const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;
                      if (!winObj) return null;
                      return (
                        <div key={dis.id} className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-emerald-950">
                            <span>{dis.title}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-mono font-black">
                              Acuerdo Plenario: Opción {dis.winner} ({winObj.label})
                            </span>
                          </div>
                          <p className="text-slate-800 leading-relaxed italic mt-1">
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
