import React, { useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  FileText, 
  Check, 
  AlertCircle, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Vote, 
  Sparkles, 
  Layers, 
  RotateCw, 
  Scale,
  Edit2,
  FolderPlus,
  Radio,
  FileCheck,
  Info,
  Clock,
  XCircle,
  ArrowUpRight,
  Lock,
  Download
} from 'lucide-react';
import { PresynthesisParagraph, DissensusItem, Motion } from '../../types/plenario';
import { InlineDiffViewer, validateExtensiveEdit } from '../../utils/textDiff';
import { exportMotionCertificatePDF } from '../../utils/exportMotionCertificatePDF';

export const SintesisBox: React.FC = () => {
  const { 
    synthesisChapters, 
    isPresynthesisApproved,
    activeMotion,
    activeVotingMotion,
    motionsHistory,
    setActiveMotionId,
    proposeExtensiveMotion,
    proposeSuppressiveMotion,
    launchGeneralPresynthesisVote,
    addChapter,
    updateChapter,
    deleteChapter,
    addParagraphToChapter,
    updateParagraphInChapter,
    deleteParagraphFromChapter,
    isChapterMotionsEnabled,
    currentUser,
    isSecretariaTecnica,
    isDelegate
  } = usePlenario();

  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'EN_VOTACION' | 'PARRAFOS_PRESENTADOS'>('EN_VOTACION');
  const [submittedMotionCert, setSubmittedMotionCert] = useState<Motion | null>(null);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const handleDownloadMotionCertificate = async (motion: Motion) => {
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

  // Modals for Delegates (Mociones)
  const [extensiveModal, setExtensiveModal] = useState<{
    open: boolean;
    paragraph: PresynthesisParagraph | null;
    chapterId: string;
    extensionText: string;
    title: string;
  }>({
    open: false,
    paragraph: null,
    chapterId: '',
    extensionText: '',
    title: ''
  });

  const [suppressiveModal, setSuppressiveModal] = useState<{
    open: boolean;
    paragraph: PresynthesisParagraph | null;
    chapterId: string;
  }>({
    open: false,
    paragraph: null,
    chapterId: ''
  });

  // Modals for Secretaría Técnica (Cargar Presíntesis)
  const [addParagraphModal, setAddParagraphModal] = useState(false);
  const [newParaNumber, setNewParaNumber] = useState('');
  const [newParaTitle, setNewParaTitle] = useState('');
  const [newParaText, setNewParaText] = useState('');

  const [addChapterModal, setAddChapterModal] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState(synthesisChapters.length + 1);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  const [editChapterModal, setEditChapterModal] = useState<{
    open: boolean;
    chapterId: string;
    number: number;
    title: string;
  }>({
    open: false,
    chapterId: '',
    number: 1,
    title: ''
  });

  const [deleteChapterModal, setDeleteChapterModal] = useState<{
    open: boolean;
    chapterId: string;
    number: number;
    title: string;
    paragraphCount: number;
    dissensusCount: number;
  }>({
    open: false,
    chapterId: '',
    number: 1,
    title: '',
    paragraphCount: 0,
    dissensusCount: 0
  });

  const [editParagraphModal, setEditParagraphModal] = useState<{
    open: boolean;
    paragraph: PresynthesisParagraph | null;
    chapterId: string;
    text: string;
    title: string;
  }>({
    open: false,
    paragraph: null,
    chapterId: '',
    text: '',
    title: ''
  });

  const hasChapters = synthesisChapters.length > 0;
  const safeChapterIndex = Math.min(activeChapterIndex, Math.max(0, synthesisChapters.length - 1));
  const currentChapter = synthesisChapters[safeChapterIndex] || {
    id: 'ch-1',
    number: 1,
    title: 'Sin Capítulos Creados',
    paragraphs: [],
    dissensusItems: [],
    lastModifiedBy: 'Secretaría',
    lastModifiedAt: Date.now()
  };

  const paragraphs = currentChapter?.paragraphs || [];
  const dissensusItems = currentChapter?.dissensusItems || [];

  const generalPresintesisMotion = motionsHistory.find(m => m.motionKind === 'GENERAL_PRESINTESIS');
  const liveVotingMotion = activeVotingMotion || (activeMotion?.status === 'VOTING' ? activeMotion : null);
  const isVotingActive = !!liveVotingMotion;

  const currentChapterMotionsAllowed = isChapterMotionsEnabled(hasChapters ? currentChapter.id : undefined);
  const canProposeChapterMotions = isPresynthesisApproved && currentChapterMotionsAllowed;

  // Delegate handlers
  const handleOpenExtensive = (p: PresynthesisParagraph) => {
    if (!isDelegate || !canProposeChapterMotions) return;
    setExtensiveModal({
      open: true,
      paragraph: p,
      chapterId: currentChapter?.id || '',
      extensionText: p.modifiedText || p.originalText,
      title: `Moción Extensiva: Ampliación Párrafo ${p.number}`
    });
  };

  const handleSubmitExtensive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensiveModal.paragraph || !isPresynthesisApproved || !isChapterMotionsEnabled(extensiveModal.chapterId)) return;
    const val = validateExtensiveEdit(extensiveModal.paragraph.originalText, extensiveModal.extensionText);
    if (!val.isValid) return;
    const created = proposeExtensiveMotion(
      extensiveModal.chapterId,
      extensiveModal.paragraph.id,
      extensiveModal.extensionText.trim(),
      extensiveModal.title.trim()
    );
    setExtensiveModal({ open: false, paragraph: null, chapterId: '', extensionText: '', title: '' });
    if (created) {
      setSubmittedMotionCert(created);
    }
  };

  const handleOpenSuppressive = (p: PresynthesisParagraph) => {
    if (!isDelegate || !canProposeChapterMotions) return;
    setSuppressiveModal({
      open: true,
      paragraph: p,
      chapterId: currentChapter.id
    });
  };

  const handleConfirmSuppressive = () => {
    if (!suppressiveModal.paragraph || !isPresynthesisApproved || !isChapterMotionsEnabled(suppressiveModal.chapterId)) return;
    const created = proposeSuppressiveMotion(
      suppressiveModal.chapterId,
      suppressiveModal.paragraph.id
    );
    setSuppressiveModal({ open: false, paragraph: null, chapterId: '' });
    if (created) {
      setSubmittedMotionCert(created);
    }
  };

  // Secretaría Técnica handlers
  const handleAddParagraphSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPresynthesisApproved) return;
    if (!newParaNumber.trim() || !newParaText.trim()) return;
    addParagraphToChapter(currentChapter.id, newParaNumber.trim(), newParaText.trim(), newParaTitle.trim() || undefined);
    setNewParaNumber('');
    setNewParaTitle('');
    setNewParaText('');
    setAddParagraphModal(false);
  };

  const handleOpenAddChapter = () => {
    const nextNum = synthesisChapters.reduce((max, ch) => Math.max(max, ch.number), 0) + 1;
    setNewChapterNumber(nextNum);
    setNewChapterTitle('');
    setAddChapterModal(true);
  };

  const handleAddChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    addChapter(Number(newChapterNumber), newChapterTitle.trim());
    setNewChapterTitle('');
    setNewChapterNumber(synthesisChapters.reduce((max, ch) => Math.max(max, ch.number), 0) + 2);
    setAddChapterModal(false);
    setActiveChapterIndex(synthesisChapters.length);
  };

  const handleOpenEditChapter = () => {
    if (!hasChapters) return;
    setEditChapterModal({
      open: true,
      chapterId: currentChapter.id,
      number: currentChapter.number,
      title: currentChapter.title
    });
  };

  const handleSaveEditChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChapterModal.chapterId || !editChapterModal.title.trim()) return;
    updateChapter(
      editChapterModal.chapterId,
      Number(editChapterModal.number),
      editChapterModal.title.trim()
    );
    setEditChapterModal({ open: false, chapterId: '', number: 1, title: '' });
  };

  const handleOpenDeleteChapter = () => {
    if (!hasChapters) return;
    setDeleteChapterModal({
      open: true,
      chapterId: currentChapter.id,
      number: currentChapter.number,
      title: currentChapter.title,
      paragraphCount: (currentChapter.paragraphs || []).length,
      dissensusCount: (currentChapter.dissensusItems || []).length
    });
  };

  const handleConfirmDeleteChapter = () => {
    if (!deleteChapterModal.chapterId) return;
    deleteChapter(deleteChapterModal.chapterId);
    setDeleteChapterModal({
      open: false,
      chapterId: '',
      number: 1,
      title: '',
      paragraphCount: 0,
      dissensusCount: 0
    });
    setActiveChapterIndex(prev => Math.max(0, Math.min(prev, synthesisChapters.length - 2)));
  };

  const handleOpenEditParagraph = (p: PresynthesisParagraph) => {
    setEditParagraphModal({
      open: true,
      paragraph: p,
      chapterId: currentChapter.id,
      text: p.originalText,
      title: p.title || ''
    });
  };

  const handleSaveEditParagraph = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParagraphModal.paragraph || !editParagraphModal.text.trim()) return;
    updateParagraphInChapter(
      editParagraphModal.chapterId,
      editParagraphModal.paragraph.id,
      editParagraphModal.text.trim(),
      editParagraphModal.title.trim()
    );
    setEditParagraphModal({ open: false, paragraph: null, chapterId: '', text: '', title: '' });
  };

  return (
    <div className="flex flex-col h-[520px] md:h-full w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Top Bar: Subtabs Switcher */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-r from-slate-50 via-purple-50/20 to-slate-50 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs w-fit max-w-full">
          
          {/* Subtab 1: En Votación Actual */}
          <button
            onClick={() => setViewMode('EN_VOTACION')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'EN_VOTACION'
                ? 'bg-[#4A154B] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isVotingActive ? 'text-rose-400 animate-pulse' : 'text-purple-200'}`} />
            <span>1. En Votación Actual</span>
            <span className={`text-[10px] py-0.2 px-1.5 rounded font-mono font-bold ${
              isVotingActive ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}>
              {isVotingActive ? 'En Sala' : 'Acuerdos Base'}
            </span>
          </button>

          {/* Subtab 2: Párrafos Presentados del Capítulo */}
          <button
            onClick={() => setViewMode('PARRAFOS_PRESENTADOS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'PARRAFOS_PRESENTADOS'
                ? 'bg-[#4A154B] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>2. Párrafos Presentados</span>
            <span className="text-[10px] py-0.2 px-1.5 rounded bg-purple-100 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200 font-mono font-bold hidden sm:inline">
              Mociones y Tramitación
            </span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: EN VOTACIÓN ACTUAL (ACUERDOS BASE) */}
      {viewMode === 'EN_VOTACION' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          
          {isVotingActive && liveVotingMotion ? (
            /* ACTIVE VOTING IN PROGRESS: MUESTRA DIRECTAMENTE LA MATERIA EN VOTACIÓN */
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Encabezado uniforme de votación en curso */}
              <div className="p-3.5 bg-gradient-to-r from-[#4A154B] to-[#681D69] text-white rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-purple-200">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                      ● En Votación en Sala
                    </span>
                    <span>[{liveVotingMotion.code}]</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                    {liveVotingMotion.title}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-[10px] font-black uppercase tracking-wider shrink-0 self-start sm:self-center">
                  Quórum: {liveVotingMotion.quorumType === 'TWO_THIRDS' ? '2/3 Calificado' : liveVotingMotion.quorumType === 'ABSOLUTE_MAJORITY' ? 'Mayoría Absoluta (>50%)' : '50% + 1'}
                </span>
              </div>

              {/* Case 1: General Presynthesis Vote */}
              {liveVotingMotion.motionKind === 'GENERAL_PRESINTESIS' && (
                <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide">
                    <FileCheck className="w-4 h-4 text-[#4A154B] dark:text-purple-300" />
                    <span>Materia en Votación: Presíntesis Regional en General</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {liveVotingMotion.description || 'Se somete a votación general única (50%+1) el documento base consolidado de las discusiones regionales. Al ser aprobada en general, se dará inicio a la votación de disensos y presentación de mociones reglamentarias.'}
                  </p>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#4A154B] dark:text-purple-300 block text-[11px]">Capítulos de la Presíntesis a Ratificar:</span>
                    {synthesisChapters.length === 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Marco general de Presíntesis Regional (sin capítulos cargados aún en el visor).
                      </p>
                    ) : (
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-0.5 pl-1">
                        {synthesisChapters.map(ch => (
                          <li key={ch.id}>Cap. {ch.number}: {ch.title} ({ch.paragraphs.length} párrafos base)</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Case 2: Dissensus Round 1 (Opciones A, B, C) */}
              {liveVotingMotion.motionKind === 'DISENSO_PRIMERA_VUELTA' && liveVotingMotion.dissensusOptions && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Propuestas Reglamentarias en Disenso (1ª Vuelta · Opciones A, B y C)</span>
                    </div>
                    {liveVotingMotion.description && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                        {liveVotingMotion.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Opción A */}
                    <div className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-[#0284C7] dark:text-sky-400 uppercase">Opción A: {liveVotingMotion.dissensusOptions.a.label || 'Visión Uno'}</span>
                        <span className="text-[10px] bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                          {liveVotingMotion.dissensusOptions.a.originRegion || liveVotingMotion.dissensusOptions.a.region || 'Regional'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-snug">
                        {liveVotingMotion.dissensusOptions.a.text}
                      </p>
                    </div>

                    {/* Opción B */}
                    <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-[#D97706] dark:text-amber-400 uppercase">Opción B: {liveVotingMotion.dissensusOptions.b.label || 'Visión Dos'}</span>
                        <span className="text-[10px] bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                          {liveVotingMotion.dissensusOptions.b.originRegion || liveVotingMotion.dissensusOptions.b.region || 'Regional'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-snug">
                        {liveVotingMotion.dissensusOptions.b.text}
                      </p>
                    </div>

                    {/* Opción C */}
                    <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-[#059669] dark:text-emerald-400 uppercase">Opción C: {liveVotingMotion.dissensusOptions.c.label || 'Visión de Consenso'}</span>
                        <span className="text-[10px] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                          {liveVotingMotion.dissensusOptions.c.originRegion || liveVotingMotion.dissensusOptions.c.region || 'Consenso'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-snug">
                        {liveVotingMotion.dissensusOptions.c.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: Dissensus Round 2 (Balotaje con texto completo de las 2 opciones) */}
              {liveVotingMotion.motionKind === 'DISENSO_SEGUNDA_VUELTA' && liveVotingMotion.runoffOptions && (
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                    <RotateCw className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                    <span>Balotaje de 2ª Vuelta: Opción {liveVotingMotion.runoffOptions[0]} vs Opción {liveVotingMotion.runoffOptions[1]}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Al no alcanzarse mayoría absoluta (&gt;50%) en primera vuelta, pasan a definición dirimente por 50%+1 las dos primeras mayorías:
                  </p>
                  {liveVotingMotion.dissensusOptions && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {liveVotingMotion.runoffOptions.map((optKey) => {
                        const optObj = optKey === 'A' ? liveVotingMotion.dissensusOptions!.a : optKey === 'B' ? liveVotingMotion.dissensusOptions!.b : liveVotingMotion.dissensusOptions!.c;
                        const style = optKey === 'A'
                          ? 'border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900'
                          : optKey === 'B'
                            ? 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900'
                            : 'border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900';
                        const titleColor = optKey === 'A' ? 'text-[#0284C7] dark:text-sky-400' : optKey === 'B' ? 'text-[#D97706] dark:text-amber-400' : 'text-[#059669] dark:text-emerald-400';
                        return (
                          <div key={optKey} className={`p-3.5 rounded-xl border text-xs space-y-1.5 shadow-2xs ${style}`}>
                            <div className="flex items-center justify-between gap-1">
                              <span className={`font-black uppercase ${titleColor}`}>
                                Opción {optKey}: {optObj.label || 'Propuesta'}
                              </span>
                              <span className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                                {optObj.originRegion || optObj.region || 'Regional'}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-snug">{optObj.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Case 4: Moción Extensiva */}
              {liveVotingMotion.motionKind === 'MOCION_EXTENSIVA' && (
                <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#4A154B] dark:text-purple-300" />
                      <span>Moción Extensiva sobre Párrafo § {liveVotingMotion.targetParagraphNumber} (50%+1)</span>
                    </span>
                    <span className="text-[10px] text-purple-900 dark:text-purple-300 font-mono font-bold">
                      Presentada por: {liveVotingMotion.proposedBy}
                    </span>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs space-y-2 shadow-2xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[10px] uppercase">
                      Texto con Reemplazo Extensivo (Palabras agregadas en morado / palabras borradas en rojo):
                    </span>
                    <InlineDiffViewer
                      original={liveVotingMotion.originalParagraphText || ''}
                      modified={liveVotingMotion.proposedEditedText || liveVotingMotion.proposedExtensionText || ''}
                      showLegend={true}
                      className="text-xs sm:text-[13px] leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Case 5: Moción Supresiva */}
              {liveVotingMotion.motionKind === 'MOCION_SUPRESIVA' && (
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      <span>Moción Supresiva para Eliminar Párrafo § {liveVotingMotion.targetParagraphNumber} (Quórum 2/3)</span>
                    </span>
                    <span className="text-[10px] text-rose-900 dark:text-rose-300 font-mono font-bold">
                      Presentada por: {liveVotingMotion.proposedBy}
                    </span>
                  </div>

                  {liveVotingMotion.originalParagraphText && (
                    <div className="p-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 italic">
                      <span className="font-bold text-rose-800 dark:text-rose-300 block text-[10px] uppercase mb-0.5">Párrafo que se propone suprimir:</span>
                      "{liveVotingMotion.originalParagraphText}"
                    </div>
                  )}
                </div>
              )}

              {/* Case 6: General Final Synthesis Vote */}
              {liveVotingMotion.motionKind === 'GENERAL_SINTESIS_FINAL' && (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Votación Solemne de la Síntesis Final Consolidada</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {liveVotingMotion.description || 'El Plenario ratifica en general el texto definitivo consolidado (50%+1), el cual incorpora todos los acuerdos, mociones y disensos resueltos.'}
                  </p>
                </div>
              )}

              {/* Case 7: Moción General Personalizada / Ordinaria */}
              {liveVotingMotion.motionKind === 'MOCION_ORDINARIA' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#4A154B] dark:text-purple-300" />
                      <span>Moción General / Resolutivo de Sala</span>
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold">
                      Presentada por: {liveVotingMotion.proposedBy}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs">
                    <span className="font-bold text-[#4A154B] dark:text-purple-300 block text-[10px] uppercase mb-1">
                      Inciso Resolutivo en Votación ({liveVotingMotion.quorumType === 'TWO_THIRDS' ? 'Quórum 2/3 Calificado' : 'Mayoría Simple 50% + 1'}):
                    </span>
                    <p className="whitespace-pre-line">{liveVotingMotion.description}</p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* NO ACTIVE VOTE IN PROGRESS: INFORMACIÓN DE AGENDA Y DISPONIBILIDAD */
            <div className="space-y-4">
              <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-[#4A154B] dark:text-purple-300 flex items-center justify-center mx-auto">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    No Hay Ninguna Votación Activa en Este Momento
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    La cabina de acuerdos base muestra estrictamente lo que se somete a votación en sala en tiempo real.
                  </p>
                </div>

                {/* If user is Secretaría Técnica, allow launching the next voting item */}
                {isSecretariaTecnica && !isPresynthesisApproved && (
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => launchGeneralPresynthesisVote()}
                      className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>Lanzar Votación General de la Presíntesis (50%+1)</span>
                    </button>
                  </div>
                )}

                {isDelegate && (
                  <p className="text-[11px] text-purple-900 dark:text-purple-300 font-medium">
                    Consulte la pestaña <strong>"2. Párrafos Presentados"</strong> para revisar el articulado, el estado de tramitación y presentar mociones extensivas o supresivas.
                  </p>
                )}
              </div>

              {/* Metodología de Discusión en 4 Fases */}
              <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide">
                  <Scale className="w-4 h-4 text-[#4A154B] dark:text-purple-300" />
                  <span>Metodología de Discusión del Plenario</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
                    <span className="font-black text-[#4A154B] dark:text-purple-300 block text-[11px]">1. Votar Presíntesis</span>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
                      Se vota una sola vez al empezar la discusión en general (50%+1), no por párrafos.
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                    <span className="font-black text-amber-700 dark:text-amber-400 block text-[11px]">2. Votar Disensos</span>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
                      Mediante opciones A, B y C. Requiere mayoría absoluta (&gt;50%) o balotaje entre las 2 primeras.
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1">
                    <span className="font-black text-indigo-700 dark:text-indigo-400 block text-[11px]">3. Mociones de Delegados</span>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
                      Extensivas (50%+1) y supresivas (2/3) exclusivamente sobre párrafos ya aprobados.
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 block text-[11px]">4. Síntesis Final</span>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
                      Ratificación solemne del texto definitivo consolidado con todas las resoluciones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 2: PÁRRAFOS PRESENTADOS DEL CAPÍTULO (INCLUYENDO APROBADOS Y MOCIONES EXTENSIVAS / SUPRESIVAS) */}
      {viewMode === 'PARRAFOS_PRESENTADOS' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 dark:text-slate-100">
                  <FileText className="w-4 h-4 text-[#4A154B] dark:text-purple-300" />
                  <span>Capítulo:</span>
                </div>
                <select
                  value={safeChapterIndex}
                  onChange={(e) => setActiveChapterIndex(Number(e.target.value))}
                  disabled={!hasChapters}
                  className="text-xs font-bold text-purple-950 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#4A154B] cursor-pointer shadow-2xs max-w-xs truncate disabled:opacity-60"
                >
                  {!hasChapters ? (
                    <option value={0}>Sin capítulos creados aún</option>
                  ) : (
                    synthesisChapters.map((ch, idx) => (
                      <option key={ch.id} value={idx}>
                        Cap. {ch.number}: {ch.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isPresynthesisApproved
                  ? 'Párrafos aprobados en la Presíntesis y disensos del capítulo, junto con las mociones ingresadas y su estado de tramitación.'
                  : 'Párrafos presentados y disensos del capítulo en espera de votación general de la Presíntesis (aún no están aprobados).'}
              </p>
            </div>

            {/* Actions for Secretaría Técnica: Cargar Capítulos y Párrafos */}
            {isSecretariaTecnica && (
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => !isPresynthesisApproved && setAddParagraphModal(true)}
                  disabled={!hasChapters || isPresynthesisApproved}
                  className="px-3 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title={
                    isPresynthesisApproved
                      ? 'La Presíntesis ya fue aprobada en general; no se permite cargar nuevos párrafos.'
                      : hasChapters
                        ? 'Cargar nuevo párrafo a este capítulo de la Presíntesis'
                        : 'Cree primero un capítulo para cargar párrafos'
                  }
                >
                  {isPresynthesisApproved ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isPresynthesisApproved ? 'Carga Cerrada' : 'Cargar Párrafo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddChapter}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-purple-950 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Crear un nuevo capítulo en la Presíntesis"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-purple-800 dark:text-purple-300" />
                  <span>Nuevo Capítulo</span>
                </button>

                {hasChapters && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenEditChapter}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                      title={`Editar Capítulo ${currentChapter.number}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>Editar Cap.</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenDeleteChapter}
                      className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                      title={`Eliminar Capítulo ${currentChapter.number}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Eliminar Cap.</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {(() => {
            const matchesParagraph = (m: Motion, p: PresynthesisParagraph) =>
              Boolean(m.code && p.appliedMotionCode === m.code) ||
              (m.targetParagraphId
                ? m.targetParagraphId === p.id
                : m.targetParagraphNumber === p.number);

            const chapterMotions = motionsHistory.filter(m => 
              (m.motionKind === 'MOCION_EXTENSIVA' || m.motionKind === 'MOCION_SUPRESIVA') &&
              paragraphs.some(p => matchesParagraph(m, p))
            );
            const extensiveCount = chapterMotions.filter(m => m.motionKind === 'MOCION_EXTENSIVA').length;
            const suppressiveCount = chapterMotions.filter(m => m.motionKind === 'MOCION_SUPRESIVA').length;
            const inVotingCount = chapterMotions.filter(m => m.status === 'VOTING').length;
            const draftCount = chapterMotions.filter(m => m.status === 'DRAFT').length;
            const approvedCount = chapterMotions.filter(m => m.status === 'APPROVED').length;

            const getMotionTramitacionBadge = (motion: Motion) => {
              switch (motion.status) {
                case 'VOTING':
                  return {
                    label: 'En Votación en Sala',
                    pill: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 animate-pulse',
                    desc: 'Moción actualmente abierta en sala plenaria para sufragio vinculante.',
                    icon: Radio
                  };
                case 'APPROVED':
                  return {
                    label: 'Aprobada en Plenario · Aplicada al Texto',
                    pill: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
                    desc: 'Aprobada por quórum reglamentario e incorporada a la redacción definitiva.',
                    icon: CheckCircle2
                  };
                case 'REJECTED':
                  return {
                    label: 'Rechazada en Plenario · Desestimada',
                    pill: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                    desc: 'Sometida a votación pero no alcanzó el quórum reglamentario requerido.',
                    icon: XCircle
                  };
                case 'DRAFT':
                default:
                  return {
                    label: 'Presentada · Pendiente Aprobación de Mesa Técnica',
                    pill: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800',
                    desc: 'Presentada formalmente por delegación regional. Requiere ser aprobada por la Secretaría Técnica para ponerse a votación.',
                    icon: Clock
                  };
              }
            };

            return (
              <>
                {/* Chapter Summary Metrics: Párrafos y Estado de Tramitación */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                      Párrafos Presentados
                    </span>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {paragraphs.length} párrafos
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">En este capítulo</span>
                  </div>

                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-200 tracking-wider block">
                      Mociones Extensivas
                    </span>
                    <div className="text-base font-black text-[#4A154B] dark:text-purple-300 mt-0.5">
                      {extensiveCount} ingresadas
                    </div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300/80">Pretenden agregar texto (50%+1)</span>
                  </div>

                  <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-rose-900 dark:text-rose-200 tracking-wider block">
                      Mociones Supresivas
                    </span>
                    <div className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">
                      {suppressiveCount} ingresadas
                    </div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-300/80">Pretenden eliminar párrafos (2/3)</span>
                  </div>

                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200 tracking-wider block">
                      Estado de Tramitación
                    </span>
                    <div className="text-base font-black text-amber-800 dark:text-amber-300 mt-0.5">
                      {inVotingCount > 0 ? `${inVotingCount} en votación` : `${draftCount} pendientes`}
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300/80">
                      {approvedCount} aprobadas · {inVotingCount} en sala
                    </span>
                  </div>
                </div>

                {/* Single Motions Disabled Header */}
                {hasChapters && (!isPresynthesisApproved || !currentChapterMotionsAllowed) && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-950 dark:text-rose-100">
                    <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="font-black uppercase text-[11px] tracking-wide text-rose-900 dark:text-rose-200">
                      {!isPresynthesisApproved
                        ? 'Mociones deshabilitadas — Pendiente votación general de Presíntesis'
                        : `Mociones deshabilitadas — Capítulo ${currentChapter.number}`}
                    </span>
                  </div>
                )}

                {/* List of Presented Paragraphs */}
                <div className="space-y-3.5">
                  {!hasChapters ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Configuración Inicial de la Presíntesis</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Aún no existen capítulos cargados en la Presíntesis. La Secretaría Técnica debe crear el primer capítulo para incorporar párrafos.
                      </p>
                      {isSecretariaTecnica && (
                        <button
                          type="button"
                          onClick={handleOpenAddChapter}
                          className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Crear Primer Capítulo</span>
                        </button>
                      )}
                    </div>
                  ) : paragraphs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {isPresynthesisApproved
                          ? 'No hay párrafos cargados en este capítulo (Presíntesis aprobada: carga de nuevos párrafos cerrada).'
                          : 'No hay párrafos cargados en este capítulo.'}
                      </p>
                      {isSecretariaTecnica && !isPresynthesisApproved && (
                        <button
                          onClick={() => setAddParagraphModal(true)}
                          className="px-3.5 py-1.5 bg-[#4A154B] text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cargar Primer Párrafo
                        </button>
                      )}
                    </div>
                  ) : (
                    paragraphs.map((p) => {
                      const isExtended = p.status === 'EXTENDIDO';
                      const isSuppressed = p.status === 'SUPRIMIDO';

                      const motionsForParagraph = motionsHistory.filter(m => 
                        (m.motionKind === 'MOCION_EXTENSIVA' || m.motionKind === 'MOCION_SUPRESIVA') &&
                        matchesParagraph(m, p)
                      );

                      return (
                        <div
                          key={p.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isSuppressed
                              ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70 opacity-75'
                              : isExtended
                                ? 'bg-purple-50/30 dark:bg-purple-950/25 border-purple-300 dark:border-purple-800 shadow-2xs'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                          }`}
                        >
                          {/* Header and status */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-black text-xs border border-slate-200 dark:border-slate-700">
                                § {p.number}
                              </span>
                              {p.title && (
                                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                                  {p.title}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isSuppressed && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-[10px] font-bold">
                                  ✕ Suprimido ({p.appliedMotionCode || '2/3 calificado'})
                                </span>
                              )}
                              {isExtended && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 text-[10px] font-bold">
                                  ✓ Extendido ({p.appliedMotionCode || '50%+1'})
                                </span>
                              )}
                              {!isSuppressed && !isExtended && (
                                isPresynthesisApproved ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                    ✓ Párrafo Base Aprobado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Pendiente Votación Presíntesis</span>
                                  </span>
                                )
                              )}
                            </div>
                          </div>

                          {/* Paragraph Content */}
                          {isExtended ? (
                            <div className="mt-1">
                              <InlineDiffViewer
                                original={p.originalText}
                                modified={p.modifiedText || p.extensionText}
                                showLegend={true}
                                className="text-xs leading-relaxed"
                              />
                            </div>
                          ) : (
                            <p className={`text-xs leading-relaxed ${isSuppressed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                              {p.originalText}
                            </p>
                          )}

                          {/* SECTION: MOCIONES PRESENTADAS SOBRE ESTE PÁRRAFO Y ESTADO DE TRAMITACIÓN */}
                          {motionsForParagraph.length > 0 ? (
                            <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#4A154B] dark:text-purple-300" />
                                  <span>Mociones Ingresadas sobre § {p.number} ({motionsForParagraph.length})</span>
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  Estado de tramitación parlamentaria
                                </span>
                              </div>

                              <div className="space-y-2">
                                {motionsForParagraph.map((m) => {
                                  const isExt = m.motionKind === 'MOCION_EXTENSIVA';
                                  const isSup = m.motionKind === 'MOCION_SUPRESIVA';
                                  const statusInfo = getMotionTramitacionBadge(m);
                                  const StatusIcon = statusInfo.icon;

                                  return (
                                    <div 
                                      key={m.id}
                                      className={`p-3 rounded-xl border text-xs transition-all ${
                                        isExt 
                                          ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80' 
                                          : 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80'
                                      }`}
                                    >
                                      {/* Header of motion card */}
                                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black border ${
                                            isExt ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800' : 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                          }`}>
                                            {m.code}
                                          </span>
                                          <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                                            {isExt ? 'Moción Extensiva (Pretende agregar/modificar)' : 'Moción Supresiva (Pretende eliminar)'}
                                          </span>
                                        </div>

                                        {/* Estado de tramitación */}
                                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 ${statusInfo.pill}`}>
                                          <StatusIcon className="w-3 h-3 shrink-0" />
                                          <span>{statusInfo.label}</span>
                                        </div>
                                      </div>

                                      {/* Title & Proposer */}
                                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                        {m.title}
                                      </div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Presentada por: <strong className="text-slate-700 dark:text-slate-200">{m.proposedBy}</strong> · Quórum: <strong className="text-slate-700 dark:text-slate-200">{m.quorumType === 'TWO_THIRDS' ? '2/3 Calificado' : 'Mayoría Simple (50%+1)'}</strong>
                                      </div>

                                      {/* Content Preview */}
                                      {isExt && (
                                        <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-800/60">
                                          <div className="text-[10px] font-black text-purple-900 dark:text-purple-200 uppercase tracking-tight mb-1">
                                            Texto que pretende agregar / modificar:
                                          </div>
                                          {m.proposedEditedText ? (
                                            <InlineDiffViewer
                                              original={m.originalParagraphText || p.originalText}
                                              modified={m.proposedEditedText}
                                              showLegend={false}
                                              className="text-[11px] leading-relaxed"
                                            />
                                          ) : (
                                            <p className="text-[11px] text-purple-950 dark:text-purple-200 font-medium italic">
                                              «{m.proposedExtensionText}»
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {isSup && (
                                        <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-rose-100 dark:border-rose-800/60 flex items-center gap-2 text-rose-900 dark:text-rose-200 text-[11px]">
                                          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                          <span>Pretende la <strong>eliminación total</strong> de este párrafo del texto definitivo de Síntesis Final.</span>
                                        </div>
                                      )}

                                      {/* Botón para descargar certificado y ver en cabina de votación */}
                                      <div className="mt-2 pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate max-w-xs">
                                          {statusInfo.desc}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {(isExt || isSup) && (
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadMotionCertificate(m)}
                                              disabled={downloadingCertId === m.id}
                                              className="px-2 py-1 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs disabled:opacity-60"
                                              title="Descargar certificado institucional oficial en PDF de esta moción"
                                            >
                                              <Download className="w-3 h-3 text-amber-300" />
                                              <span>{downloadingCertId === m.id ? 'Generando...' : 'Certificado PDF'}</span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setActiveMotionId(m.id)}
                                            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs shrink-0"
                                            title="Visualizar o votar esta moción en la cabina de votación"
                                          >
                                            <span>Ver en Cabina</span>
                                            <ArrowUpRight className="w-3 h-3 text-[#4A154B] dark:text-purple-300" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                {isPresynthesisApproved ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Sin mociones presentadas sobre este párrafo (Texto base aprobado en general vigente)</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    <span>Párrafo presentado · Pendiente de aprobación en la votación general de Presíntesis</span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Actions Bar: Only show delegate motions when unlocked & Presíntesis approved */}
                          {((isDelegate && !isSuppressed && canProposeChapterMotions) || isSecretariaTecnica) && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                              
                              {/* ONLY DELEGATES CAN PROPOSE MOTIONS (when unlocked) */}
                              {isDelegate && !isSuppressed && canProposeChapterMotions && (
                                <div className="flex flex-wrap items-center gap-2 ml-auto">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    Proponer sobre § {p.number}:
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenExtensive(p)}
                                    className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#4A154B] dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Proponer moción extensiva para agregar texto complementario (Quórum 50%+1)"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-[#4A154B] dark:text-purple-300" />
                                    <span>+ Moción Extensiva (50%+1)</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenSuppressive(p)}
                                    className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Proponer moción supresiva para eliminar el párrafo (Quórum 2/3)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    <span>✕ Moción Supresiva (2/3)</span>
                                  </button>
                                </div>
                              )}

                              {/* SECRETARÍA TÉCNICA CANNOT PRESENT MOTIONS - HAS EDIT & DELETE CONTROLS */}
                              {isSecretariaTecnica && (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                    Gestión de Presíntesis (Secretaría Técnica no presenta mociones)
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditParagraph(p)}
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                      <span>Editar Párrafo</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => deleteParagraphFromChapter(currentChapter.id, p.id)}
                                      className="px-2 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Eliminar párrafo de la Presíntesis"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                      <span>Eliminar Párrafo</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}

          {/* Section: All Dissensuses in this Chapter (sin opción de presentar mociones) */}
          {dissensusItems.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#4A154B] dark:text-purple-300">
                  <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Disensos del Capítulo ({dissensusItems.length})</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Se resuelven por votación A/B/C · No admiten mociones extensivas ni supresivas
                </span>
              </div>

              <div className="space-y-3">
                {dissensusItems.map((dis, disIdx) => {
                  const isResolved = dis.status === 'RESUELTO';
                  const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;

                  return (
                    <div
                      key={dis.id}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                        isResolved
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800'
                          : 'bg-purple-50/40 dark:bg-slate-800/70 border-purple-200/80 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-[#4A154B] dark:text-purple-200 border border-purple-200 dark:border-purple-800 font-mono font-black text-[10px]">
                            DISENSO #{disIdx + 1}
                          </span>
                          <span className="font-black text-slate-900 dark:text-slate-100">
                            {dis.title}
                          </span>
                        </div>

                        {isResolved ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Resuelto · Opción {dis.winner} ({winObj?.label || 'Aprobada'})</span>
                          </span>
                        ) : dis.status === 'EN_VOTACION_R1' ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-[10px] font-bold animate-pulse">
                            ● En Votación (1ª Vuelta)
                          </span>
                        ) : dis.status === 'EN_VOTACION_R2' ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 text-[10px] font-bold animate-pulse">
                            ● En Balotaje (2ª Vuelta)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pendiente de Votación A/B/C</span>
                          </span>
                        )}
                      </div>

                      {dis.context && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {dis.context}
                        </p>
                      )}

                      {isResolved && winObj ? (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase">
                            <span>Resolución Aprobada · Opción {dis.winner}: {winObj.label}</span>
                            {winObj.originRegion && (
                              <span className="font-mono font-normal text-slate-500 dark:text-slate-400">
                                {winObj.originRegion}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            "{winObj.text}"
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/70 space-y-1">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-black text-[#0284C7] dark:text-sky-400 uppercase">
                              <span>Opción A · {dis.optionA.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                              {dis.optionA.text}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 space-y-1">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-black text-[#D97706] dark:text-amber-400 uppercase">
                              <span>Opción B · {dis.optionB.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                              {dis.optionB.text}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-black text-[#059669] dark:text-emerald-400 uppercase">
                              <span>Opción C · {dis.optionC.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                              {dis.optionC.text}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: MOCIÓN EXTENSIVA (50% + 1) - EXCLUSIVO PARA DELEGADOS */}
      {extensiveModal.open && extensiveModal.paragraph && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 flex items-center justify-center font-bold text-xs">
                  +
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Levantar Moción Extensiva (50% + 1)
                  </h3>
                  <span className="text-[10px] text-purple-900 dark:text-purple-300 font-mono">
                    Sobre Párrafo Aprobado § {extensiveModal.paragraph.number}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setExtensiveModal({ open: false, paragraph: null, chapterId: '', extensionText: '', title: '' })}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const validation = validateExtensiveEdit(
                extensiveModal.paragraph.originalText,
                extensiveModal.extensionText
              );

              return (
                <form onSubmit={handleSubmitExtensive} className="space-y-3">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto">
                    <span className="font-bold text-slate-800 dark:text-slate-100 block text-[10px] uppercase">Texto Aprobado del Párrafo:</span>
                    "{extensiveModal.paragraph.originalText}"
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Título Breve de la Moción
                    </label>
                    <input
                      type="text"
                      required
                      value={extensiveModal.title}
                      onChange={(e) => setExtensiveModal(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#4A154B]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Edición del Párrafo (Conservando texto base) *
                      </label>
                      <span className="text-[10px] text-purple-900 dark:text-purple-300 font-mono">
                        Párrafo § {extensiveModal.paragraph.number}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      required
                      value={extensiveModal.extensionText}
                      onChange={(e) => setExtensiveModal(prev => ({ ...prev, extensionText: e.target.value }))}
                      placeholder="Edite las palabras del párrafo base aprobado..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#4A154B] leading-relaxed"
                    />
                    {!validation.isValid && validation.error && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                        ⚠️ {validation.error}
                      </p>
                    )}
                  </div>

                  {/* Vista Previa en Vivo del Reemplazo (Diff morado / rojo) */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-900 dark:text-purple-300 uppercase">
                      <span>Vista Previa del Reemplazo Inline:</span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        +{validation.addedCount} agregadas · -{validation.removedCount} reemplazadas
                      </span>
                    </div>
                    <InlineDiffViewer
                      original={extensiveModal.paragraph.originalText}
                      modified={extensiveModal.extensionText}
                      showLegend={true}
                      className="text-xs"
                    />
                  </div>

                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-[11px] text-purple-950 dark:text-purple-200 font-medium">
                    ⚖️ <strong>Quórum: 50% + 1.</strong> La moción ingresará a la Mesa de Votaciones de la Secretaría Técnica para certificar su admisibilidad y ser agendada para votación en sala.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setExtensiveModal({ open: false, paragraph: null, chapterId: '', extensionText: '', title: '' })}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!validation.isValid}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all ${
                        !validation.isValid
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-[#4A154B] hover:bg-[#5E1B5F] text-white cursor-pointer'
                      }`}
                      title={!validation.isValid ? (validation.error || 'Modifique el texto') : 'Presentar moción a la Mesa'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Presentar Moción a la Mesa</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 2: MOCIÓN SUPRESIVA (2/3) - EXCLUSIVO PARA DELEGADOS */}
      {suppressiveModal.open && suppressiveModal.paragraph && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                  ✕
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                    Proponer Moción Supresiva (2/3)
                  </h3>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono">
                    Sobre Párrafo Aprobado § {suppressiveModal.paragraph.number}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSuppressiveModal({ open: false, paragraph: null, chapterId: '' })}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ¿Está seguro/a de someter a votación la <strong>supresión total</strong> del siguiente párrafo aprobado?
              </p>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-slate-700 dark:text-slate-200 italic max-h-32 overflow-y-auto">
                "{suppressiveModal.paragraph.originalText}"
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                ⚠️ <strong>Quórum Calificado: 2/3.</strong> La moción ingresará al padrón de la Mesa Directiva (Secretaría Técnica) para certificar su admisibilidad y ser agendada para votación en sala.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuppressiveModal({ open: false, paragraph: null, chapterId: '' })}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuppressive}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Presentar Moción a la Mesa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CARGAR PÁRRAFO A LA PRESÍNTESIS - EXCLUSIVO PARA SECRETARÍA TÉCNICA */}
      {addParagraphModal && !isPresynthesisApproved && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#4A154B] dark:text-purple-200 flex items-center justify-center font-bold text-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Cargar Párrafo a la Presíntesis
                  </h3>
                  <span className="text-[10px] text-purple-900 dark:text-purple-300 font-mono">
                    Capítulo {currentChapter.number}: {currentChapter.title}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAddParagraphModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddParagraphSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Párrafo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newParaNumber}
                    onChange={(e) => setNewParaNumber(e.target.value)}
                    placeholder="Ej: 1.3"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono font-bold focus:outline-none focus:border-[#4A154B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Título o Epígrafe (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newParaTitle}
                    onChange={(e) => setNewParaTitle(e.target.value)}
                    placeholder="Ej: Compromiso Arancelario"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#4A154B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Texto del Párrafo de la Presíntesis *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newParaText}
                  onChange={(e) => setNewParaText(e.target.value)}
                  placeholder="Redacte el texto acordado en las asambleas regionales para la Presíntesis Nacional..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddParagraphModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Párrafo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREAR CAPÍTULO - EXCLUSIVO PARA SECRETARÍA TÉCNICA */}
      {addChapterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#4A154B] dark:text-purple-200 flex items-center justify-center font-bold text-xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Crear Nuevo Capítulo
                  </h3>
                  <span className="text-[10px] text-purple-900 dark:text-purple-300 font-mono">
                    Presíntesis Regional FE-FA
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAddChapterModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChapterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Número de Capítulo *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newChapterNumber}
                  onChange={(e) => setNewChapterNumber(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título del Capítulo *
                </label>
                <input
                  type="text"
                  required
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="Ej: Principios Programáticos y Organización Estudiantil"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddChapterModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Crear Capítulo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDITAR PÁRRAFO - EXCLUSIVO PARA SECRETARÍA TÉCNICA */}
      {editParagraphModal.open && editParagraphModal.paragraph && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#4A154B] dark:text-purple-300" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Editar Párrafo § {editParagraphModal.paragraph.number}
                </h3>
              </div>
              <button 
                onClick={() => setEditParagraphModal({ open: false, paragraph: null, chapterId: '', text: '', title: '' })}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditParagraph} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título / Epígrafe
                </label>
                <input
                  type="text"
                  value={editParagraphModal.title}
                  onChange={(e) => setEditParagraphModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Texto del Párrafo
                </label>
                <textarea
                  rows={4}
                  required
                  value={editParagraphModal.text}
                  onChange={(e) => setEditParagraphModal(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditParagraphModal({ open: false, paragraph: null, chapterId: '', text: '', title: '' })}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EDITAR CAPÍTULO - EXCLUSIVO PARA SECRETARÍA TÉCNICA */}
      {editChapterModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-[#4A154B] dark:text-purple-200 flex items-center justify-center font-bold text-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Editar Capítulo
                  </h3>
                  <span className="text-[10px] text-purple-900 dark:text-purple-300 font-mono">
                    Presíntesis Regional FE-FA
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditChapterModal({ open: false, chapterId: '', number: 1, title: '' })}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditChapter} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Número de Capítulo *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editChapterModal.number}
                  onChange={(e) => setEditChapterModal(prev => ({ ...prev, number: Number(e.target.value) }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título del Capítulo *
                </label>
                <input
                  type="text"
                  required
                  value={editChapterModal.title}
                  onChange={(e) => setEditChapterModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditChapterModal({ open: false, chapterId: '', number: 1, title: '' })}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: CONFIRMAR ELIMINACIÓN DE CAPÍTULO - EXCLUSIVO PARA SECRETARÍA TÉCNICA */}
      {deleteChapterModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                  Eliminar Capítulo {deleteChapterModal.number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteChapterModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mb-4">
              <p>
                ¿Está seguro de eliminar el <strong>Capítulo {deleteChapterModal.number}: {deleteChapterModal.title}</strong>?
              </p>
              {(deleteChapterModal.paragraphCount > 0 || deleteChapterModal.dissensusCount > 0) && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 text-[11px] font-medium">
                  Se eliminarán también <strong>{deleteChapterModal.paragraphCount}</strong> párrafo(s) y{' '}
                  <strong>{deleteChapterModal.dissensusCount}</strong> disenso(s) asociados a este capítulo.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteChapterModal(prev => ({ ...prev, open: false }))}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteChapter}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Capítulo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: CERTIFICADO OFICIAL DE MOCIÓN PRESENTADA */}
      {submittedMotionCert && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                    {submittedMotionCert.code} · {submittedMotionCert.motionKind === 'MOCION_SUPRESIVA' ? 'Moción Supresiva' : 'Moción Extensiva'}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Moción Presentada con Éxito
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmittedMotionCert(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/35 border border-purple-200 dark:border-purple-800/80 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {submittedMotionCert.title}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Tu moción ingresó formalmente a la Mesa Directiva sobre el párrafo <strong>§ {submittedMotionCert.targetParagraphNumber}</strong>. Puedes descargar ahora tu certificado institucional en PDF con el texto íntegro y folio de verificación.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSubmittedMotionCert(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handleDownloadMotionCertificate(submittedMotionCert)}
                disabled={downloadingCertId === submittedMotionCert.id}
                className="px-4 py-2 bg-gradient-to-r from-[#4A154B] to-[#6A1B6B] hover:brightness-110 text-white text-xs font-black rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>{downloadingCertId === submittedMotionCert.id ? 'Generando PDF...' : 'Descargar Certificado (PDF)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
