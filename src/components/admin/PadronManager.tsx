import React, { useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { 
  Users, 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  ShieldCheck, 
  History, 
  Check, 
  UserPlus, 
  X,
  AlertTriangle,
  Edit2,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { Delegate, ChileanRegion, UserRole } from '../../types/plenario';

const CHILEAN_REGIONS: ChileanRegion[] = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes'
];

export const PadronManager: React.FC = () => {
  const { 
    delegates, 
    currentUser, 
    isSecretariaTecnica,
    importDelegatesCSV, 
    exportPadronCSV, 
    deleteDelegate, 
    updateDelegate,
    addDelegate,
    auditLogs 
  } = usePlenario();

  const [activeSubTab, setActiveSubTab] = useState<'PADRON' | 'AUDITORIA'>('PADRON');
  const [searchQuery, setSearchQuery] = useState('');
  const [csvUploadNotice, setCsvUploadNotice] = useState<string | null>(null);

  // Add delegate form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRegion, setNewRegion] = useState<ChileanRegion>('Metropolitana');
  const [newRole, setNewRole] = useState<UserRole>('DELEGATE');
  const [newAccessKey, setNewAccessKey] = useState('');
  const [showNewAccessKey, setShowNewAccessKey] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit delegate form state
  const [delegateToEdit, setDelegateToEdit] = useState<Delegate | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRegion, setEditRegion] = useState<ChileanRegion>('Metropolitana');
  const [editRole, setEditRole] = useState<UserRole>('DELEGATE');
  const [editAccessKey, setEditAccessKey] = useState('');
  const [showEditAccessKey, setShowEditAccessKey] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Per-row reveal toggle for Clave de Acceso column
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});

  // Delete delegate confirmation modal state
  const [delegateToDelete, setDelegateToDelete] = useState<Delegate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter delegates by search term
  const filteredDelegates = delegates.filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = await importDelegatesCSV(text);
        if (result.success) {
          setCsvUploadNotice(`Se importaron exitosamente ${result.count} delegados al padrón.`);
        } else {
          setCsvUploadNotice(`Error en importación: ${result.error}`);
        }
        setTimeout(() => setCsvUploadNotice(null), 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadSampleCSV = () => {
    const sample = `nombre,usuario,region,rol
Camila Vallejo,camila.vallejo,Metropolitana,DELEGATE
Gabriel Boric,gabriel.boric,Magallanes,DELEGATE
Daniela Serrano,daniela.serrano,Valparaíso,DELEGATE`;
    
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Padron_FE-FA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = async () => {
    if (!delegateToDelete || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    const res = await deleteDelegate(delegateToDelete.id);
    setIsDeleting(false);
    if (res.success) {
      setDelegateToDelete(null);
    } else {
      setDeleteError(res.error || 'No se pudo eliminar al usuario');
    }
  };

  const handleAddDelegateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || isAdding) return;
    const trimmedKey = newAccessKey.trim();
    if (trimmedKey.length > 0 && (trimmedKey.length < 4 || trimmedKey.length > 64)) {
      setAddError('La clave inicial debe tener entre 4 y 64 caracteres (o dejarse vacía para primer ingreso).');
      return;
    }
    setAddError(null);
    setIsAdding(true);

    const res = await addDelegate({
      name: newName.trim(),
      username: newUsername.trim().toLowerCase(),
      region: newRegion,
      role: newRole,
      accessKey: trimmedKey || undefined
    });

    setIsAdding(false);
    if (res.success) {
      setNewName('');
      setNewUsername('');
      setNewAccessKey('');
      setShowNewAccessKey(false);
      setShowAddModal(false);
    } else {
      setAddError(res.error || 'No se pudo acreditar al usuario.');
    }
  };

  const openEditModal = (d: Delegate) => {
    setDelegateToEdit(d);
    setEditName(d.name || '');
    setEditUsername(d.username || '');
    setEditRegion(d.region);
    setEditRole(d.role);
    setEditAccessKey(d.accessKey || '');
    setShowEditAccessKey(true);
    setEditError(null);
  };

  const handleEditDelegateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateToEdit || isEditing) return;
    if (!editName.trim() || !editUsername.trim()) return;
    const trimmedKey = editAccessKey.trim();
    if (trimmedKey.length > 0 && (trimmedKey.length < 4 || trimmedKey.length > 64)) {
      setEditError('La clave de acceso debe tener entre 4 y 64 caracteres (o estar vacía para solicitar nueva clave).');
      return;
    }
    setEditError(null);
    setIsEditing(true);

    const res = await updateDelegate(delegateToEdit.id, {
      name: editName.trim(),
      username: editUsername.trim().toLowerCase(),
      region: editRegion,
      role: editRole,
      accessKey: trimmedKey
    });

    setIsEditing(false);
    if (res.success) {
      setDelegateToEdit(null);
    } else {
      setEditError(res.error || 'No se pudo modificar al usuario.');
    }
  };

  // Restrict view if user is not Secretaría Técnica
  if (!isSecretariaTecnica) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Acceso Exclusivo a la Secretaría Técnica
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            La gestión del padrón electoral, modificación, adición y revocación de credenciales de delegadas y delegados es atribución privativa de la <strong>Secretaría Técnica</strong> para salvaguardar la fe pública de la asamblea.
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 inline-block font-medium">
            Usuario actual: <strong className="text-slate-900 dark:text-slate-100">{currentUser?.name || 'Invitado'}</strong> ({currentUser?.role || 'Sin rol'})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 w-full min-w-0">
      
      {/* Header & Sub-tab switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 text-xs font-bold font-mono border border-purple-200 dark:border-purple-800">
                Secretaría Técnica · Padrón Oficial
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Plenario Nacional FE-FA</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Gestión Electoral del Padrón y Trazabilidad Inmutable
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Administración de credenciales, adición, edición y revocación de delegadas/os con registro de auditoría.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveSubTab('PADRON')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSubTab === 'PADRON' 
                  ? 'bg-[#4A154B] text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Padrón Acreditado ({delegates.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('AUDITORIA')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSubTab === 'AUDITORIA' 
                  ? 'bg-[#4A154B] text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Auditoría ({auditLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main SubTab Content */}
      {activeSubTab === 'PADRON' ? (
        <div className="space-y-4">
          
          {/* Action Strip: Add user, CSV Upload & Download */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, región o nombre de usuario..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setAddError(null);
                  setNewAccessKey('');
                  setShowNewAccessKey(false);
                  setShowAddModal(true);
                }}
                className="px-3.5 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Agregar Nuevo Usuario</span>
              </button>

              <button
                onClick={downloadSampleCSV}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Plantilla CSV
              </button>

              <button
                onClick={exportPadronCSV}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Exportar Padrón</span>
              </button>

              <label className="cursor-pointer px-3.5 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800 transition-all flex items-center gap-1.5 shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Carga Masiva CSV</span>
                <input 
                  type="file" 
                  accept=".csv,text/csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

          </div>

          {/* Upload notice notification if any */}
          {csvUploadNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{csvUploadNotice}</span>
            </div>
          )}

          {/* Delegates Table with Edit and Delete actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3.5 px-4 font-bold">Delegada/o</th>
                    <th className="py-3.5 px-4 font-bold">Región & Bancada</th>
                    <th className="py-3.5 px-4 font-bold">Rol Institucional</th>
                    <th className="py-3.5 px-4 font-bold">Atribución de Voto</th>
                    <th className="py-3.5 px-4 font-bold">Clave de Acceso</th>
                    <th className="py-3.5 px-4 text-right font-bold">Acciones (Secretaría)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                  {filteredDelegates.map((d: Delegate) => {
                    const isSelf = currentUser?.id === d.id;

                    return (
                      <tr 
                        key={d.id} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                          isSelf ? 'bg-purple-50/50 dark:bg-purple-950/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4A154B] to-[#D32F2F] flex items-center justify-center font-bold text-white text-[10px] overflow-hidden shrink-0 shadow-xs">
                              {d.avatarUrl ? (
                                <img 
                                  src={d.avatarUrl} 
                                  alt={d.name} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                d.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{d.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-[#4A154B] text-white px-1.5 py-0.5 rounded font-mono font-normal">
                                    Sesión Actual
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">@{d.username}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-purple-900 dark:text-purple-300 font-bold">
                            {d.region}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.role === 'SECRETARY' 
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800' 
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {d.role === 'SECRETARY' ? 'Secretaría Técnica' : 'Delegada/o Regional'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {d.role === 'DELEGATE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                              Voz y Voto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[10px] border border-slate-200 dark:border-slate-700">
                              Mesa / Fe Pública (Sin Voto)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {d.accessKey && d.accessKey.trim().length > 0 ? (
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                              <KeyRound className="w-3 h-3 text-[#4A154B] dark:text-purple-300 shrink-0" />
                              <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 select-all">
                                {revealedKeyIds[d.id] ? d.accessKey : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedKeyIds((prev) => ({
                                    ...prev,
                                    [d.id]: !prev[d.id]
                                  }))
                                }
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-0.5"
                                title={revealedKeyIds[d.id] ? 'Ocultar clave' : 'Ver clave'}
                                aria-label={revealedKeyIds[d.id] ? 'Ocultar clave' : 'Ver clave'}
                              >
                                {revealedKeyIds[d.id] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[10px] border border-amber-200 dark:border-amber-800">
                              Pendiente (1er ingreso)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => openEditModal(d)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition-colors inline-flex items-center gap-1 font-bold cursor-pointer"
                              title="Modificar datos del usuario"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                              <span className="hidden sm:inline">Modificar</span>
                            </button>

                            {isSelf ? (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic px-2">
                                (Activo)
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setDelegateToDelete(d);
                                  setDeleteError(null);
                                }}
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs transition-colors inline-flex items-center gap-1 font-bold cursor-pointer"
                                title="Eliminar del padrón"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span className="hidden sm:inline">Eliminar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Immutable Audit Log View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Libro de Trazabilidad y Seguridad Inmutable</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cada voto emitido, rectificación, modificación de padrón, y apertura de votación queda sellada con hash SHA-256 e IP.
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
              Registros totales: {auditLogs.length}
            </div>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {log.isoTime.substring(11, 19)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900 dark:text-purple-300 uppercase font-mono text-[10px]">
                        [{log.action}]
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {log.delegateName}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        (IP: {log.ipAddress})
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5 leading-relaxed font-medium">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 md:text-right bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500">Hash:</span> {log.integrityHash}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Modal: Edit Delegate */}
      {delegateToEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#4A154B] dark:text-purple-300" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Modificar Usuario del Padrón
                </h3>
              </div>
              <button 
                onClick={() => setDelegateToEdit(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDelegateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="ej: gabriela.mistral"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Región / Bancada
                  </label>
                  <select
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value as ChileanRegion)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    {CHILEAN_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="DELEGATE">Delegada/o (Con Voto)</option>
                    <option value="SECRETARY">Secretaría Técnica</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Clave de Acceso Personal
                  </label>
                  {editAccessKey.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditAccessKey('')}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restablecer (pedir nueva al ingresar)</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showEditAccessKey ? 'text' : 'password'}
                    maxLength={64}
                    value={editAccessKey}
                    onChange={(e) => setEditAccessKey(e.target.value)}
                    placeholder="Vacío = el usuario creará clave en su próximo ingreso"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditAccessKey((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showEditAccessKey ? 'Ocultar clave' : 'Ver clave'}
                  >
                    {showEditAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Puedes visualizar o editar esta clave (mín. 4 caracteres), o dejarla vacía para forzar la creación de una nueva clave en el próximo ingreso.
                </p>
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => setDelegateToEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-60"
                >
                  {isEditing ? 'Guardando...' : 'Guardar Modificaciones'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Delegate */}
      {delegateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Confirmar Eliminación de Usuario
                </h3>
                <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Secretaría Técnica · Revocación Electoral</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              ¿Está seguro de revocar las credenciales y eliminar a <strong className="text-slate-900 dark:text-slate-100">{delegateToDelete.name}</strong> ({delegateToDelete.region}) del Padrón Oficial?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 mb-4 font-mono space-y-1">
              <div>Usuario: @{delegateToDelete.username}</div>
              <div>Rol: {delegateToDelete.role}</div>
              <div>Esta revocación quedará registrada en el Log de Auditoría Inmutable.</div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs mb-4 font-bold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDelegateToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar del Padrón'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Delegate Manually */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#4A154B] dark:text-purple-300" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Acreditar Nueva/o Delegada/o al Padrón
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDelegateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Gabriela Mistral Rojas"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ej: gabriela.mistral"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Región / Bancada
                  </label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value as ChileanRegion)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    {CHILEAN_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="DELEGATE">Delegada/o (Con Voto)</option>
                    <option value="SECRETARY">Secretaría Técnica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clave de Acceso Inicial (Opcional)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showNewAccessKey ? 'text' : 'password'}
                    maxLength={64}
                    value={newAccessKey}
                    onChange={(e) => setNewAccessKey(e.target.value)}
                    placeholder="Dejar vacío para que la cree en su primer ingreso"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white dark:focus:bg-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewAccessKey((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showNewAccessKey ? 'Ocultar clave' : 'Ver clave'}
                  >
                    {showNewAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Opcional (mín. 4 caracteres). Si se deja vacío, la/el delegada/o deberá definir su clave al ingresar por primera vez.
                </p>
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold">
                  {addError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isAdding}
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-60"
                >
                  {isAdding ? 'Acreditando...' : 'Acreditar al Padrón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
