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
import { PublicInicioView } from './components/public/PublicInicioView';
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

  const isPublicInicio = !currentUser || activeTab === 'inicio';

  return (
    <div className={`bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-[#4A154B] selection:text-white transition-colors ${
      currentUser && activeTab === 'plenario' ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'
    }`}>
      
      {/* Header Bar */}
      <Header />

      {/* Global Voting Alert Banner when logged in and outside plenario/mesa */}
      {currentUser && (
        <div className="no-print shrink-0">
          {activeVotingMotion && activeTab !== 'plenario' && activeTab !== 'mesa-votaciones' && (
            <div className="bg-purple-100 dark:bg-purple-950/80 border-b border-purple-300 dark:border-purple-800">
              <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-950 dark:text-purple-100 font-bold">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                  <span className="truncate sm:whitespace-normal">
                    Votación en Curso: <strong>{activeVotingMotion.code} - {activeVotingMotion.title}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('plenario')}
                  className="px-3 py-1.5 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Vote className="w-3.5 h-3.5" />
                  <span>{activeVotingMotion.votes[currentUser.id] ? 'Ver Votación en Sala' : 'Ir a Votar'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {isPublicInicio ? (
        <main className="flex-1 w-full min-w-0">
          <PublicInicioView />
        </main>
      ) : (
        <main className={`flex-1 w-full mx-auto min-w-0 min-h-0 ${
          activeTab === 'plenario' 
            ? 'max-w-[1720px] p-2.5 md:p-3 lg:p-3.5 overflow-y-auto lg:overflow-hidden flex flex-col' 
            : 'max-w-7xl p-4 lg:p-6 overflow-y-auto'
        }`}>
          
          {/* Tab 1: Plenario Deliberativo y Votación Metodológica */}
          {activeTab === 'plenario' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 lg:h-full lg:overflow-hidden">
              
              {/* Columna Deliberación Documental (en Celular/Tablet va después de la Cabina de Votación para acceso inmediato al marcador) */}
              <div className="order-2 lg:order-1 lg:col-span-7 lg:h-full min-h-[460px] lg:min-h-0 flex flex-col lg:overflow-hidden">
                <SintesisBox />
              </div>

              {/* Columna Cabina de Votación + Hemiciclo (primero en Celular/Tablet, columna derecha en PC) */}
              <div className="order-1 lg:order-2 lg:col-span-5 lg:h-full min-h-0 flex flex-col gap-3 lg:overflow-y-auto lg:pr-0.5">
                
                {/* Superior: Cabina de Votación y Escrutinio */}
                <div className="shrink-0">
                  <VotacionBox />
                </div>

                {/* Inferior: Hemiciclo Plenario en Tiempo Real */}
                <div className="shrink-0">
                  <HemicicloMiniBox />
                </div>

              </div>

            </div>
          )}

          {/* Tab 2: Texto Final en Construcción y Registro de Mociones */}
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

          {/* Tab 5: Mesa y Centro de Votaciones (Exclusivo para Secretaría Técnica) */}
          {activeTab === 'mesa-votaciones' && (
            <div className="w-full min-w-0">
              <MesaVotacionesView />
            </div>
          )}

        </main>
      )}

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
