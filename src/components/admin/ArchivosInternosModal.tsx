import React, { useState, useEffect, useRef } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  FolderLock, 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  HardDrive, 
  ShieldCheck, 
  Sparkles,
  FileCheck
} from 'lucide-react';

interface ArchivosInternosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchivosInternosModal: React.FC<ArchivosInternosModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    storageStatus,
    saveToInternalStorage,
    uploadFileToInternalStorage,
    listInternalFiles,
    loadDemoTemplate,
    resetToCleanLaunch,
    delegates,
    motionsHistory,
    synthesisChapters,
    actas
  } = usePlenario();

  const [files, setFiles] = useState<Array<{ id: string; name: string; sizeBytes: number; createdAt: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const list = await listInternalFiles();
      setFiles(list);
    } catch {
      // Ignorar si el endpoint está iniciando
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSave = async () => {
    setLoading(true);
    const success = await saveToInternalStorage();
    setLoading(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadStatus('Cargando archivo a la carpeta interna /data/uploads...');

    try {
      const text = await file.text();
      const res = await uploadFileToInternalStorage(file.name, text, file.type, 'general');
      if (res.success) {
        setUploadStatus(`Archivo «${file.name}» cargado correctamente en /data/uploads`);
        await fetchFiles();
      } else {
        setUploadStatus(`Error: ${res.error || 'No se pudo subir'}`);
      }
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadStatus(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportBackup = () => {
    const fullState = {
      version: 'fe_fa_v2',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      delegates,
      motionsHistory,
      synthesisChapters,
      actas
    };
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_Plenario_FE-FA_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.delegates || parsed.motionsHistory || parsed.synthesisChapters) {
          // Guardar directamente en el servidor
          await fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          window.location.reload();
        } else {
          alert('El archivo no tiene el formato de respaldo válido del Plenario.');
        }
      } catch {
        alert('Error al leer el archivo JSON de respaldo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-[#4A154B] to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <FolderLock className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  Carpeta Interna de Archivo & Persistencia
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                  Activa
                </span>
              </div>
              <p className="text-[11px] text-purple-200">
                Almacenamiento permanente en servidor (/data) · Sin pérdida al cerrar la página
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Storage Status Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#4A154B]" />
                <span>Estado del Disco y Carpeta Interna</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Servidor conectado</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Padrón</span>
                <span className="font-black text-slate-800 text-sm font-mono">{delegates.length}</span>
                <span className="text-[9px] text-slate-500 block">registrados</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Votaciones</span>
                <span className="font-black text-slate-800 text-sm font-mono">{motionsHistory.length}</span>
                <span className="text-[9px] text-slate-500 block">registradas</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Presíntesis</span>
                <span className="font-black text-slate-800 text-sm font-mono">{synthesisChapters.length}</span>
                <span className="text-[9px] text-slate-500 block">capítulos</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Actas</span>
                <span className="font-black text-slate-800 text-sm font-mono">{actas.length}</span>
                <span className="text-[9px] text-slate-500 block">oficiales</span>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-500 leading-snug pt-1">
              Los archivos se almacenan en la carpeta interna <strong>/data/plenario_store.json</strong> con respaldo rotativo automático en <strong>/data/backups/</strong> cada vez que se produce una modificación.
            </p>
          </div>

          {/* Quick Actions Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Guardar ahora */}
            <button
              onClick={handleManualSave}
              disabled={loading}
              className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#4A154B] rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-black flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Sincronizar a Disco Ahora</span>
                </div>
                <div className="text-[10px] text-purple-800 mt-0.5">
                  {savedSuccess ? '¡Guardado correctamente en /data!' : 'Forzar escritura inmediata en el servidor'}
                </div>
              </div>
            </button>

            {/* Subir archivo a /data/uploads */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full h-full p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Cargar Archivo a /data/uploads</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    CSV de padrón, actas, o documentos
                  </div>
                </div>
              </button>
            </div>
          </div>

          {uploadStatus && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadStatus}</span>
            </div>
          )}

          {/* Archivos en /data/uploads */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#4A154B]" />
                <span>Archivos Guardados en la Carpeta Interna</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {files.length} archivo(s)
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-36 overflow-y-auto">
              {files.length > 0 ? (
                <div className="divide-y divide-slate-200/70 text-xs">
                  {files.map(f => (
                    <div key={f.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-white transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono text-slate-800 text-[11px] truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-500 font-mono">
                        <span>{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>{new Date(f.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs italic">
                  Aún no hay archivos cargados en /data/uploads. Puede cargar el CSV del Padrón Electoral o la Presíntesis.
                </div>
              )}
            </div>
          </div>

          {/* Copias de Respaldo y Restauración */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800">
              Copias de Seguridad Externa (JSON)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Copia de Seguridad JSON</span>
              </button>

              <input
                type="file"
                ref={restoreInputRef}
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
              <button
                onClick={() => restoreInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar desde Archivo JSON</span>
              </button>
            </div>
          </div>

          {/* Configuración de Lanzamiento / Plantilla de Prueba */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>Configuración de Lanzamiento Oficial</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-snug">
              Para el lanzamiento oficial, la plataforma inicia en limpio con la cuenta de la Secretaría Técnica y Pablo Rodríguez, para que configure el padrón real y la presíntesis. Si desea hacer un ensayo previo, puede cargar la plantilla de prueba.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  if (confirm('¿Desea restablecer todos los datos al estado de lanzamiento en limpio (0 votaciones, 0 capítulos simulados)?')) {
                    resetToCleanLaunch();
                    onClose();
                  }
                }}
                className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
              >
                Limpiar a Estado de Lanzamiento
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Desea cargar la plantilla de prueba con capítulos y delegados de ensayo?')) {
                    loadDemoTemplate();
                    onClose();
                  }
                }}
                className="px-3 py-1 bg-white hover:bg-purple-50 text-[#4A154B] border border-purple-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-purple-700" />
                <span>Cargar Plantilla de Prueba (Ensayo)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500">
            Almacenamiento persistente en /data · FE-FA 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
