import React, { useState } from 'react';
import { usePlenario } from '../context/PlenarioContext';
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  Vote, 
  FileText, 
  Users, 
  Tv, 
  ChevronDown,
  Lock,
  KeyRound,
  FileCheck,
  Sparkles,
  Sliders
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeTab, 
    setActiveTab, 
    logout,
    isSecretariaTecnica,
    isDelegate,
    setShowLoginModal,
    motionsHistory
  } = usePlenario();

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Role display label
  const getRoleLabel = () => {
    if (!currentUser) return 'Sin Acreditar';
    if (isSecretariaTecnica) return 'Secretaría Técnica';
    if (isDelegate) return 'Delegada/o Regional';
    return currentUser.role;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-3 md:px-5 lg:px-8 py-2 md:py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-3 lg:gap-6">
        
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => setActiveTab('plenario')}
            className="flex items-center gap-2 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-[#4A154B] to-[#D32F2F] flex items-center justify-center font-black text-white text-xs md:text-sm shadow">
              FA
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                Plenario Nacional FE-FA
              </span>
              <span className="text-[10px] md:text-[11px] text-purple-900 font-semibold tracking-wide">
                Frente Estudiantil · Plataforma Oficial
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Visible on Tablets & Desktops) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {/* Plenario Deliberativo */}
          <button
            onClick={() => setActiveTab('plenario')}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'plenario'
                ? 'bg-[#4A154B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Vote className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-200" />
            <span>Plenario y Votaciones</span>
          </button>

          {/* Texto Final en Construcción y Mociones (reemplaza pestaña de actas) */}
          <button
            onClick={() => setActiveTab('texto-final')}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'texto-final'
                ? 'bg-[#4A154B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
            <span>Texto Final y Mociones</span>
          </button>

          {/* Mesa de Votaciones y Tramitación de Mociones (Solo Secretaría Técnica / Mesa) */}
          {isSecretariaTecnica && (
            <button
              onClick={() => setActiveTab('mesa-votaciones')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'mesa-votaciones'
                  ? 'bg-[#4A154B] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-300" />
              <span>Mesa y Votaciones</span>
              {motionsHistory.filter(m => m.status === 'DRAFT').length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 animate-pulse">
                  {motionsHistory.filter(m => m.status === 'DRAFT').length}
                </span>
              )}
            </button>
          )}

          {/* Padrón y Administración */}
          {isSecretariaTecnica && (
            <button
              onClick={() => setActiveTab('padron')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'padron'
                  ? 'bg-[#4A154B] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />
              <span>Padrón y Usuarios</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Actions & User Status */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* User Profile Popover */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4A154B] to-[#D32F2F] flex items-center justify-center text-[11px] font-bold text-white shrink-0 overflow-hidden shadow-sm">
                  {currentUser.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt={currentUser.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                    {currentUser.name}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
              </button>

              {/* Profile Details Dropdown */}
              {showUserDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-2 py-2 border-b border-slate-100 text-xs">
                    <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                    
                    <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Rol Institucional:</span>
                        <span className="font-bold text-slate-900">{getRoleLabel()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Derecho a Voto:</span>
                        <span className={`font-bold ${isDelegate ? 'text-emerald-700' : 'text-purple-700'}`}>
                          {isDelegate ? 'Habilitado (Voz y Voto)' : 'Sin Voto (Solo Voz)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Región:</span>
                        <span className="text-slate-700 font-medium">{currentUser.region}</span>
                      </div>
                    </div>
                  </div>

                  <div className="py-2 px-2 text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <Lock className="w-3 h-3" />
                      <span>Sesión Unívoca Acreditada</span>
                    </div>
                    <div>IP: {currentUser.ipAddress || '190.161.42.1'}</div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 px-1 space-y-1">

                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowLoginModal(true);
                      }}
                      className="w-full py-1.5 rounded-lg text-xs font-bold text-[#4A154B] bg-purple-50 hover:bg-purple-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#4A154B]" />
                      <span>Acreditarse con otra cuenta</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#4A154B] to-[#D32F2F] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition-all whitespace-nowrap cursor-pointer animate-pulse"
            >
              <User className="w-3.5 h-3.5" />
              <span>Acreditarse al Plenario</span>
            </button>
          )}

        </div>

      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around pt-2 border-t border-slate-200 mt-2">
        <button
          onClick={() => setActiveTab('plenario')}
          className={`text-xs py-1 px-2 font-bold cursor-pointer ${activeTab === 'plenario' ? 'text-[#4A154B] border-b-2 border-[#4A154B]' : 'text-slate-500'}`}
        >
          Plenario
        </button>
        <button
          onClick={() => setActiveTab('texto-final')}
          className={`text-xs py-1 px-2 font-bold cursor-pointer ${activeTab === 'texto-final' ? 'text-[#4A154B] border-b-2 border-[#4A154B]' : 'text-slate-500'}`}
        >
          Texto Final
        </button>
        {isSecretariaTecnica && (
          <button
            onClick={() => setActiveTab('mesa-votaciones')}
            className={`text-xs py-1 px-2 font-bold cursor-pointer relative ${activeTab === 'mesa-votaciones' ? 'text-[#4A154B] border-b-2 border-[#4A154B]' : 'text-slate-500'}`}
          >
            Mesa
            {motionsHistory.filter(m => m.status === 'DRAFT').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1 py-0 rounded-full font-bold ml-1">
                {motionsHistory.filter(m => m.status === 'DRAFT').length}
              </span>
            )}
          </button>
        )}
        {isSecretariaTecnica && (
          <button
            onClick={() => setActiveTab('padron')}
            className={`text-xs py-1 px-2 font-bold cursor-pointer ${activeTab === 'padron' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500'}`}
          >
            Padrón
          </button>
        )}
      </div>
    </header>
  );
};
