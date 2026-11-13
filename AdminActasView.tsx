import React, { useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  FileText, 
  Printer, 
  Clock, 
  VolumeX, 
  Volume2, 
  ShieldCheck, 
  CheckCircle, 
  Plus, 
  Vote, 
  Layers,
  FileSpreadsheet,
  Edit3,
  Eye,
  Trash2,
  Save,
  CheckCircle2,
  Calendar,
  MapPin,
  Lock,
  X,
  AlertTriangle,
  FileDown,
  QrCode,
  Copy,
  Check,
  Award,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Acta, ActaStatus } from '../../types/plenario';

// Vector Circular Stamp Component for Fe Pública & Secretaría Técnica
const SelloCircularFePublica: React.FC<{ size?: number }> = ({ size = 130 }) => (
  <div 
    className="relative flex items-center justify-center select-none shrink-0" 
    style={{ width: size, height: size }}
    title="Timbre Notarial de Fe Pública - Secretaría Técnica FE-FA"
  >
    <svg viewBox="0 0 200 200" className="w-full h-full text-[#4A154B] drop-shadow-xs">
      <defs>
        <path id="outerCirclePath" d="M 100, 100 m -74, 0 a 74,74 0 1,1 148,0 a 74,74 0 1,1 -148,0" fill="none" />
        <path id="innerCirclePath" d="M 100, 100 m -48, 0 a 48,48 0 0,1 96,0 a 48,48 0 0,1 -96,0" fill="none" />
      </defs>

      {/* Decorative Guilloche Outer Rings */}
      <circle cx="100" cy="100" r="96" fill="none" stroke="#4A154B" strokeWidth="2.5" strokeDasharray="5 3" />
      <circle cx="100" cy="100" r="90" fill="#FAF5FF" stroke="#4A154B" strokeWidth="1.8" />
      <circle cx="100" cy="100" r="64" fill="none" stroke="#D32F2F" strokeWidth="1.2" strokeDasharray="3 2" />
      
      {/* Outer Circumference Text */}
      <text className="text-[10px] font-black uppercase tracking-[0.22em] fill-[#4A154B]">
        <textPath href="#outerCirclePath" startOffset="50%" textAnchor="middle">
          ★ FE PÚBLICA Y VALIDEZ ESTATUTARIA · 2026 ★
        </textPath>
      </text>

      {/* Inner Circumference Text */}
      <text className="text-[8.5px] font-black uppercase tracking-[0.24em] fill-[#D32F2F]">
        <textPath href="#innerCirclePath" startOffset="50%" textAnchor="middle">
          SECRETARÍA TÉCNICA · FE-FA
        </textPath>
      </text>

      {/* Central Shield / Monogram Core */}
      <circle cx="100" cy="100" r="33" fill="#FFFFFF" stroke="#4A154B" strokeWidth="2" />
      <path d="M 82 86 L 100 74 L 118 86 L 118 104 C 118 116 100 126 100 126 C 100 126 82 116 82 104 Z" fill="#F3E8FF" stroke="#4A154B" strokeWidth="1" />
      <text x="100" y="98" textAnchor="middle" className="text-[14px] font-black fill-[#4A154B] font-sans tracking-tight">FA</text>
      <text x="100" y="108" textAnchor="middle" className="text-[6.5px] font-black uppercase tracking-wider fill-[#D32F2F] font-sans">FE-FA</text>
      <text x="100" y="118" textAnchor="middle" className="text-[6px] font-bold uppercase tracking-widest fill-slate-700 font-sans">OFICIAL</text>
    </svg>
  </div>
);

