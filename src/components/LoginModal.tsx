import React, { useEffect, useState } from 'react';
import { usePlenario } from '../context/PlenarioContext';
import {
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  Lock,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types/plenario';

type AuthStep = 'USERNAME' | 'ENTER_KEY' | 'CREATE_KEY';

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { checkUsernameAccess, loginWithCredentials, setupFirstTimeAccessKey } = usePlenario();

  const [step, setStep] = useState<AuthStep>('USERNAME');
  const [usernameInput, setUsernameInput] = useState('');
  const [verifiedInfo, setVerifiedInfo] = useState<{ displayName?: string; role?: UserRole } | null>(null);

  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [confirmKeyInput, setConfirmKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetFormState = () => {
    setStep('USERNAME');
    setUsernameInput('');
    setVerifiedInfo(null);
    setAccessKeyInput('');
    setNewKeyInput('');
    setConfirmKeyInput('');
    setShowKey(false);
    setErrorMessage('');
    setLoginSuccess(false);
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleSwitchUser = () => {
    setStep('USERNAME');
    setVerifiedInfo(null);
    setAccessKeyInput('');
    setNewKeyInput('');
    setConfirmKeyInput('');
    setShowKey(false);
    setErrorMessage('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || isLoading) return;
    setErrorMessage('');
    setIsLoading(true);
    const res = await checkUsernameAccess(usernameInput);
    setIsLoading(false);

    if (!res.success || !res.exists) {
      setErrorMessage(
        res.error || 'El nombre de usuario no se encuentra registrado en el Padrón Oficial.'
      );
      return;
    }

    setVerifiedInfo({ displayName: res.displayName, role: res.role });
    setShowKey(false);
    setAccessKeyInput('');
    setNewKeyInput('');
    setConfirmKeyInput('');
    setStep(res.hasAccessKey ? 'ENTER_KEY' : 'CREATE_KEY');
  };

  const handleLoginWithKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyInput.trim() || isLoading) return;
    setErrorMessage('');
    setIsLoading(true);
    const result = await loginWithCredentials(usernameInput, accessKeyInput);
    setIsLoading(false);

    if (result.success) {
      setLoginSuccess(true);
      setTimeout(() => {
        onClose();
        resetFormState();
      }, 650);
    } else if (result.requiresSetup) {
      setStep('CREATE_KEY');
      setErrorMessage('');
    } else {
      setErrorMessage(result.error || 'Clave de acceso incorrecta.');
    }
  };

  const handleCreateFirstTimeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanNew = newKeyInput.trim();
    const cleanConfirm = confirmKeyInput.trim();

    if (cleanNew.length < 4 || cleanNew.length > 64) {
      setErrorMessage('Tu clave personal debe tener entre 4 y 64 caracteres.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setErrorMessage('Las claves ingresadas no coinciden. Verifica ambos campos.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    const result = await setupFirstTimeAccessKey(usernameInput, cleanNew);
    setIsLoading(false);

    if (result.success) {
      setLoginSuccess(true);
      setTimeout(() => {
        onClose();
        resetFormState();
      }, 650);
    } else {
      setErrorMessage(result.error || 'No se pudo registrar tu clave personal.');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-slate-800 dark:text-slate-100 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar ventana de acreditación"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5 relative z-10">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#C81D36] via-[#89164B] to-[#4A154B] p-1.5 flex items-center justify-center shadow-md">
            <img
              src="/assets/aistudio/239A2F73-D6B6-456E-A594-91458B73B455_b67ce703.png"
              alt="Logo Frente Amplio"
              className="w-full h-full object-contain drop-shadow-xs"
            />
          </div>
          <h2 id="login-modal-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Acreditación Oficial de Delegadas/os
          </h2>
          <p className="text-xs text-purple-900 dark:text-purple-300 font-bold mt-1">
            Plenario Nacional de Juventudes · Frente Estudiantil (FE-FA)
          </p>
        </div>

        {loginSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">¡Acreditación Verificada con Éxito!</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Identidad y clave validadas en el Padrón Oficial. Sincronizando Plenario en vivo...
            </p>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {step === 'USERNAME' && (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-center">
                  Ingrese su <strong>nombre de usuario</strong> del Padrón Oficial para verificar su identidad y clave de acceso personal.
                </p>

                <form onSubmit={handleCheckUsername} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre de Usuario
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2 font-medium leading-snug">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isLoading ? 'Verificando usuario...' : 'Continuar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cerrar y volver al inicio</span>
                  </button>
                </form>
              </>
            )}

            {step === 'ENTER_KEY' && (
              <>
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {verifiedInfo?.displayName || usernameInput}
                    </div>
                    <div className="text-[11px] text-purple-800 dark:text-purple-300 font-mono truncate">
                      @{usernameInput.trim().toLowerCase()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchUser}
                    className="text-[11px] font-bold text-[#4A154B] dark:text-purple-300 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Cambiar</span>
                  </button>
                </div>

                <form onSubmit={handleLoginWithKey} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Clave de Acceso Personal
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type={showKey ? 'text' : 'password'}
                        required
                        autoFocus
                        value={accessKeyInput}
                        onChange={(e) => {
                          setAccessKeyInput(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Ingrese su clave personal"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-9 pr-10 py-3 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((prev) => !prev)}
                        className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Si olvidaste tu clave, solicita a la Secretaría Técnica que la consulte o restablezca en el Padrón.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2 font-medium leading-snug">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isLoading ? 'Verificando clave...' : 'Validar Clave e Ingresar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cerrar y volver al inicio</span>
                  </button>
                </form>
              </>
            )}

            {step === 'CREATE_KEY' && (
              <>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>Primer ingreso · Verificación</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchUser}
                      className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Cambiar</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-900/90 dark:text-emerald-200/90 leading-snug">
                    Hola <strong>{verifiedInfo?.displayName || usernameInput}</strong>. Por seguridad, crea una clave personal para proteger tus ingresos y votaciones futuras.
                  </p>
                </div>

                <form onSubmit={handleCreateFirstTimeKey} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Crear Clave Personal (mín. 4 caracteres)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type={showKey ? 'text' : 'password'}
                        required
                        minLength={4}
                        maxLength={64}
                        autoFocus
                        value={newKeyInput}
                        onChange={(e) => {
                          setNewKeyInput(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Escribe tu nueva clave"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-9 pr-10 py-3 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((prev) => !prev)}
                        className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirmar Clave Personal
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type={showKey ? 'text' : 'password'}
                        required
                        minLength={4}
                        maxLength={64}
                        value={confirmKeyInput}
                        onChange={(e) => {
                          setConfirmKeyInput(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Repite tu nueva clave"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2 font-medium leading-snug">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isLoading ? 'Guardando clave...' : 'Guardar Clave e Ingresar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cerrar y volver al inicio</span>
                  </button>
                </form>
              </>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-1">
              <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span>Acceso Protegido por Clave · Trazabilidad Inmutable</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
