import React, { useState } from 'react';
import { usePlenario } from '../context/PlenarioContext';
import {
  User,
  ArrowRight,
  Check,
  Lock,
  AlertCircle,
  X
} from 'lucide-react';

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { loginWithUsername, currentUser } = usePlenario();
  const [usernameInput, setUsernameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    const result = await loginWithUsername(usernameInput);
    setIsLoading(false);

    if (result.success) {
      setLoginSuccess(true);
      setTimeout(() => {
        onClose();
        setLoginSuccess(false);
        setUsernameInput('');
      }, 650);
    } else {
      setErrorMessage(result.error || 'El nombre de usuario no se encuentra registrado en el Padrón Oficial.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-slate-800 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {currentUser && (
          <button
            onClick={() => {
              setErrorMessage('');
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6 relative z-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#C81D36] via-[#89164B] to-[#4A154B] p-1.5 flex items-center justify-center shadow-md">
            <img
              src="/assets/aistudio/239A2F73-D6B6-456E-A594-91458B73B455_b67ce703.png"
              alt="Logo Frente Amplio"
              className="w-full h-full object-contain drop-shadow-xs"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Acreditación Oficial de Delegadas/os
          </h2>
          <p className="text-xs text-purple-900 font-bold mt-1">
            Plenario Nacional de Juventudes · Frente Estudiantil (FE-FA)
          </p>
        </div>

        {loginSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">¡Acreditación Verificada con Éxito!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Usuario validado en el Padrón Oficial. Sincronizando Plenario en vivo...
            </p>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              Ingrese su <strong>nombre de usuario</strong> registrado en el Padrón Oficial para habilitar la deliberación y las votaciones en vivo en todos los dispositivos.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="ej: nombre.apellido"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#4A154B] focus:bg-white transition-colors placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-[11px] text-rose-800 flex items-start gap-2 font-medium leading-snug">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4A154B] hover:bg-[#5E1B5F] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Verificando en el Padrón...' : 'Validar Acreditación e Ingresar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono pt-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Sincronización en Vivo · Trazabilidad Inmutable</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
