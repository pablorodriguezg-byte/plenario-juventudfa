/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlenarioProvider, usePlenario } from './context/PlenarioContext';
import { Header } from './components/Header';
import { VotacionBox } from './components/plenario/VotacionBox';
import { HemicicloMiniBox } from './components/plenario/HemicicloMiniBox';
import { SintesisBox } from './components/plenario/SintesisBox';
import { TextoFinalView } from './components/plenario/TextoFinalView';
import { MesaVotacionesView } from './components/plenario/MesaVotacionesView';
import { AdminActasView } from './components/admin/AdminActasView';
import { PadronManager } from './components/admin/PadronManager';
import { LoginModal } from './components/LoginModal';
import { Vote } from 'lucide-react';

const PlenarioAppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    activeVotingMotion,
    showLoginModal,
    setShowLoginModal
  } = usePlenario();

  return (
    <div className={`bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-[#4A154B] selection:text-white ${
      activeTab === 'plenario' ? 'min-h-screen md:h-screen md:overflow-hidden' : 'min-h-screen'
    }`}>
      
      {/* Header Bar */}
      <Header />

      {/* Global Status Notices */}
      <div className="no-print shrink-0">
        {/* Banner para observadores o usuarios no acreditados */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-[#4A154B] to-[#D32F2F] text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>Modo Observador: Ingrese con su correo institucional acreditado para habilitar la deliberación y el voto.</span>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1 bg-white text-[#4A154B] hover:bg-purple-50 rounded-lg text-xs font-black cursor-pointer transition-all shadow-xs shrink-0"
            >
              Acreditarse Ahora
            </button>
          </div>
        )}

        {/* Global Voting Alert Banner when outside plenario and mesa-votaciones tabs */}
        {activeVotingMotion && activeTab !== 'plenario' && activeTab !== 'mesa-votaciones' && (
          <div className="bg-purple-100 border-b border-purple-300 px-4 py-2 flex items-center justify-between gap-3 text-xs text-purple-950 font-bold max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <span>Votación en Curso: <strong>{activeVotingMotion.code} - {activeVotingMotion.title}</strong></span>
            </div>
            <button
              onClick={() => setActiveTab('plenario')}
              className="px-3 py-1 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>{currentUser && activeVotingMotion.votes[currentUser.id] ? 'Ver Votación en Sala' : 'Ir a Votar'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto min-w-0 min-h-0 ${
        activeTab === 'plenario' 
          ? 'max-w-[1720px] p-2.5 md:p-3 lg:p-3.5 overflow-y-auto md:overflow-hidden flex flex-col' 
          : 'max-w-7xl p-4 lg:p-6 overflow-y-auto'
      }`}>
        
        {/* Tab 1: Plenario Deliberativo y Votación Metodológica (Optimizado para Tablet/iPad como formato PC/Mac) */}
        {activeTab === 'plenario' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 h-full overflow-hidden">
            
            {/* Columna Izquierda (7 cols): Centro de Deliberación Documental (Presíntesis Regional & Síntesis Final) */}
            <div className="md:col-span-7 h-full min-h-[480px] md:min-h-0 flex flex-col overflow-hidden">
              <SintesisBox />
            </div>

            {/* Columna Derecha (5 cols): Cabina de Votación + Hemiciclo Parlamentario */}
            <div className="md:col-span-5 h-full min-h-0 flex flex-col gap-3 overflow-hidden">
              
              {/* Superior (58% altura aprox): Cabina de Votación y Escrutinio */}
              <div className="flex-1 min-h-[290px] overflow-hidden">
                <VotacionBox />
              </div>

              {/* Inferior (42% altura aprox): Hemiciclo Parlamentario en Tiempo Real */}
              <div className="h-[235px] md:h-[245px] shrink-0 overflow-hidden">
                <HemicicloMiniBox />
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Texto Final en Construcción y Registro de Mociones (reemplaza la de actas) */}
        {activeTab === 'texto-final' && (
          <div className="w-full min-w-0">
            <TextoFinalView />
          </div>
        )}

        {/* Tab 3: Secretaría Técnica & Repositorio de Actas Oficiales */}
        {activeTab === 'actas' && (
          <div className="w-full min-w-0">
            <AdminActasView />
          </div>
        )}

        {/* Tab 4: Padrón Electoral y Administración (Exclusivo para Secretaría Técnica) */}
        {activeTab === 'padron' && (
          <div className="w-full min-w-0">
            <PadronManager />
          </div>
        )}

        {/* Tab 5: Mesa y Centro de Votaciones (Exclusivo para Secretaría Técnica / Administradores) */}
        {activeTab === 'mesa-votaciones' && (
          <div className="w-full min-w-0">
            <MesaVotacionesView />
          </div>
        )}

      </main>

      {/* Login / Acreditación Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

    </div>
  );
};

export default function App() {
  return (
    <PlenarioProvider>
      <PlenarioAppContent />
    </PlenarioProvider>
  );
}
