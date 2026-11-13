import { useState, useCallback, useEffect } from 'react';
import { Motion, VoteOption } from '../types/plenario';

export interface PendingVoteConfirmation {
  motion: Motion;
  option: VoteOption;
  optionLabel: string;
}

interface UseVotoConfirmationOptions {
  onConfirmVote: (option: VoteOption, motion: Motion) => void | Promise<void>;
}

export function getVoteOptionLabel(option: VoteOption, motion?: Motion | null): string {
  switch (option) {
    case 'A_FAVOR':
      return 'A FAVOR';
    case 'EN_CONTRA':
      return 'EN CONTRA';
    case 'ABSTENCION':
      return 'ABSTENCIÓN';
    case 'OPCION_A': {
      const label = motion?.dissensusOptions?.a?.label || motion?.dissensusOptions?.a?.title;
      return label ? `Opción A: ${label}` : 'Opción A';
    }
    case 'OPCION_B': {
      const label = motion?.dissensusOptions?.b?.label || motion?.dissensusOptions?.b?.title;
      return label ? `Opción B: ${label}` : 'Opción B';
    }
    case 'OPCION_C': {
      const label = motion?.dissensusOptions?.c?.label || motion?.dissensusOptions?.c?.title;
      return label ? `Opción C: ${label}` : 'Opción C (Consenso)';
    }
    default:
      return String(option);
  }
}

export function getMotionKindSummaryLabel(kind?: Motion['motionKind']): string {
  switch (kind) {
    case 'GENERAL_PRESINTESIS':
      return 'Votación General Presíntesis';
    case 'DISENSO_PRIMERA_VUELTA':
      return 'Disenso · 1ª Vuelta';
    case 'DISENSO_SEGUNDA_VUELTA':
      return 'Disenso · 2ª Vuelta (Balotaje)';
    case 'MOCION_EXTENSIVA':
      return 'Moción Extensiva';
    case 'MOCION_SUPRESIVA':
      return 'Moción Supresiva';
    case 'GENERAL_SINTESIS_FINAL':
      return 'Votación General Síntesis Final';
    case 'MOCION_ORDINARIA':
      return 'Moción General de Sala';
    default:
      return 'Votación Plenaria';
  }
}

export function useVotoConfirmation({ onConfirmVote }: UseVotoConfirmationOptions) {
  const [pendingVote, setPendingVote] = useState<PendingVoteConfirmation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestConfirmation = useCallback(
    (motion: Motion, option: VoteOption, existingVote?: VoteOption) => {
      if (!motion || motion.status !== 'VOTING') return;
      // Un voto ya emitido y confirmado no puede ser modificado ni vuelto a emitir
      if (existingVote) return;

      const optionLabel = getVoteOptionLabel(option, motion);

      setPendingVote({
        motion,
        option,
        optionLabel
      });
    },
    []
  );

  const cancelConfirmation = useCallback(() => {
    if (isSubmitting) return;
    setPendingVote(null);
  }, [isSubmitting]);

  const confirmVote = useCallback(async () => {
    if (!pendingVote || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirmVote(pendingVote.option, pendingVote.motion);
      setPendingVote(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingVote, isSubmitting, onConfirmVote]);

  useEffect(() => {
    if (!pendingVote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setPendingVote(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingVote, isSubmitting]);

  return {
    isOpen: Boolean(pendingVote),
    pendingVote,
    isSubmitting,
    requestConfirmation,
    confirmVote,
    cancelConfirmation
  };
}
