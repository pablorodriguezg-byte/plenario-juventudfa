import React from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ShieldCheck,
  X,
  Lock,
  Vote
} from 'lucide-react';
import { VoteOption } from '../../types/plenario';
import {
  PendingVoteConfirmation,
  getMotionKindSummaryLabel
} from '../../hooks/useVotoConfirmation';

interface VotoConfirmationModalProps {
  isOpen: boolean;
  pendingVote: PendingVoteConfirmation | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const getOptionVisualStyle = (option: VoteOption) => {
  switch (option) {
    case 'A_FAVOR':
      return {
        container: 'bg-purple-50 border-purple-300 text-purple-950',
        badge: 'bg-[#4A154B] text-white',
        icon: <CheckCircle2 className="w-5 h-5 text-[#4A154B] shrink-0" />
      };
    case 'EN_CONTRA':
      return {
        container: 'bg-rose-50 border-rose-300 text-rose-950',
        badge: 'bg-rose-600 text-white',
        icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
      };
    case 'OPCION_A':
      return {
        container: 'bg-sky-50 border-sky-300 text-sky-950',
        badge: 'bg-[#0284C7] text-white',
        icon: <CheckCircle2 className="w-5 h-5 text-[#0284C7] shrink-0" />
      };
    case 'OPCION_B':
      return {
        container: 'bg-amber-50 border-amber-300 text-amber-950',
        badge: 'bg-[#D97706] text-white',
        icon: <CheckCircle2 className="w-5 h-5 text-[#D97706] shrink-0" />
      };
    case 'OPCION_C':
      return {
        container: 'bg-emerald-50 border-emerald-300 text-emerald-950',
        badge: 'bg-[#059669] text-white',
        icon: <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
      };
    case 'ABSTENCION':
    default:
      return {
        container: 'bg-slate-100 border-slate-300 text-slate-900',
        badge: 'bg-slate-700 text-white',
        icon: <MinusCircle className="w-5 h-5 text-slate-600 shrink-0" />
      };
  }
};

export const VotoConfirmationModal: React.FC<VotoConfirmationModalProps> = ({
  isOpen,
  pendingVote,
  isSubmitting,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !pendingVote) return null;

  const { motion, option, optionLabel } = pendingVote;
  const style = getOptionVisualStyle(option);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voto-confirm-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-[#4A154B] to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Vote className="w-4 h-4 text-purple-200" />
            </div>
            <div className="min-w-0">
              <h3 id="voto-confirm-title" className="text-sm font-black text-white truncate">
                Confirmar Registro de Voto
              </h3>
              <p className="text-[11px] text-purple-200 truncate">
                Verifique el código de moción y el sentido antes de emitir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Motion summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Código de Moción
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 font-mono text-xs font-black border border-purple-200">
                {motion.code}
              </span>
            </div>

            <div className="text-[10.5px] font-bold text-purple-900">
              {getMotionKindSummaryLabel(motion.motionKind)}
            </div>

            <div className="text-xs font-bold text-slate-900 leading-snug">
              {motion.title}
            </div>
          </div>

          {/* Vote sense summary */}
          <div className={`p-3.5 rounded-xl border-2 ${style.container} space-y-1.5`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                Sentido del Voto Seleccionado
              </span>
              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wide ${style.badge}`}>
                Sufragio Vinculante
              </span>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              {style.icon}
              <span className="text-sm font-black leading-tight break-words">
                {optionLabel}
              </span>
            </div>
          </div>

          {/* Immutability notice */}
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-950">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Voto definitivo:</strong> una vez confirmado y registrado, su sufragio queda sellado en el escrutinio y <strong>no podrá modificarse</strong>.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Registrando...' : 'Confirmar y Registrar Voto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
