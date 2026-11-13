import React, { useState } from 'react';
import { usePlenario } from '../context/PlenarioContext';
import { 
  Mail, 
  ArrowRight, 
  Check, 
  Lock,
  AlertCircle,
  X,
  KeyRound
} from 'lucide-react';

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { loginWithEmail, currentUser } = usePlenario();
  const [emailInput, setEmailInput] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const result = loginWithEmail(emailInput);
    if (result.success) {
      setMagicLinkSent(true);
      setTimeout(() => {
        onClose();
        setMagicLinkSent(false);
        setEmailInput('');
      }, 900);
    } else {
      setErrorMessage(result.error || 'El correo no se encuentra registrado en el Padrón Oficial.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-slate-800 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button (only available if there's already an active user) */}
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

        {/* Brand Lockup */}
        <div className="text-center mb-6 relative z-10">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#4A154B] to-[#D32F2F] flex items-center justify-center font-black text-white text-lg shadow-md">
            FA
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Acreditación Oficial de Delegadas/os
          </h2>
          <p className="text-xs text-purple-900 font-bold mt-1">
            Plenario Nacional de Juventudes · Frente Estudiantil (FE-FA)
          </p>
        </div>

        {magicLinkSent ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">¡Acreditación Verificada con Éxito!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Identidad criptográfica validada en el Padrón Oficial. Conectando al Plenario...
            </p>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              Para garantizar la fe pública y la seguridad democrática de las votaciones, debe ingresar manualmente su correo institucional registrado. No se admiten accesos automáticos no autenticados.
            </p>

            {/* Manual Email Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico Institucional
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="nombre.apellido@organizacion.cl"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#4A154B] focus:bg-white transition-colors placeholder:text-slate-400 font-medium"
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
                className="w-full py-3 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Validar Acreditación e Ingresar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Footer encryption badge */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono pt-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Cifrado SHA-256 · Trazabilidad de Auditoría Activa</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
