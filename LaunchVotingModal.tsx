import React, { useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  Vote, 
  X, 
  Layers, 
  Plus, 
  Trash2, 
  Scale, 
  Check, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { ChileanRegion } from '../../types/plenario';
import { InlineDiffViewer, validateExtensiveEdit } from '../../utils/textDiff';

interface LaunchVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ABC' | 'EXTENSIVA' | 'SUPRESIVA' | 'GENERAL';
  preselectedParagraph?: { chapterId: string; paragraphId: string };
}

export const LaunchVotingModal: React.FC<LaunchVotingModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'ABC',
  preselectedParagraph
}) => {
  const { 
    synthesisChapters, 
    launchABCVote, 
    proposeExtensiveMotion, 
    proposeSuppressiveMotion,
    createNewMotion,
    currentUser,
    isSecretariaTecnica,
    isDelegate,
    hasActiveVoting,
    activeVotingMotion
  } = usePlenario();

  const initialTab = React.useMemo(() => {
    if (isSecretariaTecnica && (defaultTab === 'EXTENSIVA' || defaultTab === 'SUPRESIVA')) {
      return 'ABC';
    }
    if (isDelegate && (defaultTab === 'ABC' || defaultTab === 'GENERAL')) {
      return 'EXTENSIVA';
    }
    return defaultTab;
  }, [isSecretariaTecnica, isDelegate, defaultTab]);

  const [activeTab, setActiveTab] = useState<'ABC' | 'EXTENSIVA' | 'SUPRESIVA' | 'GENERAL'>(initialTab);

  // Tab 1: ABC State
  const [abcTitle, setAbcTitle] = useState('');
  const [abcDesc, setAbcDesc] = useState('');
  const [optALabel, setOptALabel] = useState('Visión Uno');
  const [optAText, setOptAText] = useState('');
  const [optARegion, setOptARegion] = useState('Bancada Regional');
  const [optBLabel, setOptBLabel] = useState('Visión Dos');
  const [optBText, setOptBText] = useState('');
  const [optBRegion, setOptBRegion] = useState('Bancada Metropolitana');
  const [optCLabel, setOptCLabel] = useState('Visión de Consenso');
  const [optCText, setOptCText] = useState('');
  const [optCRegion, setOptCRegion] = useState('Mesa de Síntesis / Secretaría Técnica');

  // Tab 2 & 3: Extensiva & Supresiva on Approved Paragraphs
  // All approved paragraphs across all chapters (status !== 'SUPRIMIDO')
  const allApprovedParagraphs = React.useMemo(() => {
    const list: Array<{
      chapterId: string;
      chapterNumber: number;
      chapterTitle: string;
      paragraphId: string;
      number: string;
      originalText: string;
      status: string;
    }> = [];

    (synthesisChapters || []).forEach(ch => {
      (ch.paragraphs || []).forEach(p => {
        if (p.status !== 'SUPRIMIDO') {
          list.push({
            chapterId: ch.id,
            chapterNumber: ch.number,
            chapterTitle: ch.title,
            paragraphId: p.id,
            number: p.number,
            originalText: p.originalText,
            status: p.status
          });
        }
      });
    });

    return list;
  }, [synthesisChapters]);

  const initialPar = preselectedParagraph 
    ? allApprovedParagraphs.find(p => p.chapterId === preselectedParagraph.chapterId && p.paragraphId === preselectedParagraph.paragraphId)
    : allApprovedParagraphs[0];

  const [selectedParagraphKey, setSelectedParagraphKey] = useState<string>(
    initialPar ? `${initialPar.chapterId}::${initialPar.paragraphId}` : (allApprovedParagraphs[0] ? `${allApprovedParagraphs[0].chapterId}::${allApprovedParagraphs[0].paragraphId}` : '')
  );

  const selectedParagraph = allApprovedParagraphs.find(p => `${p.chapterId}::${p.paragraphId}` === selectedParagraphKey) || allApprovedParagraphs[0];

  const [extTitle, setExtTitle] = useState('');
  const [extText, setExtText] = useState(selectedParagraph ? selectedParagraph.originalText : '');
  const [supTitle, setSupTitle] = useState('');

  // Sincronizar texto base cuando se cambia de párrafo
  React.useEffect(() => {
    if (selectedParagraph) {
      setExtText(selectedParagraph.originalText);
    }
  }, [selectedParagraphKey]);

  // Tab 4: General State
  const [genTitle, setGenTitle] = useState('');
  const [genDesc, setGenDesc] = useState('');
  const [genQuorum, setGenQuorum] = useState<'SIMPLE_MAJORITY' | 'TWO_THIRDS'>('SIMPLE_MAJORITY');

  if (!isOpen) return null;

  // Handlers
  const handleLaunchABC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!abcTitle.trim() || !optAText.trim() || !optBText.trim() || !optCText.trim()) return;

    launchABCVote(
      abcTitle.trim(),
      abcDesc.trim(),
      { label: optALabel.trim() || 'Visión Uno', text: optAText.trim(), region: optARegion.trim() || 'Regional' },
      { label: optBLabel.trim() || 'Visión Dos', text: optBText.trim(), region: optBRegion.trim() || 'Regional' },
      { label: optCLabel.trim() || 'Visión de Consenso', text: optCText.trim(), region: optCRegion.trim() || 'Mesa / Consenso' }
    );
    onClose();
  };

  const handleLaunchExtensive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParagraph || !extText.trim()) return;

    proposeExtensiveMotion(
      selectedParagraph.chapterId,
      selectedParagraph.paragraphId,
      extText.trim(),
      extTitle.trim() || `Moción Extensiva: Párrafo § ${selectedParagraph.number}`
    );
    onClose();
  };

  const handleLaunchSuppressive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParagraph) return;

    proposeSuppressiveMotion(
      selectedParagraph.chapterId,
      selectedParagraph.paragraphId,
      supTitle.trim() || `Moción Supresiva: Eliminar Párrafo § ${selectedParagraph.number}`
    );
    onClose();
  };

  const handleLaunchGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTitle.trim()) return;

    createNewMotion(
      genTitle.trim(),
      genDesc.trim() || genTitle.trim(),
      genQuorum,
      true
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl my-auto p-4 sm:p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4A154B] to-[#D32F2F] text-white flex items-center justify-center shadow-xs">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                {isDelegate ? 'Presentar Moción sobre Párrafo Aprobado' : 'Lanzar Votación Oficial (Secretaría Técnica)'}
              </h3>
              <p className="text-[11px] text-purple-950 font-medium">
                {isDelegate ? 'Delegada/o Regional · Iniciativa Parlamentaria Vinculante' : 'Mesa Directiva & Fe Pública · Plenario Nacional'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: filtered by role permissions */}
        <div className="pt-3 pb-2 shrink-0">
          <div className={`grid gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold ${
            isDelegate || isSecretariaTecnica ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            
            {/* Opciones ABC (Secretaría Técnica) */}
            {isSecretariaTecnica && (
              <button
                type="button"
                onClick={() => setActiveTab('ABC')}
                className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'ABC' 
                    ? 'bg-[#4A154B] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Opciones A / B / C</span>
                </div>
                <div className="text-[9.5px] opacity-80 font-normal">Mayoría (&gt;50%) / Balotaje</div>
              </button>
            )}

            {/* Moción Extensiva (Delegados) */}
            {isDelegate && (
              <button
                type="button"
                onClick={() => setActiveTab('EXTENSIVA')}
                className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'EXTENSIVA' 
                    ? 'bg-[#4A154B] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3 text-purple-300" />
                  <span>Moción Extensiva</span>
                </div>
                <div className="text-[9.5px] opacity-80 font-normal">Párrafo Aprobado (50%+1)</div>
              </button>
            )}

            {/* Moción Supresiva (Delegados) */}
            {isDelegate && (
              <button
                type="button"
                onClick={() => setActiveTab('SUPRESIVA')}
                className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'SUPRESIVA' 
                    ? 'bg-rose-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-300" />
                  <span>Moción Supresiva</span>
                </div>
                <div className="text-[9.5px] opacity-80 font-normal">Párrafo Aprobado (2/3)</div>
              </button>
            )}

            {/* Votación General (Secretaría Técnica) */}
            {isSecretariaTecnica && (
              <button
                type="button"
                onClick={() => setActiveTab('GENERAL')}
                className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'GENERAL' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Scale className="w-3 h-3 text-amber-300" />
                  <span>Votación General</span>
                </div>
                <div className="text-[9.5px] opacity-80 font-normal">A Favor / Contra / Abs</div>
              </button>
            )}
          </div>
        </div>

        {/* Warning banner when a voting is already open (only relevant for direct launchers ABC/GENERAL) */}
        {hasActiveVoting && (activeTab === 'ABC' || activeTab === 'GENERAL') && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 mb-2 shrink-0 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black block uppercase text-[11px] tracking-wide text-rose-800">
                Votación en Curso en el Plenario ({activeVotingMotion?.code || 'Activa'})
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed mt-0.5">
                Por reglamento de la asamblea, <strong>solo se puede tener una votación abierta a la vez</strong>. La Secretaría Técnica debe cerrar la votación actual antes de abrir un nuevo proceso de sufragio.
              </p>
            </div>
          </div>
        )}

        {/* Form Body with Smooth Scrolling */}
        <div className="flex-1 overflow-y-auto pr-1 py-2">
          
          {/* TAB 1: VOTACIÓN POR OPCIONES A / B / C */}
          {activeTab === 'ABC' && (
            <form onSubmit={handleLaunchABC} className="space-y-3.5">
              
              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-950 text-[11px]">
                  <Scale className="w-3.5 h-3.5 text-[#4A154B]" />
                  <span>Metodología de Disensos Tripartitos (A, B y C)</span>
                </div>
                <p className="text-[10.5px] text-slate-600 leading-snug">
                  Se presentan 3 visiones simultáneas. Requiere <strong>Mayoría Absoluta (&gt;50%)</strong> en primera vuelta. Si ninguna opción alcanza más del 50%, las dos primeras mayorías pasan automáticamente a balotaje de segunda vuelta dirimente (50%+1).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título del Asunto o Disenso a Dirimir *
                </label>
                <input
                  type="text"
                  required
                  value={abcTitle}
                  onChange={(e) => setAbcTitle(e.target.value)}
                  placeholder="Ej: Régimen de Aranceles Diferenciados en Planteles Estatales"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contexto Político o Justificación (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={abcDesc}
                  onChange={(e) => setAbcDesc(e.target.value)}
                  placeholder="Explique el disenso entre las bancadas regionales..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              {/* The 3 Options Config */}
              <div className="space-y-3 pt-1">
                
                {/* Opción A */}
                <div className="p-3 rounded-xl border border-sky-300 bg-sky-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0284C7] uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                      <span>Opción A: Visión Uno</span>
                    </span>
                    <input
                      type="text"
                      value={optARegion}
                      onChange={(e) => setOptARegion(e.target.value)}
                      placeholder="Región/Bancada de origen"
                      className="text-[10px] bg-white border border-sky-200 rounded-lg px-2 py-0.5 text-slate-700 font-mono w-44"
                    />
                  </div>
                  <input
                    type="text"
                    value={optALabel}
                    onChange={(e) => setOptALabel(e.target.value)}
                    placeholder="Etiqueta breve de la propuesta (Ej: Visión Centralizada)"
                    className="w-full bg-white border border-sky-200 rounded-lg p-1.5 text-xs text-slate-900 font-bold"
                  />
                  <textarea
                    rows={2}
                    required
                    value={optAText}
                    onChange={(e) => setOptAText(e.target.value)}
                    placeholder="Redacción concreta de la propuesta A..."
                    className="w-full bg-white border border-sky-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Opción B */}
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D97706] uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      <span>Opción B: Visión Dos</span>
                    </span>
                    <input
                      type="text"
                      value={optBRegion}
                      onChange={(e) => setOptBRegion(e.target.value)}
                      placeholder="Región/Bancada de origen"
                      className="text-[10px] bg-white border border-amber-200 rounded-lg px-2 py-0.5 text-slate-700 font-mono w-44"
                    />
                  </div>
                  <input
                    type="text"
                    value={optBLabel}
                    onChange={(e) => setOptBLabel(e.target.value)}
                    placeholder="Etiqueta breve de la propuesta (Ej: Visión Descentralizada)"
                    className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-xs text-slate-900 font-bold"
                  />
                  <textarea
                    rows={2}
                    required
                    value={optBText}
                    onChange={(e) => setOptBText(e.target.value)}
                    placeholder="Redacción concreta de la propuesta B..."
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Opción C */}
                <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#059669] uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#059669]" />
                      <span>Opción C: Visión de Consenso</span>
                    </span>
                    <input
                      type="text"
                      value={optCRegion}
                      onChange={(e) => setOptCRegion(e.target.value)}
                      placeholder="Región/Mesa de origen"
                      className="text-[10px] bg-white border border-emerald-200 rounded-lg px-2 py-0.5 text-slate-700 font-mono w-44"
                    />
                  </div>
                  <input
                    type="text"
                    value={optCLabel}
                    onChange={(e) => setOptCLabel(e.target.value)}
                    placeholder="Etiqueta breve de la propuesta (Ej: Visión Mixta Progresiva)"
                    className="w-full bg-white border border-emerald-200 rounded-lg p-1.5 text-xs text-slate-900 font-bold"
                  />
                  <textarea
                    rows={2}
                    required
                    value={optCText}
                    onChange={(e) => setOptCText(e.target.value)}
                    placeholder="Redacción de la propuesta de consenso C..."
                    className="w-full bg-white border border-emerald-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={hasActiveVoting}
                  title={hasActiveVoting ? 'Ya existe una votación activa en sala' : undefined}
                  className={`px-5 py-2 text-white text-xs font-black rounded-xl shadow flex items-center gap-1.5 ${
                    hasActiveVoting 
                      ? 'bg-slate-400 cursor-not-allowed opacity-60' 
                      : 'bg-[#4A154B] hover:bg-[#5E1B5F] cursor-pointer'
                  }`}
                >
                  <Vote className="w-3.5 h-3.5" />
                  <span>Lanzar Votación Opciones A/B/C (&gt;50%)</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: MOCIÓN EXTENSIVA (50% + 1) CON REEMPLAZO INLINE SOBRE PÁRRAFO APROBADO */}
          {activeTab === 'EXTENSIVA' && (() => {
            const validation = selectedParagraph 
              ? validateExtensiveEdit(selectedParagraph.originalText, extText)
              : { isValid: false, error: 'Seleccione un párrafo aprobado', addedCount: 0, removedCount: 0, unchangedCount: 0 };

            return (
              <form onSubmit={handleLaunchExtensive} className="space-y-3.5">
                
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-950 text-[11px]">
                    <Check className="w-3.5 h-3.5 text-[#4A154B] stroke-[3]" />
                    <span>Moción Extensiva de Reemplazo sobre Párrafo Aprobado</span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-snug">
                    Edite el texto base del párrafo: las palabras que agregue en cualquier parte se mostrarán en <strong>morado</strong> y las palabras que sustituya/suprima se mostrarán en <strong>rojo tachado</strong>. No se puede borrar todo el texto original. Quórum: <strong>50% + 1</strong>.
                  </p>
                </div>

                {/* Selector de Párrafo Aprobado */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Seleccione el Párrafo Aprobado a Modificar *
                  </label>
                  <select
                    value={selectedParagraphKey}
                    onChange={(e) => setSelectedParagraphKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#4A154B]"
                  >
                    {allApprovedParagraphs.map(p => (
                      <option key={`${p.chapterId}::${p.paragraphId}`} value={`${p.chapterId}::${p.paragraphId}`}>
                        Cap. {p.chapterNumber} · § {p.number}: {p.originalText.slice(0, 75)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Título de la Moción Extensiva
                  </label>
                  <input
                    type="text"
                    value={extTitle}
                    onChange={(e) => setExtTitle(e.target.value)}
                    placeholder={`Ej: Moción Extensiva: Edición Párrafo ${selectedParagraph?.number || ''}`}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Edición del Párrafo (Conservando texto base) *
                    </label>
                    <span className="text-[10px] text-purple-900 font-mono">
                      Cap. {selectedParagraph?.chapterNumber} · § {selectedParagraph?.number}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={extText}
                    onChange={(e) => setExtText(e.target.value)}
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
                {selectedParagraph && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-900 uppercase">
                      <span>Vista Previa del Reemplazo Inline:</span>
                      <span className="text-slate-500 font-normal">
                        +{validation.addedCount} agregadas · -{validation.removedCount} reemplazadas
                      </span>
                    </div>
                    <InlineDiffViewer
                      original={selectedParagraph.originalText}
                      modified={extText}
                      showLegend={true}
                      className="text-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!validation.isValid}
                    className={`px-5 py-2 text-xs font-black rounded-xl shadow flex items-center gap-1.5 transition-all ${
                      !validation.isValid
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-[#4A154B] hover:bg-[#5E1B5F] text-white cursor-pointer'
                    }`}
                    title={!validation.isValid ? (validation.error || 'Complete las modificaciones') : 'Presentar moción a la Mesa Directiva para su revisión reglamentaria'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Presentar Moción a la Mesa</span>
                  </button>
                </div>

              </form>
            );
          })()}

          {/* TAB 3: MOCIÓN SUPRESIVA (2/3) SOBRE PÁRRAFO APROBADO */}
          {activeTab === 'SUPRESIVA' && (
            <form onSubmit={handleLaunchSuppressive} className="space-y-3.5">
              
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-950 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                  <span>Regla Metodológica: Supresión sobre Párrafos Aprobados (Quórum 2/3)</span>
                </div>
                <p className="text-[10.5px] text-slate-600 leading-snug">
                  Las mociones supresivas para eliminar texto aplican <strong>exclusivamente a párrafos que ya fueron aprobados</strong>. Para ser efectiva requiere <strong>dos tercios (2/3) calificados</strong> de los votos válidos.
                </p>
              </div>

              {/* Selector de Párrafo Aprobado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Seleccione el Párrafo Aprobado a Suprimir *
                </label>
                <select
                  value={selectedParagraphKey}
                  onChange={(e) => setSelectedParagraphKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-rose-600"
                >
                  {allApprovedParagraphs.map(p => (
                    <option key={`${p.chapterId}::${p.paragraphId}`} value={`${p.chapterId}::${p.paragraphId}`}>
                      Cap. {p.chapterNumber} · § {p.number}: {p.originalText.slice(0, 75)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview del Párrafo Aprobado a Suprimir */}
              {selectedParagraph && (
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-rose-900 font-bold">
                    <span>Capítulo {selectedParagraph.chapterNumber}: {selectedParagraph.chapterTitle}</span>
                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">Párrafo a Suprimir § {selectedParagraph.number}</span>
                  </div>
                  <p className="text-slate-700 line-through leading-relaxed">
                    "{selectedParagraph.originalText}"
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título de la Moción Supresiva
                </label>
                <input
                  type="text"
                  value={supTitle}
                  onChange={(e) => setSupTitle(e.target.value)}
                  placeholder={`Ej: Moción Supresiva: Eliminación Párrafo ${selectedParagraph?.number || ''}`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white text-xs font-black rounded-xl shadow flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 cursor-pointer"
                  title="Presentar moción supresiva a la Mesa Directiva para su revisión reglamentaria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Presentar Moción a la Mesa</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 4: VOTACIÓN GENERAL U ORDINARIA */}
          {activeTab === 'GENERAL' && (
            <form onSubmit={handleLaunchGeneral} className="space-y-3.5">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título de la Votación *
                </label>
                <input
                  type="text"
                  required
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="Ej: Aprobación de Resolución sobre Financiamiento Universitario"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Inciso Resolutivo a Votar
                </label>
                <textarea
                  rows={3}
                  value={genDesc}
                  onChange={(e) => setGenDesc(e.target.value)}
                  placeholder="Detalle el contenido vinculante que se somete a sufragio..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Régimen de Quórum
                </label>
                <select
                  value={genQuorum}
                  onChange={(e) => setGenQuorum(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
                >
                  <option value="SIMPLE_MAJORITY">Mayoría Simple (50% + 1)</option>
                  <option value="TWO_THIRDS">Dos Tercios Calificado (2/3)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={hasActiveVoting}
                  title={hasActiveVoting ? 'Ya existe una votación activa en sala' : undefined}
                  className={`px-5 py-2 text-white text-xs font-black rounded-xl shadow ${
                    hasActiveVoting 
                      ? 'bg-slate-400 cursor-not-allowed opacity-60' 
                      : 'bg-[#4A154B] hover:bg-[#5E1B5F] cursor-pointer'
                  }`}
                >
                  Lanzar a Sala
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
