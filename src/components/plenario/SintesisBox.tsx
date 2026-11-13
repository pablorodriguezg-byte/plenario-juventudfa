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
  ArrowUpRight
} from 'lucide-react';
import { PresynthesisParagraph, DissensusItem, Motion } from '../../types/plenario';
import { InlineDiffViewer, validateExtensiveEdit } from '../../utils/textDiff';

export const SintesisBox: React.FC = () => {
  const { 
    synthesisChapters, 
    activeMotion,
    motionsHistory,
    setActiveMotionId,
    proposeExtensiveMotion,
    proposeSuppressiveMotion,
    launchDissensusRound1,
    passDissensusToRound2,
    launchGeneralPresynthesisVote,
    addChapter,
    addParagraphToChapter,
    updateParagraphInChapter,
    deleteParagraphFromChapter,
    isSecretariaTecnica,
    isDelegate
  } = usePlenario();

  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'EN_VOTACION' | 'PARRAFOS_PRESENTADOS'>('EN_VOTACION');

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

  const currentChapter = synthesisChapters[activeChapterIndex] || synthesisChapters[0] || {
    id: 'ch-1',
    number: 1,
    title: 'Documento',
    paragraphs: [],
    dissensusItems: [],
    lastModifiedBy: 'Secretaría',
    lastModifiedAt: Date.now()
  };

  const paragraphs = currentChapter?.paragraphs || [];
  const dissensusItems = currentChapter?.dissensusItems || [];

  const generalPresintesisMotion = motionsHistory.find(m => m.motionKind === 'GENERAL_PRESINTESIS');
  const isVotingActive = activeMotion && activeMotion.status === 'VOTING';

  // Delegate handlers
  const handleOpenExtensive = (p: PresynthesisParagraph) => {
    if (!isDelegate) return;
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
    if (!extensiveModal.paragraph) return;
    const val = validateExtensiveEdit(extensiveModal.paragraph.originalText, extensiveModal.extensionText);
    if (!val.isValid) return;
    proposeExtensiveMotion(
      extensiveModal.chapterId,
      extensiveModal.paragraph.id,
      extensiveModal.extensionText.trim(),
      extensiveModal.title.trim()
    );
    setExtensiveModal({ open: false, paragraph: null, chapterId: '', extensionText: '', title: '' });
  };

  const handleOpenSuppressive = (p: PresynthesisParagraph) => {
    if (!isDelegate) return;
    setSuppressiveModal({
      open: true,
      paragraph: p,
      chapterId: currentChapter.id
    });
  };

  const handleConfirmSuppressive = () => {
    if (!suppressiveModal.paragraph) return;
    proposeSuppressiveMotion(
      suppressiveModal.chapterId,
      suppressiveModal.paragraph.id
    );
    setSuppressiveModal({ open: false, paragraph: null, chapterId: '' });
  };

  // Secretaría Técnica handlers
  const handleAddParagraphSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParaNumber.trim() || !newParaText.trim()) return;
    addParagraphToChapter(currentChapter.id, newParaNumber.trim(), newParaText.trim(), newParaTitle.trim() || undefined);
    setNewParaNumber('');
    setNewParaTitle('');
    setNewParaText('');
    setAddParagraphModal(false);
  };

  const handleAddChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    addChapter(Number(newChapterNumber), newChapterTitle.trim());
    setNewChapterTitle('');
    setNewChapterNumber(synthesisChapters.length + 2);
    setAddChapterModal(false);
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
    <div className="flex flex-col h-full w-full min-w-0 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Top Bar: Subtabs Switcher */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-r from-slate-50 via-purple-50/20 to-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs w-fit max-w-full">
          
          {/* Subtab 1: En Votación Actual */}
          <button
            onClick={() => setViewMode('EN_VOTACION')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'EN_VOTACION'
                ? 'bg-[#4A154B] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isVotingActive ? 'text-rose-400 animate-pulse' : 'text-purple-200'}`} />
            <span>1. En Votación Actual</span>
            <span className={`text-[10px] py-0.2 px-1.5 rounded font-mono font-bold ${
              isVotingActive ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
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
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>2. Párrafos Presentados</span>
            <span className="text-[10px] py-0.2 px-1.5 rounded bg-purple-100 text-purple-950 font-mono font-bold hidden sm:inline">
              Mociones y Tramitación
            </span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: EN VOTACIÓN ACTUAL (ACUERDOS BASE) */}
      {viewMode === 'EN_VOTACION' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          
          {isVotingActive ? (
            /* ACTIVE VOTING IN PROGRESS: MUESTRA DIRECTAMENTE LA MATERIA EN VOTACIÓN */
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* SPECIFIC ITEM BEING VOTED */}
              
              {/* Case 1: General Presynthesis Vote */}
              {activeMotion.motionKind === 'GENERAL_PRESINTESIS' && (
                <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-purple-950 uppercase tracking-wide">
                    <FileCheck className="w-4 h-4 text-[#4A154B]" />
                    <span>Materia en Votación: Presíntesis Regional en General</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Se somete a votación general única (50%+1) el documento base consolidado de las discusiones regionales.
                    Al ser aprobada en general, se dará inicio a la votación de disensos y presentación de mociones reglamentarias.
                  </p>
                  <div className="p-3 bg-white border border-purple-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#4A154B] block text-[11px]">Capítulos de la Presíntesis a Ratificar:</span>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                      {synthesisChapters.map(ch => (
                        <li key={ch.id}>Cap. {ch.number}: {ch.title} ({ch.paragraphs.length} párrafos base)</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Case 2: Dissensus Round 1 (Opciones A, B, C) */}
              {activeMotion.motionKind === 'DISENSO_PRIMERA_VUELTA' && activeMotion.dissensusOptions && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Propuestas Reglamentarias en Disenso (A, B y C)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Opción A */}
                    <div className="p-3.5 rounded-xl border border-sky-300 bg-sky-50/60 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#0284C7] uppercase">Opción A: {activeMotion.dissensusOptions.a.label || 'Visión Uno'}</span>
                        <span className="text-[10px] bg-white border border-sky-200 text-sky-800 px-1.5 py-0.2 rounded font-mono">
                          {activeMotion.dissensusOptions.a.originRegion || activeMotion.dissensusOptions.a.region || 'Regional'}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-snug">
                        {activeMotion.dissensusOptions.a.text}
                      </p>
                    </div>

                    {/* Opción B */}
                    <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/60 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#D97706] uppercase">Opción B: {activeMotion.dissensusOptions.b.label || 'Visión Dos'}</span>
                        <span className="text-[10px] bg-white border border-amber-200 text-amber-800 px-1.5 py-0.2 rounded font-mono">
                          {activeMotion.dissensusOptions.b.originRegion || activeMotion.dissensusOptions.b.region || 'Regional'}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-snug">
                        {activeMotion.dissensusOptions.b.text}
                      </p>
                    </div>

                    {/* Opción C */}
                    <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#059669] uppercase">Opción C: {activeMotion.dissensusOptions.c.label || 'Visión de Consenso'}</span>
                        <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                          {activeMotion.dissensusOptions.c.originRegion || activeMotion.dissensusOptions.c.region || 'Consenso'}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-snug">
                        {activeMotion.dissensusOptions.c.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Case 3: Dissensus Round 2 (Balotaje) */}
              {activeMotion.motionKind === 'DISENSO_SEGUNDA_VUELTA' && activeMotion.runoffOptions && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-950 uppercase tracking-wide">
                    <RotateCw className="w-4 h-4 text-indigo-700" />
                    <span>Balotaje de 2ª Vuelta: Opción {activeMotion.runoffOptions[0]} vs Opción {activeMotion.runoffOptions[1]}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Al no alcanzarse mayoría absoluta (&gt;50%) en primera vuelta, pasan a definición dirimente por 50%+1 las dos primeras mayorías.
                  </p>
                </div>
              )}

              {/* Case 4: Moción Extensiva */}
              {activeMotion.motionKind === 'MOCION_EXTENSIVA' && (
                <div className="p-4 bg-purple-50/70 border border-purple-300 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#4A154B]" />
                      <span>Moción Extensiva sobre Párrafo § {activeMotion.targetParagraphNumber} (50%+1)</span>
                    </span>
                    <span className="text-[10px] text-purple-900 font-mono font-bold">
                      Presentada por: {activeMotion.proposedBy}
                    </span>
                  </div>

                  <div className="p-3.5 bg-white border border-purple-200 rounded-xl text-xs space-y-2 shadow-2xs">
                    <span className="font-bold text-slate-800 block text-[10px] uppercase">
                      Texto con Reemplazo Extensivo (Palabras agregadas en morado / palabras borradas en rojo):
                    </span>
                    <InlineDiffViewer
                      original={activeMotion.originalParagraphText || ''}
                      modified={activeMotion.proposedEditedText || activeMotion.proposedExtensionText || ''}
                      showLegend={true}
                      className="text-xs sm:text-[13px] leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Case 5: Moción Supresiva */}
              {activeMotion.motionKind === 'MOCION_SUPRESIVA' && (
                <div className="p-4 bg-rose-50/70 border border-rose-300 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-700" />
                      <span>Moción Supresiva para Eliminar Párrafo § {activeMotion.targetParagraphNumber} (Quórum 2/3)</span>
                    </span>
                    <span className="text-[10px] text-rose-900 font-mono font-bold">
                      Presentada por: {activeMotion.proposedBy}
                    </span>
                  </div>

                  {activeMotion.originalParagraphText && (
                    <div className="p-3 bg-white border border-rose-200 rounded-xl text-xs text-slate-700 italic">
                      <span className="font-bold text-rose-800 block text-[10px] uppercase mb-0.5">Párrafo que se propone suprimir:</span>
                      "{activeMotion.originalParagraphText}"
                    </div>
                  )}
                </div>
              )}

              {/* Case 6: General Final Synthesis Vote */}
              {activeMotion.motionKind === 'GENERAL_SINTESIS_FINAL' && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-950 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>Votación Solemne de la Síntesis Final Consolidada</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    El Plenario ratifica en general el texto definitivo consolidado (50%+1), el cual incorpora todos los acuerdos, mociones y disensos resueltos.
                  </p>
                </div>
              )}

            </div>
          ) : (
            /* NO ACTIVE VOTE IN PROGRESS: INFORMACIÓN DE AGENDA Y DISPONIBILIDAD */
            <div className="space-y-4">
              <div className="p-5 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#4A154B] flex items-center justify-center mx-auto">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    No Hay Ninguna Votación Activa en Este Momento
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                    La cabina de acuerdos base muestra estrictamente lo que se somete a votación en sala en tiempo real.
                  </p>
                </div>

                {/* If user is Secretaría Técnica, allow launching the next voting item */}
                {isSecretariaTecnica && (
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    {(!generalPresintesisMotion || generalPresintesisMotion.status !== 'APPROVED') && (
                      <button
                        onClick={() => launchGeneralPresynthesisVote()}
                        className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Vote className="w-3.5 h-3.5" />
                        <span>Lanzar Votación General de la Presíntesis (50%+1)</span>
                      </button>
                    )}
                  </div>
                )}

                {isDelegate && (
                  <p className="text-[11px] text-purple-900 font-medium">
                    Consulte la pestaña <strong>"2. Párrafos Presentados"</strong> para revisar el articulado, el estado de tramitación y presentar mociones extensivas o supresivas.
                  </p>
                )}
              </div>

              {/* Metodología de Discusión en 4 Fases */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-purple-950 uppercase tracking-wide">
                  <Scale className="w-4 h-4 text-[#4A154B]" />
                  <span>Metodología de Discusión del Plenario</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 bg-white border border-purple-200 rounded-xl space-y-1">
                    <span className="font-black text-[#4A154B] block text-[11px]">1. Votar Presíntesis</span>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      Se vota una sola vez al empezar la discusión en general (50%+1), no por párrafos.
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-1">
                    <span className="font-black text-amber-700 block text-[11px]">2. Votar Disensos</span>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      Mediante opciones A, B y C. Requiere mayoría absoluta (&gt;50%) o balotaje entre las 2 primeras.
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-1">
                    <span className="font-black text-indigo-700 block text-[11px]">3. Mociones de Delegados</span>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      Extensivas (50%+1) y supresivas (2/3) exclusivamente sobre párrafos ya aprobados.
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-1">
                    <span className="font-black text-emerald-700 block text-[11px]">4. Síntesis Final</span>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                  <FileText className="w-4 h-4 text-[#4A154B]" />
                  <span>Capítulo:</span>
                </div>
                <select
                  value={activeChapterIndex}
                  onChange={(e) => setActiveChapterIndex(Number(e.target.value))}
                  className="text-xs font-bold text-purple-950 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#4A154B] cursor-pointer shadow-2xs max-w-xs truncate"
                >
                  {synthesisChapters.map((ch, idx) => (
                    <option key={ch.id} value={idx}>
                      Cap. {ch.number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                Párrafos presentados del capítulo (aprobados en general) junto con las mociones presentadas que pretenden suprimir o extender el articulado y su estado de tramitación reglamentaria.
              </p>
            </div>

            {/* Actions for Secretaría Técnica: Cargar Capítulos y Párrafos */}
            {isSecretariaTecnica && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setAddParagraphModal(true)}
                  className="px-3 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Cargar nuevo párrafo a este capítulo de la Presíntesis"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cargar Párrafo</span>
                </button>

                <button
                  onClick={() => setAddChapterModal(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-purple-950 border border-purple-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Crear un nuevo capítulo en la Presíntesis"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-purple-800" />
                  <span>Nuevo Capítulo</span>
                </button>
              </div>
            )}
          </div>

          {(() => {
            const chapterMotions = motionsHistory.filter(m => 
              (m.motionKind === 'MOCION_EXTENSIVA' || m.motionKind === 'MOCION_SUPRESIVA') &&
              paragraphs.some(p => p.id === m.targetParagraphId || p.number === m.targetParagraphNumber)
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
                    pill: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
                    desc: 'Moción actualmente abierta en sala plenaria para sufragio vinculante.',
                    icon: Radio
                  };
                case 'APPROVED':
                  return {
                    label: 'Aprobada en Plenario · Aplicada al Texto',
                    pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    desc: 'Aprobada por quórum reglamentario e incorporada a la redacción definitiva.',
                    icon: CheckCircle2
                  };
                case 'REJECTED':
                  return {
                    label: 'Rechazada en Plenario · Desestimada',
                    pill: 'bg-slate-100 text-slate-700 border-slate-300',
                    desc: 'Sometida a votación pero no alcanzó el quórum reglamentario requerido.',
                    icon: XCircle
                  };
                case 'DRAFT':
                default:
                  return {
                    label: 'Presentada · Pendiente Aprobación de Mesa Técnica',
                    pill: 'bg-amber-100 text-amber-900 border-amber-300',
                    desc: 'Presentada formalmente por delegación regional. Requiere ser aprobada por la Secretaría Técnica para ponerse a votación.',
                    icon: Clock
                  };
              }
            };

            return (
              <>
                {/* Chapter Summary Metrics: Párrafos y Estado de Tramitación */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Párrafos Presentados
                    </span>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {paragraphs.length} párrafos
                    </div>
                    <span className="text-[10px] text-slate-400">En este capítulo</span>
                  </div>

                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider block">
                      Mociones Extensivas
                    </span>
                    <div className="text-base font-black text-[#4A154B] mt-0.5">
                      {extensiveCount} ingresadas
                    </div>
                    <span className="text-[10px] text-purple-700">Pretenden agregar texto (50%+1)</span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-rose-900 tracking-wider block">
                      Mociones Supresivas
                    </span>
                    <div className="text-base font-black text-rose-700 mt-0.5">
                      {suppressiveCount} ingresadas
                    </div>
                    <span className="text-[10px] text-rose-600">Pretenden eliminar párrafos (2/3)</span>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                      Estado de Tramitación
                    </span>
                    <div className="text-base font-black text-amber-800 mt-0.5">
                      {inVotingCount > 0 ? `${inVotingCount} en votación` : `${draftCount} pendientes`}
                    </div>
                    <span className="text-[10px] text-amber-700">
                      {approvedCount} aprobadas · {inVotingCount} en sala
                    </span>
                  </div>
                </div>

                {/* List of Presented Paragraphs */}
                <div className="space-y-3.5">
                  {paragraphs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <p className="text-xs text-slate-500 italic">No hay párrafos cargados en este capítulo.</p>
                      {isSecretariaTecnica && (
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
                        (m.targetParagraphId === p.id || 
                         m.targetParagraphNumber === p.number ||
                         (m.code && p.appliedMotionCode === m.code))
                      );

                      return (
                        <div
                          key={p.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isSuppressed
                              ? 'bg-rose-50/40 border-rose-200 opacity-75'
                              : isExtended
                                ? 'bg-purple-50/30 border-purple-300 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          {/* Header and status */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono font-black text-xs border border-slate-200">
                                § {p.number}
                              </span>
                              {p.title && (
                                <span className="text-xs font-black text-slate-900">
                                  {p.title}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isSuppressed && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                                  ✕ Suprimido ({p.appliedMotionCode || '2/3 calificado'})
                                </span>
                              )}
                              {isExtended && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold">
                                  ✓ Extendido ({p.appliedMotionCode || '50%+1'})
                                </span>
                              )}
                              {!isSuppressed && !isExtended && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  ✓ Párrafo Base Aprobado
                                </span>
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
                            <p className={`text-xs leading-relaxed text-slate-700 ${isSuppressed ? 'line-through text-slate-400' : ''}`}>
                              {p.originalText}
                            </p>
                          )}

                          {/* SECTION: MOCIONES PRESENTADAS SOBRE ESTE PÁRRAFO Y ESTADO DE TRAMITACIÓN */}
                          {motionsForParagraph.length > 0 ? (
                            <div className="mt-3.5 pt-3 border-t border-slate-200/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#4A154B]" />
                                  <span>Mociones Ingresadas sobre § {p.number} ({motionsForParagraph.length})</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
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
                                          ? 'bg-purple-50/50 border-purple-200' 
                                          : 'bg-rose-50/40 border-rose-200'
                                      }`}
                                    >
                                      {/* Header of motion card */}
                                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black border ${
                                            isExt ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-rose-100 text-rose-900 border-rose-300'
                                          }`}>
                                            {m.code}
                                          </span>
                                          <span className="font-black text-slate-900 text-xs">
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
                                      <div className="text-[11px] font-bold text-slate-800 leading-snug">
                                        {m.title}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        Presentada por: <strong className="text-slate-700">{m.proposedBy}</strong> · Quórum: <strong className="text-slate-700">{m.quorumType === 'TWO_THIRDS' ? '2/3 Calificado' : 'Mayoría Simple (50%+1)'}</strong>
                                      </div>

                                      {/* Content Preview */}
                                      {isExt && (
                                        <div className="mt-2 p-2 bg-white rounded-lg border border-purple-100">
                                          <div className="text-[10px] font-black text-purple-900 uppercase tracking-tight mb-1">
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
                                            <p className="text-[11px] text-purple-950 font-medium italic">
                                              «{m.proposedExtensionText}»
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {isSup && (
                                        <div className="mt-2 p-2 bg-white rounded-lg border border-rose-100 flex items-center gap-2 text-rose-900 text-[11px]">
                                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                          <span>Pretende la <strong>eliminación total</strong> de este párrafo del texto definitivo de Síntesis Final.</span>
                                        </div>
                                      )}

                                      {/* Botón para ver en cabina de votación */}
                                      <div className="mt-2 pt-1.5 flex items-center justify-between border-t border-slate-200/60">
                                        <span className="text-[10px] text-slate-500 italic truncate max-w-xs">
                                          {statusInfo.desc}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setActiveMotionId(m.id)}
                                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs shrink-0"
                                          title="Visualizar o votar esta moción en la cabina de votación"
                                        >
                                          <span>Ver en Cabina</span>
                                          <ArrowUpRight className="w-3 h-3 text-[#4A154B]" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                              <span className="flex items-center gap-1 text-slate-500">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Sin mociones presentadas sobre este párrafo (Texto base aprobado en general vigente)</span>
                              </span>
                            </div>
                          )}

                          {/* Actions Bar */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            
                            {/* ONLY DELEGATES CAN PROPOSE MOTIONS */}
                            {isDelegate && !isSuppressed && (
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Proponer sobre § {p.number}:
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleOpenExtensive(p)}
                                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#4A154B] border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Proponer moción extensiva para agregar texto complementario (Quórum 50%+1)"
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#4A154B]" />
                                  <span>+ Moción Extensiva (50%+1)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenSuppressive(p)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Proponer moción supresiva para eliminar el párrafo (Quórum 2/3)"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>✕ Moción Supresiva (2/3)</span>
                                </button>
                              </div>
                            )}

                            {/* SECRETARÍA TÉCNICA CANNOT PRESENT MOTIONS - HAS EDIT & DELETE CONTROLS */}
                            {isSecretariaTecnica && (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[10px] text-slate-400 italic">
                                  Gestión de Presíntesis (Secretaría Técnica no presenta mociones)
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditParagraph(p)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3 text-slate-600" />
                                    <span>Editar Párrafo</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteParagraphFromChapter(currentChapter.id, p.id)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Eliminar párrafo de la Presíntesis"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Eliminar Párrafo</span>
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}

          {/* Section: Resolved Dissensuses in this Chapter */}
          {dissensusItems.filter(d => d.status === 'RESUELTO').length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#4A154B]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Disensos Resueltos Incorporados a este Capítulo</span>
              </div>

              <div className="space-y-2">
                {dissensusItems.filter(d => d.status === 'RESUELTO').map(dis => {
                  const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;
                  return (
                    <div key={dis.id} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                      <div className="font-bold text-emerald-950 flex items-center justify-between">
                        <span>{dis.title}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-mono">
                          Opción {dis.winner} ({winObj?.label || 'Aprobada'})
                        </span>
                      </div>
                      <p className="mt-1 text-slate-800 leading-relaxed italic">
                        "{winObj?.text}"
                      </p>
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                  +
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Levantar Moción Extensiva (50% + 1)
                  </h3>
                  <span className="text-[10px] text-purple-900 font-mono">
                    Sobre Párrafo Aprobado § {extensiveModal.paragraph.number}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setExtensiveModal({ open: false, paragraph: null, chapterId: '', extensionText: '', title: '' })}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
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
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-h-24 overflow-y-auto">
                    <span className="font-bold text-slate-800 block text-[10px] uppercase">Texto Aprobado del Párrafo:</span>
                    "{extensiveModal.paragraph.originalText}"
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Título Breve de la Moción
                    </label>
                    <input
                      type="text"
                      required
                      value={extensiveModal.title}
                      onChange={(e) => setExtensiveModal(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Edición del Párrafo (Conservando texto base) *
                      </label>
                      <span className="text-[10px] text-purple-900 font-mono">
                        Párrafo § {extensiveModal.paragraph.number}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      required
                      value={extensiveModal.extensionText}
                      onChange={(e) => setExtensiveModal(prev => ({ ...prev, extensionText: e.target.value }))}
                      placeholder="Edite las palabras del párrafo base aprobado..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] leading-relaxed"
                    />
                    {!validation.isValid && validation.error && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1">
                        ⚠️ {validation.error}
                      </p>
                    )}
                  </div>

                  {/* Vista Previa en Vivo del Reemplazo (Diff morado / rojo) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-900 uppercase">
                      <span>Vista Previa del Reemplazo Inline:</span>
                      <span className="text-slate-500 font-normal">
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

                  <div className="p-2 rounded-xl bg-purple-50 text-[11px] text-purple-950 font-medium">
                    ⚖️ <strong>Quórum: 50% + 1.</strong> La moción ingresará a la Mesa de Votaciones de la Secretaría Técnica para certificar su admisibilidad y ser agendada para votación en sala.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExtensiveModal({ open: false, paragraph: null, chapterId: '', extensionText: '', title: '' })}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!validation.isValid}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all ${
                        !validation.isValid
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  ✕
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900">
                    Proponer Moción Supresiva (2/3)
                  </h3>
                  <span className="text-[10px] text-rose-700 font-mono">
                    Sobre Párrafo Aprobado § {suppressiveModal.paragraph.number}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSuppressiveModal({ open: false, paragraph: null, chapterId: '' })}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Está seguro/a de someter a votación la <strong>supresión total</strong> del siguiente párrafo aprobado?
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-slate-700 italic max-h-32 overflow-y-auto">
                "{suppressiveModal.paragraph.originalText}"
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                ⚠️ <strong>Quórum Calificado: 2/3.</strong> La moción ingresará al padrón de la Mesa Directiva (Secretaría Técnica) para certificar su admisibilidad y ser agendada para votación en sala.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSuppressiveModal({ open: false, paragraph: null, chapterId: '' })}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
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
      {addParagraphModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#4A154B] flex items-center justify-center font-bold text-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Cargar Párrafo a la Presíntesis
                  </h3>
                  <span className="text-[10px] text-purple-900 font-mono">
                    Capítulo {currentChapter.number}: {currentChapter.title}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAddParagraphModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddParagraphSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Número de Párrafo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newParaNumber}
                    onChange={(e) => setNewParaNumber(e.target.value)}
                    placeholder="Ej: 1.3"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#4A154B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Título o Epígrafe (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newParaTitle}
                    onChange={(e) => setNewParaTitle(e.target.value)}
                    placeholder="Ej: Compromiso Arancelario"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Texto del Párrafo de la Presíntesis *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newParaText}
                  onChange={(e) => setNewParaText(e.target.value)}
                  placeholder="Redacte el texto acordado en las asambleas regionales para la Presíntesis Nacional..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddParagraphModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#4A154B] flex items-center justify-center font-bold text-xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Crear Nuevo Capítulo
                  </h3>
                  <span className="text-[10px] text-purple-900 font-mono">
                    Presíntesis Regional FE-FA
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAddChapterModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChapterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Número de Capítulo *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newChapterNumber}
                  onChange={(e) => setNewChapterNumber(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título del Capítulo *
                </label>
                <input
                  type="text"
                  required
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="Ej: Principios Programáticos y Organización Estudiantil"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddChapterModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#4A154B]" />
                <h3 className="text-sm font-black text-slate-900">
                  Editar Párrafo § {editParagraphModal.paragraph.number}
                </h3>
              </div>
              <button 
                onClick={() => setEditParagraphModal({ open: false, paragraph: null, chapterId: '', text: '', title: '' })}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditParagraph} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título / Epígrafe
                </label>
                <input
                  type="text"
                  value={editParagraphModal.title}
                  onChange={(e) => setEditParagraphModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Texto del Párrafo
                </label>
                <textarea
                  rows={4}
                  required
                  value={editParagraphModal.text}
                  onChange={(e) => setEditParagraphModal(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditParagraphModal({ open: false, paragraph: null, chapterId: '', text: '', title: '' })}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
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

    </div>
  );
};
