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
    <header className="sticky top-0 z-40 border-b border-white/20 px-3 md:px-5 lg:px-8 py-2.5 text-white shadow-md">
      {/* Fondo difuminado entre rojo y morado para la barra superior */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden bg-gradient-to-r from-[#C81D36] via-[#89164B] to-[#4A154B] backdrop-blur-md pointer-events-none"
      >
        <div className="absolute -left-16 -top-12 w-72 h-36 rounded-full bg-[#E11D48]/65 blur-2xl" />
        <div className="absolute left-1/3 -bottom-14 w-80 h-36 rounded-full bg-[#A21CAF]/45 blur-2xl" />
        <div className="absolute -right-12 -top-10 w-72 h-36 rounded-full bg-[#4A154B]/80 blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        
        {/* Zone 1: Brand wordmark + Logo Frente Amplio */}
        <button
          onClick={() => setActiveTab(currentUser ? 'plenario' : 'inicio')}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer shrink-0 whitespace-nowrap group"
        >
          <img
            src="/assets/aistudio/239A2F73-D6B6-456E-A594-91458B73B455_b67ce703.png"
            alt="Logo Frente Amplio"
            className="w-9 h-9 md:w-10 md:h-10 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] shrink-0 transition-transform group-hover:scale-105"
          />
          <span className="text-sm md:text-base font-extrabold tracking-tight text-white whitespace-nowrap drop-shadow-xs">
            Plenario Nacional FE-FA
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        {currentUser ? (
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {/* Plenario Deliberativo */}
            <button
              onClick={() => setActiveTab('plenario')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'plenario'
                  ? 'bg-white text-[#4A154B] shadow-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              <Vote className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'plenario' ? 'text-[#4A154B]' : 'text-rose-200'}`} />
              <span>Plenario y Votaciones</span>
            </button>

            {/* Texto Final en Construcción y Mociones */}
            <button
              onClick={() => setActiveTab('texto-final')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'texto-final'
                  ? 'bg-white text-[#4A154B] shadow-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/15'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'texto-final' ? 'text-amber-600' : 'text-amber-300'}`} />
              <span>Texto Final y Mociones</span>
            </button>

            {/* Mesa de Votaciones y Tramitación de Mociones (Solo Secretaría Técnica) */}
            {isSecretariaTecnica && (
              <button
                onClick={() => setActiveTab('mesa-votaciones')}
                className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTab === 'mesa-votaciones'
                    ? 'bg-white text-[#4A154B] shadow-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'mesa-votaciones' ? 'text-[#4A154B]' : 'text-purple-200'}`} />
                <span>Mesa y Votaciones</span>
                {motionsHistory.filter(m => m.status === 'DRAFT').length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                    {motionsHistory.filter(m => m.status === 'DRAFT').length}
                  </span>
                )}
              </button>
            )}

            {/* Padrón y Administración */}
            {isSecretariaTecnica && (
              <button
                onClick={() => setActiveTab('padron')}
                className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTab === 'padron'
                    ? 'bg-white text-[#4A154B] shadow-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/15'
                }`}
              >
                <Users className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'padron' ? 'text-emerald-700' : 'text-emerald-300'}`} />
                <span>Padrón y Usuarios</span>
              </button>
            )}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-white/90">
            <a href="#en-vivo" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              En Vivo
            </a>
            <a href="#territorios" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Territorios
            </a>
            <a href="#hemiciclo" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Hemiciclo
            </a>
            <a href="#votaciones" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Votaciones
            </a>
            <a href="#articulado" className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Articulado
            </a>
          </nav>
        )}

        {/* Zone 3: Actions & User Status */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-1.5 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[11px] font-bold text-white shrink-0 overflow-hidden shadow-sm">
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
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {currentUser.name}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/85 ml-0.5" />
              </button>

              {/* Profile Details Dropdown */}
              {showUserDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-2 py-2 border-b border-slate-100 text-xs">
                    <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">@{currentUser.username}</div>
                    
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
                      <span>Cambiar de cuenta</span>
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión (Volver a Inicio)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-[#4A154B] rounded-xl text-xs font-extrabold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Ingresar acá</span>
            </button>
          )}
        </div>

      </div>

      {/* Mobile nav bar */}
      {currentUser ? (
        <div className="md:hidden flex items-center justify-around pt-2 border-t border-white/15 mt-2">
          <button
            onClick={() => setActiveTab('plenario')}
            className={`text-xs py-1 px-2 font-bold cursor-pointer whitespace-nowrap ${activeTab === 'plenario' ? 'text-white border-b-2 border-white' : 'text-white/75 hover:text-white'}`}
          >
            Plenario
          </button>
          <button
            onClick={() => setActiveTab('texto-final')}
            className={`text-xs py-1 px-2 font-bold cursor-pointer whitespace-nowrap ${activeTab === 'texto-final' ? 'text-white border-b-2 border-white' : 'text-white/75 hover:text-white'}`}
          >
            Texto Final
          </button>
          {isSecretariaTecnica && (
            <button
              onClick={() => setActiveTab('mesa-votaciones')}
              className={`text-xs py-1 px-2 font-bold cursor-pointer relative whitespace-nowrap ${activeTab === 'mesa-votaciones' ? 'text-white border-b-2 border-white' : 'text-white/75 hover:text-white'}`}
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
              className={`text-xs py-1 px-2 font-bold cursor-pointer whitespace-nowrap ${activeTab === 'padron' ? 'text-white border-b-2 border-white' : 'text-white/75 hover:text-white'}`}
            >
              Padrón
            </button>
          )}
        </div>
      ) : (
        <div className="md:hidden flex items-center justify-around pt-2 border-t border-white/15 mt-2 text-xs font-semibold text-white/85 overflow-x-auto">
          <a href="#en-vivo" className="py-1 px-2 hover:text-white whitespace-nowrap">En Vivo</a>
          <a href="#territorios" className="py-1 px-2 hover:text-white whitespace-nowrap">Mapa</a>
          <a href="#hemiciclo" className="py-1 px-2 hover:text-white whitespace-nowrap">Hemiciclo</a>
          <a href="#votaciones" className="py-1 px-2 hover:text-white whitespace-nowrap">Votaciones</a>
          <a href="#articulado" className="py-1 px-2 hover:text-white whitespace-nowrap">Articulado</a>
        </div>
      )}
    </header>
  );
};
