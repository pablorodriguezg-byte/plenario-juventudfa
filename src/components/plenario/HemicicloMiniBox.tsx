import React, { useMemo, useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { Motion } from '../../types/plenario';
import { Users, Clock } from 'lucide-react';
import { HemicicloPlenarioChart } from './HemicicloPlenarioChart';

export const HemicicloMiniBox: React.FC = () => {
  const { delegates, activeMotion, motionsHistory } = usePlenario();
  const [motionOverrideId, setMotionOverrideId] = useState<string>('');

  const resolvedMotions = useMemo(() => {
    return motionsHistory
      .filter(
        (m) =>
          m.status === 'APPROVED' ||
          m.status === 'REJECTED' ||
          m.status === 'CLOSED' ||
          m.status === 'PASSED_TO_RUNOFF'
      )
      .sort((a, b) => {
        const timeA = a.closedAt || a.startedAt || a.createdAt;
        const timeB = b.closedAt || b.startedAt || b.createdAt;
        return timeB - timeA;
      });
  }, [motionsHistory]);

  const liveVotingMotion = useMemo(() => {
    const votingInHistory = motionsHistory.find((m) => m.status === 'VOTING');
    if (votingInHistory) return votingInHistory;
    if (activeMotion && activeMotion.status === 'VOTING') return activeMotion;
    return null;
  }, [activeMotion, motionsHistory]);

  // Mirror PublicInicioView: default to live voting or most recent closed motion, with optional selector
  const motionReflected: Motion | null = useMemo(() => {
    if (motionOverrideId) {
      const found = motionsHistory.find((m) => m.id === motionOverrideId);
      if (found) return found;
    }
    if (liveVotingMotion) return liveVotingMotion;
    if (resolvedMotions.length > 0) return resolvedMotions[0];
    return (
      (activeMotion && activeMotion.status !== 'DRAFT' ? activeMotion : null) ||
      motionsHistory.find((m) => m.status !== 'DRAFT') ||
      null
    );
  }, [motionOverrideId, motionsHistory, liveVotingMotion, resolvedMotions, activeMotion]);

  const isLiveVoting = motionReflected?.status === 'VOTING';

  return (
    <div className="flex flex-col w-full min-w-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-purple-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-3.5 gap-2.5">
      {/* Header: mirrors PublicInicioView's Hemiciclo Plenario card */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <h3 className="font-serif-doc text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#4A154B] dark:text-purple-400 shrink-0" />
            <span className="truncate">Hemiciclo Plenario</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Toca o pasa el cursor sobre cualquier curul para ver la delegación y su postura.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {resolvedMotions.length > 0 && (
            <select
              aria-label="Seleccionar votación a proyectar en el hemiciclo"
              value={motionReflected?.id || ''}
              onChange={(e) => setMotionOverrideId(e.target.value)}
              className="bg-purple-50/70 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[10px] font-semibold rounded-lg px-2 py-1 max-w-[140px] truncate cursor-pointer focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400"
            >
              {liveVotingMotion && (
                <option value={liveVotingMotion.id}>
                  En vivo: {liveVotingMotion.code}
                </option>
              )}
              {resolvedMotions.slice(0, 12).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} · {m.title}
                </option>
              ))}
            </select>
          )}

          {isLiveVoting ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              <span>En vivo</span>
            </span>
          ) : motionReflected ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
              <Clock className="w-3 h-3 text-[#4A154B] dark:text-purple-300" />
              <span>Concluida</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span>En espera</span>
            </span>
          )}
        </div>
      </div>

      {/* Motion Banner */}
      {motionReflected ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 px-0.5">
          <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {motionReflected.code} — {motionReflected.title}
          </span>
          <span
            className={`shrink-0 font-mono text-[10px] font-bold ${
              motionReflected.status === 'APPROVED'
                ? 'text-emerald-700 dark:text-emerald-400'
                : motionReflected.status === 'REJECTED'
                  ? 'text-rose-700 dark:text-rose-400'
                  : motionReflected.status === 'PASSED_TO_RUNOFF'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-[#4A154B] dark:text-purple-300'
            }`}
          >
            {motionReflected.status === 'APPROVED'
              ? '✓ Aprobada'
              : motionReflected.status === 'REJECTED'
                ? '✗ Rechazada'
                : motionReflected.status === 'PASSED_TO_RUNOFF'
                  ? 'Balotaje'
                  : 'En vivo'}
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic px-0.5">
          Sin votaciones registradas en sala
        </div>
      )}

      {/* Unified Hemiciclo Chart (identical to PublicInicioView) */}
      <HemicicloPlenarioChart
        motion={motionReflected}
        delegates={delegates}
        maxHeightClass="max-h-[175px]"
      />
    </div>
  );
};