// High-Density Vector QR Verification Matrix
const QrCodeVisual: React.FC<{ hash: string; code: string; size?: number }> = ({ hash, code, size = 110 }) => (
  <div 
    className="relative bg-white p-2 rounded-xl border border-slate-300 flex flex-col items-center justify-center shrink-0 shadow-xs"
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
      {/* Corner Positioning Anchors */}
      <rect x="6" y="6" width="24" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="12" y="12" width="12" height="12" fill="currentColor" />
      
      <rect x="70" y="6" width="24" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="76" y="12" width="12" height="12" fill="currentColor" />
      
      <rect x="6" y="70" width="24" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="12" y="76" width="12" height="12" fill="currentColor" />

      {/* Decorative 2D Data Matrix Patterns */}
      <rect x="36" y="8" width="5" height="5" fill="currentColor" />
      <rect x="44" y="8" width="5" height="5" fill="currentColor" />
      <rect x="56" y="8" width="5" height="5" fill="currentColor" />

      <rect x="36" y="16" width="5" height="5" fill="currentColor" />
      <rect x="50" y="16" width="6" height="5" fill="currentColor" />
      <rect x="60" y="16" width="5" height="5" fill="currentColor" />

      <rect x="36" y="24" width="5" height="5" fill="currentColor" />
      <rect x="44" y="24" width="5" height="5" fill="currentColor" />
      <rect x="54" y="24" width="7" height="5" fill="currentColor" />

      <rect x="8" y="36" width="5" height="5" fill="currentColor" />
      <rect x="18" y="36" width="5" height="5" fill="currentColor" />
      <rect x="28" y="36" width="5" height="5" fill="currentColor" />
      <rect x="36" y="36" width="5" height="5" fill="currentColor" />
      <rect x="56" y="36" width="6" height="5" fill="currentColor" />
      <rect x="70" y="36" width="5" height="5" fill="currentColor" />
      <rect x="84" y="36" width="6" height="5" fill="currentColor" />

      <rect x="8" y="44" width="5" height="5" fill="currentColor" />
      <rect x="22" y="44" width="6" height="5" fill="currentColor" />
      <rect x="68" y="44" width="6" height="5" fill="currentColor" />
      <rect x="80" y="44" width="6" height="5" fill="currentColor" />

      <rect x="8" y="56" width="5" height="5" fill="currentColor" />
      <rect x="20" y="56" width="5" height="5" fill="currentColor" />
      <rect x="36" y="56" width="5" height="5" fill="currentColor" />
      <rect x="46" y="56" width="8" height="5" fill="currentColor" />
      <rect x="62" y="56" width="6" height="5" fill="currentColor" />
      <rect x="78" y="56" width="5" height="5" fill="currentColor" />

      <rect x="36" y="70" width="6" height="5" fill="currentColor" />
      <rect x="48" y="70" width="5" height="5" fill="currentColor" />
      <rect x="60" y="70" width="5" height="5" fill="currentColor" />
      <rect x="76" y="70" width="6" height="5" fill="currentColor" />

      <rect x="36" y="80" width="5" height="5" fill="currentColor" />
      <rect x="44" y="80" width="6" height="5" fill="currentColor" />
      <rect x="56" y="80" width="5" height="5" fill="currentColor" />
      <rect x="84" y="80" width="6" height="5" fill="currentColor" />

      {/* Center Micro Badge */}
      <rect x="41" y="41" width="18" height="18" rx="2" fill="#4A154B" />
      <text x="50" y="54" textAnchor="middle" fill="#FFFFFF" className="text-[7px] font-black font-sans">FA</text>
    </svg>
    <span className="text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-tighter mt-0.5">
      VERIF·QR
    </span>
  </div>
);

