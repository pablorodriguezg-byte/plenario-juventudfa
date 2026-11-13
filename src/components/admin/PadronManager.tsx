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
  UserCheck
} from 'lucide-react';
import { Delegate, ChileanRegion, GenderIdentity, UserRole } from '../../types/plenario';

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
  const [newEmail, setNewEmail] = useState('');
  const [newRegion, setNewRegion] = useState<ChileanRegion>('Metropolitana');
  const [newGender, setNewGender] = useState<GenderIdentity>('Femenino');
  const [newRole, setNewRole] = useState<UserRole>('DELEGATE');

  // Edit delegate form state
  const [delegateToEdit, setDelegateToEdit] = useState<Delegate | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegion, setEditRegion] = useState<ChileanRegion>('Metropolitana');
  const [editGender, setEditGender] = useState<GenderIdentity>('Femenino');
  const [editRole, setEditRole] = useState<UserRole>('DELEGATE');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete delegate confirmation modal state
  const [delegateToDelete, setDelegateToDelete] = useState<Delegate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter delegates by search term
  const filteredDelegates = delegates.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = importDelegatesCSV(text);
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
    const sample = `nombre,email,region,genero,rol
Camila Vallejo,c.vallejo@fe-fa.cl,Metropolitana,Femenino,DELEGATE
Gabriel Boric,g.boric@fe-fa.cl,Magallanes,Masculino,DELEGATE
Daniela Serrano,d.serrano@fe-fa.cl,Valparaíso,Femenino,DELEGATE`;
    
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Padron_FE-FA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = () => {
    if (!delegateToDelete) return;
    setDeleteError(null);
    const res = deleteDelegate(delegateToDelete.id);
    if (res.success) {
      setDelegateToDelete(null);
    } else {
      setDeleteError(res.error || 'No se pudo eliminar al usuario');
    }
  };

  const handleAddDelegateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    addDelegate({
      name: newName.trim(),
      email: newEmail.trim(),
      region: newRegion,
      gender: newGender,
      role: newRole
    });

    setNewName('');
    setNewEmail('');
    setShowAddModal(false);
  };

  const openEditModal = (d: Delegate) => {
    setDelegateToEdit(d);
    setEditName(d.name);
    setEditEmail(d.email);
    setEditRegion(d.region);
    setEditGender(d.gender);
    setEditRole(d.role);
    setEditError(null);
  };

  const handleEditDelegateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateToEdit) return;
    if (!editName.trim() || !editEmail.trim()) return;

    const res = updateDelegate(delegateToEdit.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      region: editRegion,
      gender: editGender,
      role: editRole
    });

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
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Acceso Exclusivo a la Secretaría Técnica
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            La gestión del padrón electoral, modificación, adición y revocación de credenciales de delegadas y delegados es atribución privativa de la <strong>Secretaría Técnica</strong> para salvaguardar la fe pública de la asamblea.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 inline-block font-medium">
            Usuario actual: <strong className="text-slate-900">{currentUser?.name || 'Invitado'}</strong> ({currentUser?.role || 'Sin rol'})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 w-full min-w-0">
      
      {/* Header & Sub-tab switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold font-mono border border-purple-200">
                Secretaría Técnica · Padrón Oficial
              </span>
              <span className="text-xs text-slate-500 font-semibold">Plenario Nacional FE-FA</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Gestión Electoral del Padrón y Trazabilidad Inmutable
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Administración de credenciales, adición, edición y revocación de delegadas/os con registro de auditoría.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab('PADRON')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeSubTab === 'PADRON' 
                  ? 'bg-[#4A154B] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
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
                  : 'text-slate-600 hover:text-slate-900'
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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, región o correo..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#4A154B] focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Agregar Nuevo Usuario</span>
              </button>

              <button
                onClick={downloadSampleCSV}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-300 cursor-pointer"
              >
                Plantilla CSV
              </button>

              <button
                onClick={exportPadronCSV}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Exportar Padrón</span>
              </button>

              <label className="cursor-pointer px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold border border-purple-200 transition-all flex items-center gap-1.5 shadow-xs">
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
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{csvUploadNotice}</span>
            </div>
          )}

          {/* Delegates Table with Edit and Delete actions */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                    <th className="py-3.5 px-4 font-bold">Delegada/o</th>
                    <th className="py-3.5 px-4 font-bold">Región & Bancada</th>
                    <th className="py-3.5 px-4 font-bold">Rol Institucional</th>
                    <th className="py-3.5 px-4 font-bold">Atribución de Voto</th>
                    <th className="py-3.5 px-4 text-right font-bold">Acciones (Secretaría)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {filteredDelegates.map((d: Delegate) => {
                    const isSelf = currentUser?.id === d.id;

                    return (
                      <tr 
                        key={d.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelf ? 'bg-purple-50/50' : ''
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
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{d.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-[#4A154B] text-white px-1.5 py-0.5 rounded font-mono font-normal">
                                    Sesión Actual
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">{d.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-purple-900 font-bold">
                            {d.region}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {d.gender}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.role === 'SECRETARY' 
                              ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {d.role === 'SECRETARY' ? 'Secretaría Técnica' : 'Delegada/o Regional'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {d.role === 'DELEGATE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Voz y Voto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px] border border-slate-200">
                              Mesa / Fe Pública (Sin Voto)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => openEditModal(d)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs transition-colors inline-flex items-center gap-1 font-bold cursor-pointer"
                              title="Modificar datos del usuario"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden sm:inline">Modificar</span>
                            </button>

                            {isSelf ? (
                              <span className="text-[10px] text-slate-400 italic px-2">
                                (Activo)
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setDelegateToDelete(d);
                                  setDeleteError(null);
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs transition-colors inline-flex items-center gap-1 font-bold cursor-pointer"
                                title="Eliminar del padrón"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Libro de Trazabilidad y Seguridad Inmutable</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cada voto emitido, rectificación, modificación de padrón, y apertura de votación queda sellada con hash SHA-256 e IP.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-mono font-medium">
              Registros totales: {auditLogs.length}
            </div>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {log.isoTime.substring(11, 19)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900 uppercase font-mono text-[10px]">
                        [{log.action}]
                      </span>
                      <span className="font-bold text-slate-900">
                        {log.delegateName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        (IP: {log.ipAddress})
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs mt-0.5 leading-relaxed font-medium">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono shrink-0 md:text-right bg-white px-2.5 py-1 rounded border border-slate-200">
                  <span className="text-slate-400">Hash:</span> {log.integrityHash}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Modal: Edit Delegate */}
      {delegateToEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#4A154B]" />
                <h3 className="text-base font-black text-slate-900">
                  Modificar Usuario del Padrón
                </h3>
              </div>
              <button 
                onClick={() => setDelegateToEdit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDelegateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Región / Bancada
                  </label>
                  <select
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value as ChileanRegion)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    {CHILEAN_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Género (Paridad)
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as GenderIdentity)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="No-binario">No-binario</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="DELEGATE">Delegada/o (Con Voto)</option>
                    <option value="SECRETARY">Secretaría Técnica</option>
                  </select>
                </div>
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDelegateToEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Guardar Modificaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Delegate */}
      {delegateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirmar Eliminación de Usuario
                </h3>
                <span className="text-xs text-rose-700 font-semibold">Secretaría Técnica · Revocación Electoral</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              ¿Está seguro de revocar las credenciales y eliminar a <strong className="text-slate-900">{delegateToDelete.name}</strong> ({delegateToDelete.region}) del Padrón Oficial?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 mb-4 font-mono space-y-1">
              <div>Correo: {delegateToDelete.email}</div>
              <div>Rol: {delegateToDelete.role}</div>
              <div>Esta revocación quedará registrada en el Log de Auditoría Inmutable.</div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs mb-4 font-bold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDelegateToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar del Padrón</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Delegate Manually */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#4A154B]" />
                <h3 className="text-base font-black text-slate-900">
                  Acreditar Nueva/o Delegada/o al Padrón
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDelegateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Gabriela Mistral Rojas"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ej: gabriela@fe-fa.cl"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Región / Bancada
                  </label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value as ChileanRegion)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    {CHILEAN_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Género (Paridad)
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as GenderIdentity)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="No-binario">No-binario</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#4A154B] font-medium"
                  >
                    <option value="DELEGATE">Delegada/o (Con Voto)</option>
                    <option value="SECRETARY">Secretaría Técnica</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Acreditar al Padrón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