export const AdminActasView: React.FC = () => {
  const { 
    currentUser,
    isSecretariaTecnica,
    delegates, 
    motionsHistory, 
    synthesisChapters, 
    forceMuted, 
    setForceMuted, 
    exportActaCSV,
    createNewMotion,
    setActiveTab,
    actas,
    activeActaId,
    setActiveActaId,
    createActa,
    updateActa,
    deleteActa,
    certifyActa
  } = usePlenario();

  const selectedActa = actas.find(a => a.id === activeActaId) || actas[0];

  const [isEditing, setIsEditing] = useState(false);
  const [showCreateActaModal, setShowCreateActaModal] = useState(false);
  const [showNewMotionModal, setShowNewMotionModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // PDF Export configuration toggles
  const [pdfIncludeStamp, setPdfIncludeStamp] = useState(true);
  const [pdfIncludeHash, setPdfIncludeHash] = useState(true);
  const [pdfIncludeQr, setPdfIncludeQr] = useState(true);
  const [pdfIncludeVotesDetail, setPdfIncludeVotesDetail] = useState(true);
  const [pdfIncludeWatermark, setPdfIncludeWatermark] = useState(true);

  // Edit form state
  const [editTitle, setEditTitle] = useState(selectedActa?.sessionTitle || '');
  const [editType, setEditType] = useState<'ORDINARIA' | 'EXTRAORDINARIA' | 'CONSTITUTIVA'>(selectedActa?.sessionType || 'ORDINARIA');
  const [editDate, setEditDate] = useState(selectedActa?.date || '');
  const [editLocation, setEditLocation] = useState(selectedActa?.location || '');
  const [editQuorumText, setEditQuorumText] = useState(selectedActa?.quorumInstallationText || '');
  const [editBodyContent, setEditBodyContent] = useState(selectedActa?.bodyContent || '');
  const [editAgendaTopics, setEditAgendaTopics] = useState<string[]>(selectedActa?.agendaTopics || []);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [editConclusions, setEditConclusions] = useState<string[]>(selectedActa?.conclusions || []);
  const [newConclusionInput, setNewConclusionInput] = useState('');

  // New Acta form state
  const [newActaTitle, setNewActaTitle] = useState('');
  const [newActaType, setNewActaType] = useState<'ORDINARIA' | 'EXTRAORDINARIA' | 'CONSTITUTIVA'>('ORDINARIA');
  const [newActaDate, setNewActaDate] = useState(new Date().toISOString().slice(0, 10));

  // New Motion form state
  const [newMotionTitle, setNewMotionTitle] = useState('');
  const [newMotionDesc, setNewMotionDesc] = useState('');
  const [newMotionQuorum, setNewMotionQuorum] = useState<'SIMPLE_MAJORITY' | 'TWO_THIRDS'>('SIMPLE_MAJORITY');
  const [immediateLaunch, setImmediateLaunch] = useState(true);

  // Sync edit state when active acta changes
  React.useEffect(() => {
    if (selectedActa) {
      setEditTitle(selectedActa.sessionTitle);
      setEditType(selectedActa.sessionType);
      setEditDate(selectedActa.date);
      setEditLocation(selectedActa.location);
      setEditQuorumText(selectedActa.quorumInstallationText);
      setEditBodyContent(selectedActa.bodyContent);
      setEditAgendaTopics([...selectedActa.agendaTopics]);
      setEditConclusions([...selectedActa.conclusions]);
      setIsEditing(false);
    }
  }, [activeActaId, selectedActa]);

  const handlePrintActa = () => {
    const prevTitle = document.title;
    if (selectedActa) {
      document.title = `Acta_Oficial_FE-FA_${selectedActa.code}_Certificada`;
    }
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1200);
  };

  const handleCopyHash = () => {
    if (selectedActa?.integrityHash) {
      navigator.clipboard.writeText(selectedActa.integrityHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleSaveActaEdits = () => {
    if (!selectedActa) return;
    updateActa(selectedActa.id, {
      sessionTitle: editTitle,
      sessionType: editType,
      date: editDate,
      location: editLocation,
      quorumInstallationText: editQuorumText,
      bodyContent: editBodyContent,
      agendaTopics: editAgendaTopics,
      conclusions: editConclusions
    });
    setIsEditing(false);
  };

  const handleAddTopic = () => {
    if (!newTopicInput.trim()) return;
    setEditAgendaTopics(prev => [...prev, newTopicInput.trim()]);
    setNewTopicInput('');
  };

  const handleRemoveTopic = (idx: number) => {
    setEditAgendaTopics(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddConclusion = () => {
    if (!newConclusionInput.trim()) return;
    setEditConclusions(prev => [...prev, newConclusionInput.trim()]);
    setNewConclusionInput('');
  };

  const handleRemoveConclusion = (idx: number) => {
    setEditConclusions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateActaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActaTitle.trim()) return;
    const created = createActa({
      sessionTitle: newActaTitle.trim(),
      sessionType: newActaType,
      date: newActaDate,
      location: 'Plataforma Digital Deliberativa Oficial FE-FA'
    });
    setNewActaTitle('');
    setShowCreateActaModal(false);
    setActiveActaId(created.id);
    setIsEditing(true);
  };

  const handleCreateMotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotionTitle.trim()) return;
    createNewMotion(newMotionTitle.trim(), newMotionDesc.trim(), newMotionQuorum, immediateLaunch);
    setNewMotionTitle('');
    setNewMotionDesc('');
    setShowNewMotionModal(false);
    setActiveTab('plenario');
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 w-full">
      
      {/* 1. Header Control Bar (No print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold font-mono border border-purple-200">
                {isSecretariaTecnica ? 'Secretaría Técnica · Fe Pública y Actas' : 'Repositorio Oficial de Actas · Consulta Abierta'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Plenario Nacional FE-FA</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {isSecretariaTecnica ? 'Gestión Integral de Actas Oficiales y Votaciones' : 'Actas y Resoluciones del Plenario Nacional'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {isSecretariaTecnica 
                ? 'Redacción, modificación, certificación digital, fe pública y exportación formal de actas.' 
                : 'Revisión pública e institucional de actas solemnes, quórums estatutarios y escrutinios nominales.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSecretariaTecnica && (
              <>
                <button
                  onClick={() => setShowCreateActaModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-[#4A154B] to-[#D32F2F] text-white rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nueva Acta</span>
                </button>

                <button
                  onClick={() => setShowNewMotionModal(true)}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer"
                >
                  <Vote className="w-3.5 h-3.5 text-[#4A154B]" />
                  <span>Lanzar Votación</span>
                </button>
              </>
            )}

            {/* Official PDF Export Button with Digital Seals */}
            <button
              onClick={() => setShowPdfModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 via-teal-700 to-[#4A154B] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Exportar acta cerrada con sellos oficiales de integridad criptográfica y fe pública"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-200" />
              <span>Exportar PDF Oficial con Sellos</span>
            </button>

            <button
              onClick={exportActaCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrintActa}
              className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Impresión rápida del documento"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>


        {/* Acta Tabs / Selector */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Actas de Sesión Registradas ({actas.length}):
            </span>
            {selectedActa && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                selectedActa.status === 'CERTIFICADA'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {selectedActa.status === 'CERTIFICADA' ? '✓ Acta Certificada Digitalmente' : '✎ En Borrador / Redacción'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {actas.map(acta => (
              <button
                key={acta.id}
                onClick={() => setActiveActaId(acta.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border cursor-pointer ${
                  selectedActa?.id === acta.id
                    ? 'bg-[#4A154B] text-white border-purple-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{acta.code}: {acta.sessionTitle.length > 25 ? `${acta.sessionTitle.substring(0, 25)}...` : acta.sessionTitle}</span>
                <span className={`w-2 h-2 rounded-full ${acta.status === 'CERTIFICADA' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Operational Toolbar for Selected Acta */}
        {selectedActa && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-4">
            <div className="flex items-center gap-2">
              {selectedActa.status !== 'CERTIFICADA' ? (
                isSecretariaTecnica ? (
                  <>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        isEditing
                          ? 'bg-purple-50 text-purple-900 border-purple-300 ring-2 ring-purple-200'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      <span>{isEditing ? 'Ver Vista Previa' : 'Modificar Acta'}</span>
                    </button>

                    {isEditing && (
                      <button
                        onClick={handleSaveActaEdits}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Modificaciones</span>
                      </button>
                    )}

                    <button
                      onClick={() => certifyActa(selectedActa.id)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer hover:brightness-110"
                      title="Certificar formalmente el acta con sello criptográfico digital"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Certificar y Sellar con Firma Digital</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`¿Confirma eliminar el borrador del ${selectedActa.code}?`)) {
                          deleteActa(selectedActa.id);
                        }
                      }}
                      className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Borrador</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Acta en Proceso de Redacción y Cierre por la Secretaría Técnica</span>
                  </div>
                )
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Acta Certificada e Inmutable · Firmas Criptográficas Válidas</span>
                  </div>

                  <button
                    onClick={() => setShowPdfModal(true)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    title="Configurar y exportar acta con sellos notariales y hash SHA-256"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Exportar PDF con Sello Digital</span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Última modificación: {new Date(selectedActa.lastModifiedAt).toLocaleDateString()} por {selectedActa.lastModifiedBy}
            </div>
          </div>
        )}

      </div>

      {/* 2. Official Document View / Interactive Editor (Printable Area) */}
      {selectedActa && (
        <div className="print-area relative bg-[#FDFDFE] text-slate-900 border border-slate-300 rounded-2xl p-8 lg:p-12 shadow-sm font-serif-doc overflow-hidden">
          
          {/* Watermark Pattern if enabled */}
          {pdfIncludeWatermark && (
            <div className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.035] flex items-center justify-center -rotate-25 z-0">
              <div className="text-center font-sans font-black tracking-widest text-slate-950 text-5xl leading-tight">
                REPÚBLICA DE CHILE<br />
                FRENTE AMPLIO · FE-FA<br />
                FE PÚBLICA Y VALIDEZ OFICIAL<br />
                FOLIO-2026-{selectedActa.code}
              </div>
            </div>
          )}

          <div className="relative z-10">
            {/* Solemn Official Institutional Header */}
            <div className="border-b-2 border-slate-900 pb-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                
                {/* Left: Coat / Emblem & Official Registry Names */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4A154B] to-[#D32F2F] flex flex-col items-center justify-center text-white shrink-0 shadow-sm border border-purple-900/30">
                    <span className="text-xs font-black tracking-tighter">FE-FA</span>
                    <span className="text-[9px] font-bold tracking-widest uppercase text-amber-300">CHILE</span>
                  </div>

                  <div className="flex-1">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#4A154B]">
                      República de Chile · Frente Amplio
                    </div>
                    <div className="text-xs font-sans font-black tracking-wider text-slate-900 uppercase">
                      Frente Estudiantil Nacional · Plenario Nacional de Juventudes
                    </div>
                    <div className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wide">
                      Secretaría Técnica Nacional · Sistema Notarial y Registro de Actas
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-2 font-sans">
                        <label className="block text-xs font-bold text-slate-700">Título de la Sesión:</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-base font-extrabold text-slate-900 focus:outline-none focus:border-[#4A154B]"
                        />
                      </div>
                    ) : (
                      <h2 className="text-2xl font-black text-slate-950 tracking-tight mt-2 font-sans">
                        {selectedActa.code}: {selectedActa.sessionTitle}
                      </h2>
                    )}

                    <p className="text-xs text-slate-600 mt-1 font-sans flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Sesión {selectedActa.sessionType}
                      </span>
                      <span>·</span>
                      <span className="text-slate-700">{selectedActa.location}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Folio & Verification Box */}
                <div className="text-right font-sans text-xs shrink-0 bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs min-w-[220px]">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Folio Oficial Registrado:</div>
                  <div className="font-mono font-black text-slate-950 text-sm">
                    FOLIO-2026-FEFA-{selectedActa.code}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    {selectedActa.date} ({selectedActa.timeStart} - {selectedActa.timeEnd || 'En curso'})
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedActa.status === 'CERTIFICADA' 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {selectedActa.status === 'CERTIFICADA' ? '✓ CERTIFICADA' : '✎ BORRADOR'}
                    </span>
                    <span className="text-[10px] text-purple-900 font-mono font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      SHA-256
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Section 1: Padrón y Quórum de Instalación */}
            <div className="mb-8 font-sans">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A154B] mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 inline-flex items-center justify-center font-bold text-[11px]">1</span>
                <span>Padrón Acreditado y Quórum de Instalación</span>
              </h3>

              {isEditing ? (
                <textarea
                  value={editQuorumText}
                  onChange={(e) => setEditQuorumText(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-[#4A154B]"
                />
              ) : (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-sm leading-relaxed text-slate-800 font-serif-doc">
                    {selectedActa.quorumInstallationText}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-sans">
                    <span>Delegadas/os acreditadas/os con derecho a voto: <strong>{selectedActa.accreditedDelegatesCount}</strong></span>
                    <span className="text-emerald-700 font-semibold">✓ Quórum Estatutario Verificado</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Tabla de la Sesión / Agenda */}
            <div className="mb-8 font-sans">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A154B] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 inline-flex items-center justify-center font-bold text-[11px]">2</span>
                  <span>Tabla de la Sesión y Puntos de Convocatoria</span>
                </h3>
              </div>

              <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                {editAgendaTopics.map((topic, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-800 py-1.5 border-b border-slate-100 last:border-none">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-900 font-bold text-[11px]">2.{idx + 1}</span>
                      <span className="font-medium">{topic}</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTopic(idx)}
                        className="text-rose-600 hover:text-rose-800 text-xs px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      placeholder="Nuevo punto de tabla..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={handleAddTopic}
                      className="px-3 py-1.5 bg-[#4A154B] text-white rounded-lg text-xs font-bold"
                    >
                      Agregar Punto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Registro de Deliberación y Síntesis */}
            <div className="mb-8 font-sans">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A154B] mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 inline-flex items-center justify-center font-bold text-[11px]">3</span>
                <span>Registro de Deliberaciones y Acuerdos de Debate</span>
              </h3>

              {isEditing ? (
                <textarea
                  value={editBodyContent}
                  onChange={(e) => setEditBodyContent(e.target.value)}
                  rows={8}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-[#4A154B]"
                />
              ) : (
                <div className="bg-white p-5 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-800 font-serif-doc whitespace-pre-line shadow-2xs">
                  {selectedActa.bodyContent}
                </div>
              )}
            </div>

            {/* Section 4: Votaciones Nominales y Escrutinio Parlamentario */}
            {pdfIncludeVotesDetail && (
              <div className="mb-8 font-sans print-break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A154B] mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 inline-flex items-center justify-center font-bold text-[11px]">4</span>
                  <span>Escrutinio Nominal de Votaciones Sometidas a la Sala</span>
                </h3>

                <div className="space-y-4">
                  {motionsHistory.map(m => {
                    const votesArr = Object.values(m.votes);
                    const fav = votesArr.filter(v => v.vote === 'A_FAVOR').length;
                    const con = votesArr.filter(v => v.vote === 'EN_CONTRA').length;
                    const abs = votesArr.filter(v => v.vote === 'ABSTENCION').length;
                    const total = votesArr.length;
                    const percentFav = total > 0 ? Math.round((fav / total) * 100) : 0;

                    return (
                      <div key={m.id} className="p-4 rounded-xl border border-slate-300 bg-white shadow-2xs font-sans">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                                {m.code}
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                {m.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 font-serif-doc">
                              {m.description}
                            </p>
                          </div>

                          <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                            m.status === 'APPROVED' 
                              ? 'bg-purple-100 text-purple-900 border border-purple-300' 
                              : m.status === 'VOTING' 
                                ? 'bg-amber-100 text-amber-900' 
                                : 'bg-slate-200 text-slate-800'
                          }`}>
                            {m.status === 'APPROVED' ? 'APROBADA' : m.status === 'VOTING' ? 'EN VOTACIÓN' : m.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-700 font-mono">
                          <div>Emitidos: <strong>{total}</strong></div>
                          <div className="text-purple-900 font-bold">A Favor: {fav} ({percentFav}%)</div>
                          <div className="text-rose-800 font-bold">En Contra: {con}</div>
                          <div className="text-slate-600">Abstención: {abs}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 5: Resoluciones Finales */}
            <div className="mb-8 font-sans print-break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A154B] mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 inline-flex items-center justify-center font-bold text-[11px]">5</span>
                <span>Resoluciones Finales y Acuerdos Vinculantes del Plenario</span>
              </h3>

              <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                {editConclusions.map((conc, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs text-slate-800 py-1.5 border-b border-slate-100 last:border-none gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-700 font-black mt-0.5">✓</span>
                      <span className="font-medium">{conc}</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveConclusion(idx)}
                        className="text-rose-600 hover:text-rose-800 text-xs px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newConclusionInput}
                      onChange={(e) => setNewConclusionInput(e.target.value)}
                      placeholder="Nueva resolución final..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={handleAddConclusion}
                      className="px-3 py-1.5 bg-[#4A154B] text-white rounded-lg text-xs font-bold"
                    >
                      Agregar Resolución
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DIGITAL INTEGRITY VERIFICATION STAMP & OFFICIAL NOTARIAL ATTEST BLOCK */}
            <div className="mt-10 pt-6 border-t-2 border-slate-900 print-break-inside-avoid">
              
              <div className="bg-gradient-to-br from-purple-50/70 via-white to-slate-50 border-2 border-purple-900/30 rounded-2xl p-6 shadow-xs font-sans">
                
                {/* Header of the Stamp Block */}
                <div className="flex items-center justify-between pb-4 border-b border-purple-200/80 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#4A154B] text-white flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-950">
                        Sello Digital de Fe Pública, Validez Estatutaria y Verificación de Integridad
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Expedido y certificado solemnemente conforme a los Estatutos del Frente Amplio y el Frente Estudiantil.
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Inalterabilidad Garantizada
                    </span>
                  </div>
                </div>

                {/* Grid: 1. Circular Stamp | 2. Cryptographic Hash Box | 3. QR Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center mb-6">
                  
                  {/* Circular Vector Stamp */}
                  {pdfIncludeStamp && (
                    <div className="md:col-span-3 flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-200">
                      <SelloCircularFePublica size={125} />
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase mt-1 tracking-tight">
                        Timbre Notarial FE-FA
                      </span>
                    </div>
                  )}

                  {/* Cryptographic SHA-256 Digest & Security Metadata */}
                  <div className={`${pdfIncludeStamp && pdfIncludeQr ? 'md:col-span-6' : 'md:col-span-9'} space-y-2`}>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-2xs font-mono">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5 text-purple-950">
                          <Lock className="w-3.5 h-3.5 text-[#4A154B]" />
                          HASH CRIPTOGRÁFICO INMUTABLE (SHA-256)
                        </span>
                        <button
                          onClick={handleCopyHash}
                          className="no-print text-purple-900 hover:text-purple-700 text-[10px] flex items-center gap-1 font-sans font-bold cursor-pointer"
                        >
                          {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedHash ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>

                      <div className="text-[10px] leading-tight text-slate-900 font-black break-all bg-slate-50 p-2 rounded-lg border border-slate-200 selection:bg-purple-200">
                        {selectedActa.integrityHash}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600 font-sans">
                        <div>
                          <strong>Folio Único:</strong> FOLIO-2026-FEFA-{selectedActa.code}
                        </div>
                        <div>
                          <strong>Algoritmo:</strong> SHA-256 (FIPS PUB 180-4)
                        </div>
                        <div>
                          <strong>Emisión:</strong> {selectedActa.date}
                        </div>
                        <div className="text-emerald-700 font-bold">
                          ✓ Integridad 100% Verificada
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Matrix Validation Code */}
                  {pdfIncludeQr && (
                    <div className="md:col-span-3 flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <QrCodeVisual hash={selectedActa.integrityHash} code={selectedActa.code} size={110} />
                      <div className="text-[8.5px] font-bold text-slate-600 mt-1 uppercase tracking-tight">
                        Escanear para verificar
                      </div>
                      <div className="text-[7.5px] font-mono text-purple-900 break-all leading-none mt-0.5 max-w-[130px]">
                        plenario.juventudes.cl
                      </div>
                    </div>
                  )}

                </div>

                {/* Formal Statement of Faith (Doy Fe) */}
                <div className="p-3.5 bg-white rounded-xl border border-purple-200 text-slate-800 text-xs leading-relaxed font-serif-doc mb-6 shadow-2xs">
                  <strong className="font-sans font-black text-[#4A154B] uppercase tracking-wide mr-1.5">
                    Declaración Solemne de Fe Pública:
                  </strong>
                  DOY FE: En mi condición de titular de la Secretaría Técnica del Frente Estudiantil (FE-FA) del Frente Amplio, certifico con plena fe pública institucional que el presente instrumento constituye transcripción fidedigna, solemne e inalterable de los acuerdos vinculantes, deliberaciones de sala, quórums estatutarios y escrutinios nominales adoptados por el Plenario Nacional. La integridad del presente documento se encuentra amparada bajo hash criptográfico inmutable SHA-256 y firma digital telemática conforme a los estatutos orgánicos partidarios.
                </div>

                {/* Signatures Block */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center font-sans pt-2">
                  {selectedActa.digitalSignatures.map((sig, idx) => (
                    <div key={idx} className="flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="w-full h-10 border-b border-dashed border-slate-400 mb-2 flex items-center justify-center text-xs font-mono italic text-purple-900 font-bold">
                        {sig.status === 'FIRMADO' ? '✓ Firma Digital Certificada' : '• Firma Pendiente'}
                      </div>
                      <div className="text-xs font-black text-slate-950">{sig.signerName}</div>
                      <div className="text-[11px] text-purple-900 font-bold">{sig.role}</div>
                      <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{sig.token}</div>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Token Validado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>

        </div>
      )}


      {/* Modal: Crear Nueva Acta */}
      {showCreateActaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#4A154B]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Crear Nueva Acta Oficial de Sesión
                </h3>
              </div>
              <button 
                onClick={() => setShowCreateActaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Sesión
                </label>
                <input
                  type="text"
                  required
                  value={newActaTitle}
                  onChange={(e) => setNewActaTitle(e.target.value)}
                  placeholder="Ej: Plenario Extraordinario: Debate sobre Aranceles y Salud Mental"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Sesión
                  </label>
                  <select
                    value={newActaType}
                    onChange={(e) => setNewActaType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="ORDINARIA">Ordinaria</option>
                    <option value="EXTRAORDINARIA">Extraordinaria</option>
                    <option value="CONSTITUTIVA">Constitutiva</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Celebración
                  </label>
                  <input
                    type="date"
                    required
                    value={newActaDate}
                    onChange={(e) => setNewActaDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateActaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Generar Borrador de Acta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aperturar Nueva Moción (Votación) */}
      {showNewMotionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-[#4A154B]" />
                <h3 className="text-base font-black text-slate-900">
                  Lanzar Votación Parlamentaria en la Sala
                </h3>
              </div>
              <button 
                onClick={() => setShowNewMotionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMotionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Moción / Artículo
                </label>
                <input
                  type="text"
                  required
                  value={newMotionTitle}
                  onChange={(e) => setNewMotionTitle(e.target.value)}
                  placeholder="Ej: Indicación N° 4: Paridad de Género en Directorios Universitarios"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción o Inciso a Votar
                </label>
                <textarea
                  rows={3}
                  required
                  value={newMotionDesc}
                  onChange={(e) => setNewMotionDesc(e.target.value)}
                  placeholder="Detalle el contenido resolutivo que se someterá a votación de los delegados..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Régimen de Quórum
                </label>
                <select
                  value={newMotionQuorum}
                  onChange={(e) => setNewMotionQuorum(e.target.value as 'SIMPLE_MAJORITY' | 'TWO_THIRDS')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4A154B] font-medium"
                >
                  <option value="SIMPLE_MAJORITY">Mayoría Simple (50% + 1)</option>
                  <option value="TWO_THIRDS">Dos Tercios (2/3) - Normas estatutarias y programa de fondo</option>
                </select>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="actaImmediateLaunch"
                  checked={immediateLaunch}
                  onChange={(e) => setImmediateLaunch(e.target.checked)}
                  className="rounded text-[#4A154B] focus:ring-[#4A154B] h-4 w-4 cursor-pointer"
                />
                <label htmlFor="actaImmediateLaunch" className="text-xs font-semibold text-purple-950 cursor-pointer">
                  Habilitar votación en curso inmediatamente (se abre la cabina de votación en vivo)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewMotionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#4A154B] to-[#D32F2F] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  {immediateLaunch ? 'Lanzar Votación Inmediata' : 'Crear Moción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Expedición y Exportación de Acta Oficial en PDF con Sellos de Integridad */}
      {showPdfModal && selectedActa && (
        <div className="no-print fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150 my-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-[#4A154B] text-white flex items-center justify-center shadow-md shrink-0">
                  <ShieldCheck className="w-7 h-7 text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                      Fe Pública Criptográfica
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      FOLIO-2026-FEFA-{selectedActa.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight mt-0.5">
                    Expedición de Acta Oficial en Formato PDF
                  </h3>
                  <p className="text-xs text-slate-600">
                    Generación formal con diseño institucional y sellos digitales de verificación de integridad.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Draft: Prompt to Certify */}
            {selectedActa.status !== 'CERTIFICADA' ? (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      Acta Actualmente en Borrador / No Certificada
                    </h4>
                    <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                      Para estampar los sellos definitivos de inmutabilidad y emitir el folio legal irreversible, se requiere certificar formalmente el acta con firma digital de la Secretaría Técnica.
                    </p>
                  </div>
                </div>

                {isSecretariaTecnica && (
                  <button
                    onClick={() => {
                      certifyActa(selectedActa.id);
                    }}
                    className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm cursor-pointer shrink-0"
                  >
                    Certificar y Sellar Ahora
                  </button>
                )}
              </div>
            ) : (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-black text-emerald-950">
                      Acta Certificada Oficialmente por Secretaría Técnica
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Hash SHA-256 e inmutabilidad garantizada conforme al estatuto orgánico.
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] font-bold text-emerald-900">
                  FECHA: {selectedActa.date}
                </div>
              </div>
            )}

            {/* Seal & Document Configuration Controls */}
            <div className="mb-6">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#4A154B]" />
                <span>Sellos Digitales y Elementos de Seguridad a Estampar:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={pdfIncludeStamp}
                    onChange={(e) => setPdfIncludeStamp(e.target.checked)}
                    className="mt-0.5 rounded text-[#4A154B] focus:ring-[#4A154B] h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Timbre Notarial Circular FE-FA</div>
                    <div className="text-[11px] text-slate-500">Escudo vectorial y fe pública de secretaría</div>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={pdfIncludeHash}
                    onChange={(e) => setPdfIncludeHash(e.target.checked)}
                    className="mt-0.5 rounded text-[#4A154B] focus:ring-[#4A154B] h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Sello Criptográfico SHA-256</div>
                    <div className="text-[11px] text-slate-500">Resumen inmutable y token de verificación</div>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={pdfIncludeQr}
                    onChange={(e) => setPdfIncludeQr(e.target.checked)}
                    className="mt-0.5 rounded text-[#4A154B] focus:ring-[#4A154B] h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Matriz QR Telemática Oficial</div>
                    <div className="text-[11px] text-slate-500">Enlace directo a repositorio de validación</div>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={pdfIncludeVotesDetail}
                    onChange={(e) => setPdfIncludeVotesDetail(e.target.checked)}
                    className="mt-0.5 rounded text-[#4A154B] focus:ring-[#4A154B] h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Escrutinio Nominal Detallado</div>
                    <div className="text-[11px] text-slate-500">Registro de votos y mayorías de la sala</div>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 transition-colors sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={pdfIncludeWatermark}
                    onChange={(e) => setPdfIncludeWatermark(e.target.checked)}
                    className="mt-0.5 rounded text-[#4A154B] focus:ring-[#4A154B] h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Marca de Agua Institucional de Fondo</div>
                    <div className="text-[11px] text-slate-500">Filigrana de seguridad antifalsificación en páginas impresas</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Live Stamp Preview Card */}
            <div className="mb-6 bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold mb-3">
                <span className="flex items-center gap-1.5 text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Muestra en Vivo del Sello de Integridad
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedActa.code}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="p-1 bg-white rounded-xl shrink-0">
                  <SelloCircularFePublica size={90} />
                </div>

                <div className="flex-1 space-y-1.5 text-left w-full">
                  <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                    Certificación Criptográfica Inmutable:
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 break-all bg-black/60 p-2 rounded border border-slate-800 select-all">
                    {selectedActa.integrityHash}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans pt-1">
                    <span>Folio: <strong>FOLIO-2026-FEFA-{selectedActa.code}</strong></span>
                    <button
                      onClick={handleCopyHash}
                      className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? 'Hash Copiado' : 'Copiar Hash'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                * Se abrirá el cuadro de diálogo oficial. Seleccione <strong>"Guardar como PDF"</strong>.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPdfModal(false);
                    handlePrintActa();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-[#4A154B] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-emerald-200" />
                  <span>Descargar / Imprimir PDF Oficial</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

