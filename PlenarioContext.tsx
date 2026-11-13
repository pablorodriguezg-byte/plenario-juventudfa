import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Delegate, 
  Motion, 
  SynthesisChapter, 
  OrderMotion, 
  AuditLogEntry, 
  VoteOption, 
  SpeakerQueueItem,
  UserRole,
  ChileanRegion,
  OrderMotionCategory,
  Acta,
  DissensusItem,
  PresynthesisParagraph
} from '../types/plenario';
import { 
  INITIAL_DELEGATES, 
  INITIAL_MOTIONS, 
  INITIAL_SYNTHESIS_CHAPTERS, 
  INITIAL_ORDER_MOTIONS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_ACTAS,
  DEMO_TEMPLATE
} from '../data/initialData';
import confetti from 'canvas-confetti';

interface PlenarioContextType {
  currentUser: Delegate | null;
  setCurrentUser: (delegate: Delegate | null) => void;
  delegates: Delegate[];
  activeTab: 'plenario' | 'texto-final' | 'actas' | 'padron' | 'mesa-votaciones';
  setActiveTab: (tab: 'plenario' | 'texto-final' | 'actas' | 'padron' | 'mesa-votaciones') => void;
  activeMotion: Motion | null;
  activeMotionId: string;
  setActiveMotionId: (id: string) => void;
  motionsHistory: Motion[];
  hasActiveVoting: boolean;
  activeVotingMotion?: Motion;
  isAnyVotingOpen: boolean;
  activeOpenVotingMotion?: Motion;
  speakerQueue: SpeakerQueueItem[];
  activeSpeaker: SpeakerQueueItem | null;
  timerSeconds: number;
  timerTotal: number;
  isTimerRunning: boolean;
  lowBandwidthMode: boolean;
  setLowBandwidthMode: (enabled: boolean) => void;
  forceMuted: boolean;
  setForceMuted: (muted: boolean) => void;
  synthesisChapters: SynthesisChapter[];
  orderMotions: OrderMotion[];
  auditLogs: AuditLogEntry[];
  
  // Actas System
  actas: Acta[];
  activeActaId: string;
  setActiveActaId: (id: string) => void;
  createActa: (data: Partial<Acta>) => Acta;
  updateActa: (id: string, updates: Partial<Acta>) => void;
  deleteActa: (id: string) => { success: boolean; error?: string };
  certifyActa: (id: string) => void;
  
  // Role helpers
  isSecretariaTecnica: boolean;
  isDelegate: boolean;
  canVote: boolean;
  
  // Modal de Acreditación
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  
  // Actions
  loginWithEmail: (email: string) => { success: boolean; error?: string };
  logout: () => void;
  castVote: (option: VoteOption, notes?: string) => void;
  openVotingForMotion: (motionId: string) => void;
  closeVotingForMotion: (motionId: string) => void;
  discardPresentedMotion: (motionId: string) => void;
  createNewMotion: (
    title: string, 
    description: string, 
    quorumType: 'SIMPLE_MAJORITY' | 'TWO_THIRDS' | 'ABSOLUTE_MAJORITY',
    immediateLaunch?: boolean,
    durationSeconds?: number
  ) => Motion | undefined;

  // METODOLOGÍA OFICIAL DE DELIBERACIÓN Y VOTACIÓN
  proposeExtensiveMotion: (chapterId: string, paragraphId: string, proposedExtension: string, title?: string) => Motion | undefined;
  proposeSuppressiveMotion: (chapterId: string, paragraphId: string, title?: string) => Motion | undefined;
  launchABCVote: (
    title: string,
    description: string,
    optionA: { label: string; text: string; region: string },
    optionB: { label: string; text: string; region: string },
    optionC: { label: string; text: string; region: string },
    durationSeconds?: number
  ) => Motion | undefined;
  launchDissensusRound1: (dissensusId: string) => Motion | undefined;
  passDissensusToRound2: (dissensusId: string, option1: 'A' | 'B' | 'C', option2: 'A' | 'B' | 'C') => Motion | undefined;
  launchGeneralPresynthesisVote: () => Motion | undefined;
  launchFinalSynthesisVote: () => Motion | undefined;
  
  // Dissensus Management (Secretaría Técnica)
  addDissensusItem: (chapterId: string, dissensus: Omit<DissensusItem, 'id' | 'status'>) => DissensusItem;
  updateDissensusItem: (dissensusId: string, updates: Partial<DissensusItem>) => void;
  deleteDissensusItem: (dissensusId: string) => void;
  
  // Delegate Management (Secretaría Técnica)
  deleteDelegate: (delegateId: string) => { success: boolean; error?: string };
  updateDelegate: (delegateId: string, updates: Partial<Delegate>) => { success: boolean; error?: string };
  addDelegate: (newDel: Omit<Delegate, 'id' | 'isOnline' | 'hasSpokenInCurrentMotion'>) => void;
  
  // Presynthesis Builder & Updates (Secretaría Técnica)
  addChapter: (number: number, title: string) => void;
  updateChapter: (chapterId: string, number: number, title: string) => void;
  deleteChapter: (chapterId: string) => void;
  addParagraphToChapter: (chapterId: string, number: string, text: string, title?: string) => void;
  updateParagraphInChapter: (chapterId: string, paragraphId: string, text: string, title?: string) => void;
  deleteParagraphFromChapter: (chapterId: string, paragraphId: string) => void;
  updateParagraphText: (chapterId: string, paragraphId: string, newText: string) => void;
  downloadFinalSynthesisDocument: () => void;
  exportFinalSynthesisPDF: () => void;
  
  // Padron & CSV
  importDelegatesCSV: (csvText: string) => { success: boolean; count: number; error?: string };
  exportPadronCSV: () => void;
  exportActaCSV: () => void;
  addAuditLog: (action: string, details: string) => void;
  resetAllData: () => void;

  // Carpeta Interna de Archivo (/data) & Persistencia Permanente
  storageStatus: { connected: boolean; storagePath: string; lastSaved?: number };
  saveToInternalStorage: () => Promise<boolean>;
  uploadFileToInternalStorage: (filename: string, content: string, type?: string, category?: string) => Promise<{ success: boolean; file?: any; error?: string }>;
  listInternalFiles: () => Promise<Array<{ id: string; name: string; sizeBytes: number; createdAt: number }>>;
  loadDemoTemplate: () => void;
  resetToCleanLaunch: () => void;
}

const PlenarioContext = createContext<PlenarioContextType | undefined>(undefined);

// Web Audio sound synthesizer helper for countdown alerts
const playTone = (frequency: number, type: OscillatorType, duration: number) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio might be constrained if user hasn't interacted yet
  }
};

export const PlenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Versionado para garantizar limpieza de datos simulados en navegadores anteriores
  const CLEAN_STORAGE_VERSION = 'fe_fa_clean_v6_production_launch';
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('fe_fa_storage_version') !== CLEAN_STORAGE_VERSION) {
      localStorage.removeItem('fe_fa_delegates');
      localStorage.removeItem('fe_fa_motions');
      localStorage.removeItem('fe_fa_synthesis');
      localStorage.removeItem('fe_fa_order_motions');
      localStorage.removeItem('fe_fa_actas');
      localStorage.setItem('fe_fa_storage_version', CLEAN_STORAGE_VERSION);
    }
  }

  const [delegates, setDelegates] = useState<Delegate[]>(() => {
    try {
      const saved = localStorage.getItem('fe_fa_delegates');
      if (saved) {
        const parsed: Delegate[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_DELEGATES;
  });

  const [currentUser, setCurrentUser] = useState<Delegate | null>(() => {
    try {
      const savedId = localStorage.getItem('fe_fa_current_user_id');
      if (savedId) {
        const match = delegates.find(d => d.id === savedId) || INITIAL_DELEGATES.find(d => d.id === savedId);
        if (match) return match;
      }
    } catch {}
    return null;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(() => {
    return !localStorage.getItem('fe_fa_current_user_id');
  });

  const [activeTab, setActiveTab] = useState<'plenario' | 'texto-final' | 'actas' | 'padron' | 'mesa-votaciones'>('plenario');
  
  // Votaciones en limpio (0 simuladas)
  const [motionsHistory, setMotionsHistory] = useState<Motion[]>(() => {
    try {
      const saved = localStorage.getItem('fe_fa_motions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_MOTIONS;
  });

  const [activeMotionId, setActiveMotionId] = useState<string>(() => {
    const open = motionsHistory.find(m => m.status === 'VOTING');
    if (open) return open.id;
    const nonDraft = motionsHistory.filter(m => m.status !== 'DRAFT');
    return nonDraft[0]?.id || '';
  });
  
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(false);
  const [forceMuted, setForceMuted] = useState<boolean>(false);

  // Fila de oratoria en limpio
  const [speakerQueue, setSpeakerQueue] = useState<SpeakerQueueItem[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerQueueItem | null>(null);

  // Timer state
  const [timerTotal, setTimerTotal] = useState<number>(120);
  const [timerSeconds, setTimerSeconds] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Síntesis y capítulos en limpio (0 simulados)
  const [synthesisChapters, setSynthesisChapters] = useState<SynthesisChapter[]>(() => {
    try {
      const saved = localStorage.getItem('fe_fa_synthesis');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_SYNTHESIS_CHAPTERS;
  });

  // Mociones de orden en limpio
  const [orderMotions, setOrderMotions] = useState<OrderMotion[]>(() => {
    try {
      const saved = localStorage.getItem('fe_fa_order_motions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ORDER_MOTIONS;
  });

  // Registro de auditoría
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('fe_fa_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_AUDIT_LOGS;
  });

  // Actas en limpio
  const [actas, setActas] = useState<Acta[]>(() => {
    try {
      const saved = localStorage.getItem('fe_fa_actas');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ACTAS;
  });
  const [activeActaId, setActiveActaId] = useState<string>('');

  // Estado de almacenamiento persistente en la carpeta interna (/data)
  const [storageStatus, setStorageStatus] = useState<{ connected: boolean; storagePath: string; lastSaved?: number }>({
    connected: false,
    storagePath: '/data',
    lastSaved: undefined
  });

  // Control estricto de mutaciones locales vs sincronización remota (SSE)
  const [localMutationSeq, setLocalMutationSeq] = useState<number>(0);
  const localMutationEpochRef = useRef<number>(0);
  const markLocalMutation = useCallback(() => {
    localMutationEpochRef.current += 1;
    setLocalMutationSeq(prev => prev + 1);
  }, []);

  const lastSeenVersionRef = useRef<number>(0);
  const prevOpenVotingIdRef = useRef<string | null>(
    motionsHistory.find(m => m.status === 'VOTING')?.id || null
  );
  const currentUserIdRef = useRef<string | null>(currentUser?.id || null);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;
  }, [currentUser?.id]);

  // Función para guardar inmediatamente en la carpeta interna /data/plenario_store.json
  const saveToInternalStorage = useCallback(async (): Promise<boolean> => {
    try {
      const payload = {
        savedAt: Date.now(),
        isoTime: new Date().toISOString(),
        delegates,
        motionsHistory,
        synthesisChapters,
        orderMotions,
        actas,
        auditLogs
      };

      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (data.version && !motionsHistory.some(m => m.status === 'VOTING')) {
          lastSeenVersionRef.current = Math.max(lastSeenVersionRef.current, Number(data.version));
        }
        setStorageStatus({
          connected: true,
          storagePath: '/data',
          lastSaved: data.savedAt || Date.now()
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [delegates, motionsHistory, synthesisChapters, orderMotions, actas, auditLogs]);

  // Aplicar instantáneamente snapshot recibido desde el servidor (SSE o carga inicial)
  const applyServerSnapshot = useCallback((d: any, version: number, savedAt?: number) => {
    if (!d) return;
    if (version && version <= lastSeenVersionRef.current) return;
    if (version) {
      lastSeenVersionRef.current = version;
    }

    if (Array.isArray(d.delegates) && d.delegates.length > 0) {
      setDelegates(d.delegates);
      if (currentUserIdRef.current) {
        const refreshedUser = d.delegates.find((del: Delegate) => del.id === currentUserIdRef.current);
        if (refreshedUser) {
          setCurrentUser(refreshedUser);
        }
      }
    }

    if (Array.isArray(d.motionsHistory)) {
      setMotionsHistory(d.motionsHistory);
      const serverOpenVoting: Motion | undefined = d.motionsHistory.find((m: Motion) => m.status === 'VOTING');
      if (serverOpenVoting) {
        if (serverOpenVoting.id !== prevOpenVotingIdRef.current) {
          prevOpenVotingIdRef.current = serverOpenVoting.id;
          setActiveMotionId(serverOpenVoting.id);
        }
      } else {
        prevOpenVotingIdRef.current = null;
        setActiveMotionId(prevId => {
          const validSelected = d.motionsHistory.find((m: Motion) => m.id === prevId && m.status !== 'DRAFT');
          if (validSelected) return prevId;
          const nonDraft = d.motionsHistory.filter((m: Motion) => m.status !== 'DRAFT');
          if (nonDraft.length === 0) return '';
          const sorted = [...nonDraft].sort((a: Motion, b: Motion) => {
            const tA = a.closedAt || a.startedAt || a.createdAt || 0;
            const tB = b.closedAt || b.startedAt || b.createdAt || 0;
            return tB - tA;
          });
          return sorted[0]?.id || '';
        });
      }
    }

    if (Array.isArray(d.synthesisChapters)) setSynthesisChapters(d.synthesisChapters);
    if (Array.isArray(d.orderMotions)) setOrderMotions(d.orderMotions);
    if (Array.isArray(d.actas)) setActas(d.actas);
    if (Array.isArray(d.auditLogs)) setAuditLogs(d.auditLogs);

    setStorageStatus({
      connected: true,
      storagePath: '/data',
      lastSaved: savedAt || Date.now()
    });
  }, []);

  // Sincronización inicial al cargar y suscripción en tiempo real vía SSE (/api/events)
  useEffect(() => {
    let isMounted = true;

    const fetchLatestFromServer = async (seedIfMissing = false) => {
      const epochAtStart = localMutationEpochRef.current;
      try {
        const resRaw = await fetch('/api/storage');
        const res = await resRaw.json();
        if (!isMounted) return;
        // Ignorar respuestas en vuelo iniciadas antes de una mutación local reciente (p. ej. cierre de votación)
        if (epochAtStart !== localMutationEpochRef.current) return;

        if (res.success && res.exists && res.data) {
          applyServerSnapshot(res.data, Number(res.version || res.data.version || 0), res.savedAt);
        } else if (seedIfMissing) {
          setStorageStatus(prev => ({ ...prev, connected: true }));
          saveToInternalStorage();
        }
      } catch {
        if (isMounted) {
          setStorageStatus(prev => ({ ...prev, connected: false }));
        }
      }
    };

    fetchLatestFromServer(true);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('update', (evt: MessageEvent) => {
        try {
          const info = JSON.parse(evt.data);
          if (!info?.version || Number(info.version) > lastSeenVersionRef.current) {
            fetchLatestFromServer(false);
          }
        } catch {
          fetchLatestFromServer(false);
        }
      });
    } catch {
      // Fallback handled by polling below
    }

    // Respaldo de sincronización cada 5 segundos para entornos sin SSE persistente
    const syncPoll = setInterval(() => {
      fetchLatestFromServer(false);
    }, 5000);

    return () => {
      isMounted = false;
      eventSource?.close();
      clearInterval(syncPoll);
    };
  }, [applyServerSnapshot]);

  // Guardado automático debounced SOLO ante mutaciones locales reales (nunca en hidrataciones SSE)
  useEffect(() => {
    if (localMutationSeq === 0) return;
    const timer = setTimeout(() => {
      saveToInternalStorage();
    }, 120);
    return () => clearTimeout(timer);
  }, [localMutationSeq, saveToInternalStorage]);

  // Subir archivo a /data/uploads
  const uploadFileToInternalStorage = useCallback(async (
    filename: string, 
    content: string, 
    type?: string, 
    category?: string
  ) => {
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content, type, category })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  // Listar archivos en /data/uploads
  const listInternalFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/storage/files');
      const data = await res.json();
      return data.files || [];
    } catch {
      return [];
    }
  }, []);

  // Restablecer a modo lanzamiento oficial limpio
  const resetToCleanLaunch = useCallback(() => {
    localStorage.removeItem('fe_fa_delegates');
    localStorage.removeItem('fe_fa_motions');
    localStorage.removeItem('fe_fa_synthesis');
    localStorage.removeItem('fe_fa_order_motions');
    localStorage.removeItem('fe_fa_actas');
    lastSeenVersionRef.current = 0;
    prevOpenVotingIdRef.current = null;
    setDelegates(INITIAL_DELEGATES);
    setCurrentUser(INITIAL_DELEGATES[0]);
    setMotionsHistory([]);
    setActiveMotionId('');
    setSynthesisChapters([]);
    setOrderMotions([]);
    setActas([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    fetch('/api/storage/reset', { method: 'POST' }).catch(() => {});
  }, []);

  // Cargar plantilla de prueba (para ensayos de sala)
  const loadDemoTemplate = useCallback(() => {
    setDelegates(DEMO_TEMPLATE.delegates);
    setSynthesisChapters(DEMO_TEMPLATE.chapters);
    setCurrentUser(DEMO_TEMPLATE.delegates[0]);
    localStorage.setItem('fe_fa_delegates', JSON.stringify(DEMO_TEMPLATE.delegates));
    localStorage.setItem('fe_fa_synthesis', JSON.stringify(DEMO_TEMPLATE.chapters));
    markLocalMutation();
  }, [markLocalMutation]);

  // Guardar en localStorage como caché secundaria
  useEffect(() => {
    localStorage.setItem('fe_fa_delegates', JSON.stringify(delegates));
  }, [delegates]);

  useEffect(() => {
    localStorage.setItem('fe_fa_motions', JSON.stringify(motionsHistory));
  }, [motionsHistory]);

  useEffect(() => {
    localStorage.setItem('fe_fa_synthesis', JSON.stringify(synthesisChapters));
  }, [synthesisChapters]);

  useEffect(() => {
    localStorage.setItem('fe_fa_order_motions', JSON.stringify(orderMotions));
  }, [orderMotions]);

  useEffect(() => {
    localStorage.setItem('fe_fa_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('fe_fa_actas', JSON.stringify(actas));
  }, [actas]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('fe_fa_current_user_id', currentUser.id);
    } else {
      localStorage.removeItem('fe_fa_current_user_id');
    }
  }, [currentUser]);

  // Moción activa segura (excluye borradores DRAFT sin aprobar por Secretaría Técnica)
  const activeMotion: Motion | null = useMemo(() => {
    const selectable = motionsHistory.filter(m => m.status !== 'DRAFT');
    if (selectable.length === 0) return null;
    const found = selectable.find(m => m.id === activeMotionId);
    if (found) return found;
    const open = selectable.find(m => m.status === 'VOTING');
    if (open) return open;
    const sorted = [...selectable].sort((a, b) => {
      const timeA = a.closedAt || a.startedAt || a.createdAt || 0;
      const timeB = b.closedAt || b.startedAt || b.createdAt || 0;
      return timeB - timeA;
    });
    return sorted[0] || null;
  }, [motionsHistory, activeMotionId]);

  // Bloqueo estricto: solo puede haber una votación activa en sala a la vez
  const hasActiveVoting = useMemo(() => {
    return motionsHistory.some(m => m.status === 'VOTING');
  }, [motionsHistory]);

  const activeVotingMotion = useMemo(() => {
    return motionsHistory.find(m => m.status === 'VOTING');
  }, [motionsHistory]);

  // Construye registro de auditoría reutilizable
  const buildAuditEntry = useCallback((action: string, details: string): AuditLogEntry => {
    return {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      delegateId: currentUser ? currentUser.id : 'SYSTEM',
      delegateName: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Sistema Automatizado',
      ipAddress: currentUser?.ipAddress || '190.161.42.1',
      action,
      details,
      integrityHash: Array.from(action + details + Date.now())
        .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
        .toString(16) + '...sha256'
    };
  }, [currentUser]);

  // Add audit log helper
  const addAuditLog = useCallback((action: string, details: string) => {
    const newEntry = buildAuditEntry(action, details);
    setAuditLogs(prev => [newEntry, ...prev.slice(0, 199)]);
    return newEntry;
  }, [buildAuditEntry]);

  // Delete delegate (Secretaría Técnica)
  const deleteDelegate = useCallback((delegateId: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'SECRETARY') {
      return { success: false, error: 'Acceso no autorizado. Solo la Secretaría Técnica puede gestionar y eliminar usuarios del padrón.' };
    }

    if (currentUser.id === delegateId) {
      return { success: false, error: 'No puede eliminar su propia cuenta activa del padrón.' };
    }

    const target = delegates.find(d => d.id === delegateId);
    if (!target) {
      return { success: false, error: 'Delegado/a no encontrado en el padrón.' };
    }

    // Remove from delegates list
    setDelegates(prev => prev.filter(d => d.id !== delegateId));

    // Remove from speaker queue if present
    setSpeakerQueue(prev => prev.filter(item => item.delegateId !== delegateId));
    if (activeSpeaker?.delegateId === delegateId) {
      setActiveSpeaker(null);
      setIsTimerRunning(false);
    }

    addAuditLog('ELIMINACION_DELEGADO', `${currentUser.name} (Secretaría Técnica) eliminó del padrón a ${target.name} (${target.region})`);
    markLocalMutation();
    return { success: true };
  }, [currentUser, delegates, activeSpeaker, addAuditLog, markLocalMutation]);

  // Update delegate (Secretaría Técnica)
  const updateDelegate = useCallback((delegateId: string, updates: Partial<Delegate>): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== 'SECRETARY') {
      return { success: false, error: 'Acceso no autorizado. Solo la Secretaría Técnica puede modificar usuarios en el padrón.' };
    }

    const target = delegates.find(d => d.id === delegateId);
    if (!target) {
      return { success: false, error: 'Usuario no encontrado en el padrón.' };
    }

    setDelegates(prev => prev.map(d => d.id === delegateId ? { ...d, ...updates } : d));
    addAuditLog('MODIFICACION_USUARIO', `${currentUser.name} (Secretaría Técnica) modificó los datos de ${target.name} (${target.email})`);
    markLocalMutation();
    return { success: true };
  }, [currentUser, delegates, addAuditLog, markLocalMutation]);

  // Add delegate manually (Secretaría Técnica / Admin)
  const addDelegate = useCallback((newDel: Omit<Delegate, 'id' | 'isOnline' | 'hasSpokenInCurrentMotion'>) => {
    const id = `del-${Date.now()}`;
    const delegate: Delegate = {
      ...newDel,
      id,
      isOnline: true,
      hasSpokenInCurrentMotion: false,
      ipAddress: `190.161.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    };
    setDelegates(prev => [delegate, ...prev]);
    addAuditLog('ALTA_DELEGADO', `Acreditación individual agregada por Secretaría Técnica: ${delegate.name} (${delegate.region})`);
    markLocalMutation();
  }, [addAuditLog, markLocalMutation]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev === 21) {
            playTone(440, 'sine', 0.2);
          }
          if (prev <= 1) {
            playTone(880, 'triangle', 0.5);
            setTimeout(() => playTone(587.33, 'triangle', 0.8), 250);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Parity & Regional Alternance Algorithm for Word Requests
  const calculatePriority = useCallback((delegate: Delegate, lastSpeaker?: SpeakerQueueItem | null): number => {
    let score = 50;

    // Gender Parity Bonus: Alternate gender from previous speaker
    if (lastSpeaker) {
      if (lastSpeaker.gender === 'Masculino' && delegate.gender === 'Femenino') score += 30;
      else if (lastSpeaker.gender === 'Masculino' && delegate.gender === 'No-binario') score += 25;
      else if (lastSpeaker.gender === 'Femenino' && delegate.gender === 'Masculino') score += 20;
    } else {
      if (delegate.gender === 'Femenino') score += 15;
    }

    // Regional Alternance: Prioritize regions from extreme zones
    const extremeRegions: ChileanRegion[] = ['Arica y Parinacota', 'Tarapacá', 'Aysén', 'Magallanes'];
    if (extremeRegions.includes(delegate.region)) {
      score += 20;
    }

    if (!delegate.hasSpokenInCurrentMotion) {
      score += 15;
    }

    return score;
  }, []);

  const requestWord = useCallback(() => {
    if (!currentUser) return;
    if (speakerQueue.some(item => item.delegateId === currentUser.id && item.status !== 'COMPLETED')) {
      return;
    }

    const priority = calculatePriority(currentUser, activeSpeaker);
    const newItem: SpeakerQueueItem = {
      id: `sq-${Date.now()}`,
      delegateId: currentUser.id,
      delegateName: currentUser.name,
      region: currentUser.region,
      gender: currentUser.gender,
      requestedAt: Date.now(),
      priorityScore: priority,
      status: 'WAITING',
      timeAllocatedSeconds: 120
    };

    setSpeakerQueue(prev => {
      const updated = [...prev, newItem];
      return updated.sort((a, b) => {
        if (a.status === 'SPEAKING') return -1;
        if (b.status === 'SPEAKING') return 1;
        return b.priorityScore - a.priorityScore;
      });
    });

    addAuditLog('SOLICITUD_PALABRA', `${currentUser.name} (${currentUser.region}) solicitó la palabra. Prioridad paritaria: ${priority}`);
  }, [currentUser, activeSpeaker, speakerQueue, calculatePriority, addAuditLog]);

  const withdrawWord = useCallback(() => {
    if (!currentUser) return;
    setSpeakerQueue(prev => prev.filter(item => item.delegateId !== currentUser.id || item.status === 'SPEAKING'));
    addAuditLog('RETIRO_PALABRA', `${currentUser.name} bajó la mano`);
  }, [currentUser, addAuditLog]);

  const giveWordToSpeaker = useCallback((queueItemId: string) => {
    const target = speakerQueue.find(i => i.id === queueItemId);
    if (!target) return;

    setSpeakerQueue(prev => prev.map(item => {
      if (item.id === queueItemId) return { ...item, status: 'SPEAKING' };
      if (item.status === 'SPEAKING') return { ...item, status: 'COMPLETED' };
      return item;
    }));

    setActiveSpeaker({ ...target, status: 'SPEAKING' });
    setTimerSeconds(target.timeAllocatedSeconds || 120);
    setTimerTotal(target.timeAllocatedSeconds || 120);
    setIsTimerRunning(true);

    addAuditLog('CONCESION_PALABRA', `Mesa Directiva concede la palabra a ${target.delegateName} (${target.region}) por 2:00 min.`);
  }, [speakerQueue, addAuditLog]);

  const finishSpeaking = useCallback(() => {
    if (activeSpeaker) {
      setSpeakerQueue(prev => prev.map(i => i.id === activeSpeaker.id ? { ...i, status: 'COMPLETED' } : i));
      addAuditLog('FIN_INTERVENCION', `Concluyó la intervención de ${activeSpeaker.delegateName}`);
      setActiveSpeaker(null);
      setIsTimerRunning(false);
      setTimerSeconds(120);
    }
  }, [activeSpeaker, addAuditLog]);

  const startTimer = useCallback(() => setIsTimerRunning(true), []);
  const pauseTimer = useCallback(() => setIsTimerRunning(false), []);
  const resetTimer = useCallback((customSeconds = 120) => {
    setTimerSeconds(customSeconds);
    setTimerTotal(customSeconds);
    setIsTimerRunning(false);
  }, []);
  const addThirtySeconds = useCallback(() => {
    setTimerSeconds(prev => prev + 30);
    setTimerTotal(prev => prev + 30);
  }, []);

  const takeFloorAsPresidency = useCallback(() => {
    if (!currentUser) return;
    const item: SpeakerQueueItem = {
      id: `sq-mesa-${Date.now()}`,
      delegateId: currentUser.id,
      delegateName: `${currentUser.name} (Dirección Nacional)`,
      region: currentUser.region,
      gender: currentUser.gender,
      requestedAt: Date.now(),
      priorityScore: 999,
      status: 'SPEAKING',
      timeAllocatedSeconds: 180
    };
    setActiveSpeaker(item);
    setTimerSeconds(180);
    setTimerTotal(180);
    setIsTimerRunning(true);
    addAuditLog('INTERVENCION_MESA', `La Dirección Nacional (${currentUser.name}) hace uso de la palabra para presidir y orientar el debate.`);
  }, [currentUser, addAuditLog]);

  // Helper to identify unique browser tab
  const getTabSessionId = useCallback((): string => {
    if (typeof window === 'undefined') return 'server';
    let id = sessionStorage.getItem('fe_fa_tab_session_id');
    if (!id) {
      id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('fe_fa_tab_session_id', id);
    }
    return id;
  }, []);

  // Login & Session handling
  const loginWithEmail = useCallback((email: string): { success: boolean; error?: string } => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      return { success: false, error: 'Por favor ingrese su correo institucional acreditado.' };
    }
    
    // Buscar en padrón activo o padrón base
    let found = delegates.find(d => d.email.toLowerCase() === clean) ||
                INITIAL_DELEGATES.find(d => d.email.toLowerCase() === clean);

    // Búsqueda específica solicitada para la Secretaría Técnica: secretaria@juventudes.cl
    if (!found && (clean === 'secretaria@juventudes.cl' || clean.includes('secretaria@juventudes') || clean === 'secretariatecnica@fe-fa.cl')) {
      found = delegates.find(d => d.email === 'secretaria@juventudes.cl') ||
              delegates.find(d => d.role === 'SECRETARY') ||
              INITIAL_DELEGATES.find(d => d.email === 'secretaria@juventudes.cl');
    }

    if (!found) {
      return { 
        success: false, 
        error: 'El correo ingresado no se encuentra registrado en el Padrón Oficial. Verifique la dirección o contacte a la Secretaría Técnica.' 
      };
    }

    // Regla estricta de usuario único para Secretaría Técnica
    const isTargetSecretary = found.role === 'SECRETARY' || found.email.toLowerCase() === 'secretaria@juventudes.cl';
    if (isTargetSecretary) {
      const activeLock = localStorage.getItem('fe_fa_secretaria_tecnica_session');
      const currentTab = getTabSessionId();
      if (activeLock) {
        try {
          const lockData = JSON.parse(activeLock);
          const now = Date.now();
          // Sesión activa en otra pestaña o navegador hace menos de 10 minutos
          if (lockData.active && lockData.tabId && lockData.tabId !== currentTab && (now - (lockData.lastHeartbeat || 0)) < 10 * 60 * 1000) {
            return {
              success: false,
              error: `Acceso no permitido: Ya existe una sesión activa de la Secretaría Técnica (${lockData.name || 'Usuario en línea'}). Por razones de seguridad institucional y fe pública del Plenario, solo se permite un único usuario conectado a la vez en este rol. Cierre la sesión activa antes de ingresar.`
            };
          }
        } catch {
          // Ignorar y reescribir si está dañado
        }
      }

      // Registrar nuevo lock activo
      localStorage.setItem('fe_fa_secretaria_tecnica_session', JSON.stringify({
        active: true,
        tabId: currentTab,
        email: found.email,
        name: found.name,
        lastHeartbeat: Date.now()
      }));
    }

    const newSessionId = `sess-${Date.now()}`;
    const updated = { ...found, lastSessionId: newSessionId, isOnline: true };
    
    setDelegates(prev => {
      const exists = prev.some(d => d.id === found!.id);
      if (exists) {
        return prev.map(d => d.id === found!.id ? updated : d);
      }
      return [updated, ...prev];
    });

    setCurrentUser(updated);
    localStorage.setItem('fe_fa_current_user_id', updated.id);
    const auditEntry = buildAuditEntry('ACREDITACION_EXITOSA', `${found.name} (${found.role}) acreditado formalmente con el correo ${found.email}.`);
    setAuditLogs(prev => [auditEntry, ...prev.slice(0, 199)]);

    // Persistencia atómica de sesión para no sobreescribir votaciones abiertas ni capítulos
    fetch('/api/delegates/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegate: updated, auditEntry })
    }).catch(() => {});

    return { success: true };
  }, [delegates, getTabSessionId, buildAuditEntry]);

  // Heartbeat para mantener la sesión única activa de Secretaría Técnica
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'SECRETARY') {
      const currentTab = getTabSessionId();
      const interval = setInterval(() => {
        const raw = localStorage.getItem('fe_fa_secretaria_tecnica_session');
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data.tabId === currentTab) {
              data.lastHeartbeat = Date.now();
              localStorage.setItem('fe_fa_secretaria_tecnica_session', JSON.stringify(data));
            }
          } catch {}
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, getTabSessionId]);

  const logout = useCallback(() => {
    if (currentUser) {
      if (currentUser.role === 'SECRETARY') {
        const activeLock = localStorage.getItem('fe_fa_secretaria_tecnica_session');
        if (activeLock) {
          try {
            const lockData = JSON.parse(activeLock);
            if (lockData.tabId === getTabSessionId()) {
              localStorage.removeItem('fe_fa_secretaria_tecnica_session');
            }
          } catch {}
        }
      }
      addAuditLog('CIERRE_SESION', `${currentUser.name} cerró sesión en la plataforma`);
    }
    setCurrentUser(null);
    localStorage.removeItem('fe_fa_current_user_id');
    setShowLoginModal(true);
  }, [currentUser, getTabSessionId, addAuditLog]);

  // Role permissions: Strictly Secretaría Técnica and Delegados
  const isSecretariaTecnica = useMemo(() => {
    return currentUser?.role === 'SECRETARY';
  }, [currentUser]);

  const isDelegate = useMemo(() => {
    return currentUser?.role === 'DELEGATE';
  }, [currentUser]);

  // Voto vinculante privativo de delegadas/os regionales
  const canVote = useMemo(() => {
    return !!currentUser && currentUser.role === 'DELEGATE';
  }, [currentUser]);

  // Actas Operations
  const createActa = useCallback((data: Partial<Acta>): Acta => {
    const code = `ACTA-2026-${String(actas.length + 1).padStart(3, '0')}`;
    const newActa: Acta = {
      id: `acta-${Date.now()}`,
      code,
      sessionTitle: data.sessionTitle || 'Nueva Sesión Plenaria FE-FA',
      sessionType: data.sessionType || 'ORDINARIA',
      date: data.date || new Date().toISOString().slice(0, 10),
      timeStart: data.timeStart || '10:00',
      timeEnd: data.timeEnd || '18:00',
      location: data.location || 'Plataforma Digital Deliberativa Oficial FE-FA',
      quorumInstallationText: data.quorumInstallationText || `Con la presencia acreditada de ${delegates.length} delegadas/os regionales se verifica el quórum estatutario para sesionar.`,
      accreditedDelegatesCount: delegates.length,
      agendaTopics: data.agendaTopics && data.agendaTopics.length > 0 ? data.agendaTopics : [
        '1. Apertura de la sesión y verificación de quórum',
        '2. Puntos en debate del Documento de Síntesis Nacional',
        '3. Votaciones parlamentarias vinculantes'
      ],
      bodyContent: data.bodyContent || 'Se da inicio a la sesión deliberativa con la participación de las bancadas de todo el país...',
      conclusions: data.conclusions && data.conclusions.length > 0 ? data.conclusions : [
        'Ratificación de los consensos alcanzados en el Plenario.'
      ],
      votedMotionIds: data.votedMotionIds || (activeMotionId ? [activeMotionId] : []),
      status: 'BORRADOR',
      digitalSignatures: [
        {
          signerName: currentUser ? currentUser.name : 'Secretaría Técnica Fe Pública',
          role: currentUser ? currentUser.role : 'SECRETARY',
          timestamp: Date.now(),
          token: `token-${Date.now().toString(16)}`,
          status: 'PENDIENTE'
        }
      ],
      integrityHash: `hash-${Date.now().toString(16)}...sha256`,
      lastModifiedAt: Date.now(),
      lastModifiedBy: currentUser ? currentUser.name : 'Secretaría de Actas'
    };

    setActas(prev => [newActa, ...prev]);
    setActiveActaId(newActa.id);
    addAuditLog('CREACION_ACTA', `Nueva acta creada por ${currentUser?.name || 'Secretaría'}: ${code} - "${newActa.sessionTitle}"`);
    markLocalMutation();
    return newActa;
  }, [actas.length, delegates.length, activeMotionId, currentUser, addAuditLog, markLocalMutation]);

  const updateActa = useCallback((id: string, updates: Partial<Acta>) => {
    setActas(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          ...updates,
          lastModifiedAt: Date.now(),
          lastModifiedBy: currentUser ? currentUser.name : a.lastModifiedBy
        };
      }
      return a;
    }));
    addAuditLog('EDICION_ACTA', `Acta ${id} actualizada por ${currentUser?.name || 'Secretaría'}`);
    markLocalMutation();
  }, [currentUser, addAuditLog, markLocalMutation]);

  const deleteActa = useCallback((id: string) => {
    if (!isSecretariaTecnica) {
      return { success: false, error: 'Solo la Secretaría Técnica puede gestionar y eliminar borradores de actas.' };
    }
    const target = actas.find(a => a.id === id);
    if (!target) return { success: false, error: 'Acta no encontrada.' };
    if (target.status === 'CERTIFICADA') {
      return { success: false, error: 'No se puede eliminar un acta que ya ha sido formalmente certificada y firmada digitalmente.' };
    }

    setActas(prev => prev.filter(a => a.id !== id));
    if (activeActaId === id) {
      const remaining = actas.filter(a => a.id !== id);
      if (remaining.length > 0) setActiveActaId(remaining[0].id);
    }
    addAuditLog('ELIMINACION_ACTA', `Acta ${target.code} eliminada por ${currentUser?.name}`);
    markLocalMutation();
    return { success: true };
  }, [isSecretariaTecnica, actas, activeActaId, currentUser, addAuditLog, markLocalMutation]);

  const certifyActa = useCallback((id: string) => {
    if (!isSecretariaTecnica) return;
    const certHash = `sha256:${Array.from('CERTIFIED' + id + Date.now()).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0).toString(16)}...cert`;
    
    setActas(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: 'CERTIFICADA',
          integrityHash: certHash,
          lastModifiedAt: Date.now(),
          lastModifiedBy: currentUser ? `${currentUser.name} (Certificación Oficial)` : a.lastModifiedBy,
          digitalSignatures: a.digitalSignatures.map(sig => ({
            ...sig,
            status: 'FIRMADO',
            timestamp: Date.now()
          }))
        };
      }
      return a;
    }));

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#4A154B', '#00796B', '#FFD700']
    });

    addAuditLog('CERTIFICACION_ACTA', `Acta ${id} certificada con firma digital por la Secretaría Técnica.`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  // Voting operations: Emite sufragio atómico en servidor sin colisiones entre delegados
  const castVote = useCallback((option: VoteOption, notes?: string) => {
    const targetMotion = activeMotion?.status === 'VOTING' ? activeMotion : activeVotingMotion;
    if (!currentUser || !targetMotion) return;
    if (targetMotion.status !== 'VOTING') return;

    // Regla de reglamento: La Secretaría Técnica no posee derecho a voto
    if (!canVote) {
      addAuditLog('VOTO_DENEGADO_DIRECCION', `${currentUser.name} no posee derecho a voto conforme a las atribuciones orgánicas del Plenario.`);
      return;
    }

    const existingVote = targetMotion.votes[currentUser.id];
    if (existingVote) {
      addAuditLog(
        'VOTO_YA_EMITIDO',
        `${currentUser.name} (${currentUser.region}) intentó modificar su voto ya confirmado en moción ${targetMotion.code}. Operación bloqueada por reglamento.`
      );
      return;
    }

    const digitalSig = `fe4a-${currentUser.id.substring(0, 4)}-${Date.now().toString(16)}-voto`;

    const newVote = {
      delegateId: currentUser.id,
      delegateName: currentUser.name,
      region: currentUser.region,
      vote: option,
      timestamp: Date.now(),
      digitalSignatureHash: digitalSig,
      notes: notes || undefined
    };

    const auditAction = 'EMISION_VOTO';
    const auditDetails = `${currentUser.name} (${currentUser.region}) emitió voto definitivo [${option}] en moción ${targetMotion.code}. Hash: ${digitalSig}`;

    const auditEntry = buildAuditEntry(auditAction, auditDetails);

    // Actualización optimista local
    setMotionsHistory(prev => prev.map(m => {
      if (m.id === targetMotion.id) {
        return {
          ...m,
          votes: {
            ...m.votes,
            [currentUser.id]: newVote
          }
        };
      }
      return m;
    }));
    setAuditLogs(prev => [auditEntry, ...prev.slice(0, 199)]);

    // Registro atómico en /api/vote
    fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motionId: targetMotion.id,
        delegateId: currentUser.id,
        voteEntry: newVote,
        auditEntry
      })
    })
      .then(r => r.json())
      .then(res => {
        if (!res.success) {
          // Resincronizar con el servidor si la votación fue cerrada o rechazada
          fetch('/api/storage')
            .then(sr => sr.json())
            .then(sr => {
              if (sr.success && sr.exists && sr.data) {
                lastSeenVersionRef.current = 0;
                applyServerSnapshot(sr.data, Number(sr.version || 0), sr.savedAt);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [currentUser, activeMotion, activeVotingMotion, canVote, addAuditLog, buildAuditEntry, applyServerSnapshot]);

  const openVotingForMotion = useCallback((motionId: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', `${currentUser?.name || 'Usuario'} (Delegado/a) intentó abrir votación. Los delegados no tienen permitido lanzar o abrir votaciones.`);
      return;
    }
    const alreadyOpen = motionsHistory.find(m => m.status === 'VOTING' && m.id !== motionId);
    if (alreadyOpen) {
      addAuditLog('ACCION_DENEGADA', `Imposible abrir votación para ${motionId}. Ya existe una votación abierta en sala (${alreadyOpen.code}). Por reglamento, solo puede haber una votación activa a la vez.`);
      return;
    }
    setMotionsHistory(prev => prev.map(m => {
      if (m.id === motionId) {
        return {
          ...m,
          status: 'VOTING',
          startedAt: Date.now()
        };
      }
      return m;
    }));
    prevOpenVotingIdRef.current = motionId;
    setActiveMotionId(motionId);
    addAuditLog('APERTURA_VOTACION', `Votación formal iniciada por la Secretaría Técnica (${currentUser?.name}) para la moción ${motionId}`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, motionsHistory, addAuditLog, markLocalMutation]);

  const closeVotingForMotion = useCallback((motionId: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', `${currentUser?.name || 'Usuario'} (Delegado/a) intentó cerrar votación. Atribución privativa de la Secretaría Técnica.`);
      return;
    }

    const m = motionsHistory.find(item => item.id === motionId);
    if (!m) return;

    const eligible = delegates.filter(d => d.role === 'DELEGATE').length;
    const votesArray = Object.values(m.votes || {});
    const castCount = votesArray.length;
    const aFavor = votesArray.filter(v => v.vote === 'A_FAVOR').length;
    const enContra = votesArray.filter(v => v.vote === 'EN_CONTRA').length;
    const abstencion = votesArray.filter(v => v.vote === 'ABSTENCION').length;
    const opcionA = votesArray.filter(v => v.vote === 'OPCION_A').length;
    const opcionB = votesArray.filter(v => v.vote === 'OPCION_B').length;
    const opcionC = votesArray.filter(v => v.vote === 'OPCION_C').length;

    // Quorum de participación (50% del padrón con derecho a voto)
    const quorumMet = eligible > 0 ? castCount >= Math.ceil(eligible * 0.5) : castCount > 0;

    let updatedMotion: Motion;

    // DISENSO PRIMERA VUELTA (A, B, C)
    if (m.motionKind === 'DISENSO_PRIMERA_VUELTA') {
      const directVotes = opcionA + opcionB + opcionC;
      const pctA = directVotes > 0 ? (opcionA / directVotes) * 100 : 0;
      const pctB = directVotes > 0 ? (opcionB / directVotes) * 100 : 0;
      const pctC = directVotes > 0 ? (opcionC / directVotes) * 100 : 0;

      // Regla metodológica: Mayoría absoluta entre las tres opciones (>50%)
      let winner: 'A' | 'B' | 'C' | undefined = undefined;
      if (opcionA > directVotes * 0.5) winner = 'A';
      else if (opcionB > directVotes * 0.5) winner = 'B';
      else if (opcionC > directVotes * 0.5) winner = 'C';

      const needsRunoff = !winner && directVotes > 0;
      let runoffOptions: ['A' | 'B' | 'C', 'A' | 'B' | 'C'] | undefined = undefined;

      if (needsRunoff) {
        const sorted = [
          { opt: 'A' as const, votes: opcionA },
          { opt: 'B' as const, votes: opcionB },
          { opt: 'C' as const, votes: opcionC }
        ].sort((x, y) => y.votes - x.votes);
        runoffOptions = [sorted[0].opt, sorted[1].opt];
      }

      if (winner && m.dissensusId) {
        setSynthesisChapters(chPrev => chPrev.map(ch => ({
          ...ch,
          dissensusItems: (ch.dissensusItems || []).map(dis => dis.id === m.dissensusId ? {
            ...dis,
            status: 'RESUELTO',
            winner
          } : dis)
        })));
      } else if (runoffOptions && m.dissensusId) {
        setSynthesisChapters(chPrev => chPrev.map(ch => ({
          ...ch,
          dissensusItems: (ch.dissensusItems || []).map(dis => dis.id === m.dissensusId ? {
            ...dis,
            round2Runoff: runoffOptions,
            round1Votes: { a: opcionA, b: opcionB, c: opcionC, abs: abstencion }
          } : dis)
        })));
      }

      if (winner) {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.5 } });
      }

      updatedMotion = {
        ...m,
        status: winner ? 'APPROVED' : 'PASSED_TO_RUNOFF',
        closedAt: Date.now(),
        resultSummary: {
          totalEligible: eligible,
          totalCast: castCount,
          aFavor: 0,
          enContra: 0,
          abstencion,
          opcionA,
          opcionB,
          opcionC,
          percentageA: Math.round(pctA * 10) / 10,
          percentageB: Math.round(pctB * 10) / 10,
          percentageC: Math.round(pctC * 10) / 10,
          quorumMet,
          isApproved: !!winner,
          winner,
          needsRunoff,
          runoffOptions
        }
      };
    } else if (m.motionKind === 'DISENSO_SEGUNDA_VUELTA') {
      const opt1 = m.runoffOptions ? m.runoffOptions[0] : 'A';
      const opt2 = m.runoffOptions ? m.runoffOptions[1] : 'B';
      const votes1 = opt1 === 'A' ? opcionA : opt1 === 'B' ? opcionB : opcionC;
      const votes2 = opt2 === 'A' ? opcionA : opt2 === 'B' ? opcionB : opcionC;
      const directVotesR2 = votes1 + votes2;
      const pctA = directVotesR2 > 0 ? (opcionA / directVotesR2) * 100 : 0;
      const pctB = directVotesR2 > 0 ? (opcionB / directVotesR2) * 100 : 0;
      const pctC = directVotesR2 > 0 ? (opcionC / directVotesR2) * 100 : 0;

      let winner: 'A' | 'B' | 'C' | undefined = undefined;
      if (votes1 > votes2) winner = opt1;
      else if (votes2 > votes1) winner = opt2;

      if (winner && m.dissensusId) {
        setSynthesisChapters(chPrev => chPrev.map(ch => ({
          ...ch,
          dissensusItems: (ch.dissensusItems || []).map(dis => dis.id === m.dissensusId ? {
            ...dis,
            status: 'RESUELTO',
            winner
          } : dis)
        })));
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      }

      updatedMotion = {
        ...m,
        status: winner ? 'APPROVED' : 'CLOSED',
        closedAt: Date.now(),
        resultSummary: {
          totalEligible: eligible,
          totalCast: castCount,
          aFavor: votes1,
          enContra: votes2,
          abstencion,
          opcionA,
          opcionB,
          opcionC,
          percentageA: Math.round(pctA * 10) / 10,
          percentageB: Math.round(pctB * 10) / 10,
          percentageC: Math.round(pctC * 10) / 10,
          quorumMet,
          isApproved: !!winner,
          winner
        }
      };
    } else {
      // MOCIONES GENERALES Y SOBRE PÁRRAFOS (A_FAVOR vs EN_CONTRA)
      const validVotes = aFavor + enContra;
      const percentageFavor = validVotes > 0 ? (aFavor / validVotes) * 100 : 0;

      let isApproved = false;
      if (quorumMet && validVotes > 0) {
        if (m.quorumType === 'TWO_THIRDS') {
          isApproved = (aFavor / validVotes) >= (2 / 3);
        } else {
          isApproved = aFavor > enContra;
        }
      }

      if (isApproved && m.targetParagraphId) {
        if (m.motionKind === 'MOCION_EXTENSIVA') {
          setSynthesisChapters(chPrev => chPrev.map(ch => ({
            ...ch,
            paragraphs: (ch.paragraphs || []).map(p => p.id === m.targetParagraphId ? {
              ...p,
              status: 'EXTENDIDO',
              extensionText: m.proposedExtensionText,
              modifiedText: m.proposedEditedText || m.proposedExtensionText,
              appliedMotionCode: m.code,
              appliedMotionId: m.id
            } : p)
          })));
        } else if (m.motionKind === 'MOCION_SUPRESIVA') {
          setSynthesisChapters(chPrev => chPrev.map(ch => ({
            ...ch,
            paragraphs: (ch.paragraphs || []).map(p => p.id === m.targetParagraphId ? {
              ...p,
              status: 'SUPRIMIDO',
              appliedMotionCode: m.code,
              appliedMotionId: m.id
            } : p)
          })));
        }
      }

      if (isApproved) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#4A154B', '#D32F2F', '#FFFFFF', '#00796B']
        });
      }

      updatedMotion = {
        ...m,
        status: isApproved ? 'APPROVED' : 'REJECTED',
        closedAt: Date.now(),
        resultSummary: {
          totalEligible: eligible,
          totalCast: castCount,
          aFavor,
          enContra,
          abstencion,
          percentageFavor: Math.round(percentageFavor * 10) / 10,
          quorumMet,
          isApproved,
          winner: isApproved ? 'A_FAVOR' : 'EN_CONTRA'
        }
      };
    }

    prevOpenVotingIdRef.current = null;
    setMotionsHistory(prev => prev.map(item => item.id === motionId ? updatedMotion : item));
    setActiveMotionId(motionId);
    addAuditLog('CIERRE_VOTACION', `Escrutinio público formal finalizado por ${currentUser?.name} para ${m.code}.`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, delegates, motionsHistory, addAuditLog, markLocalMutation]);

  const createNewMotion = useCallback((
    title: string, 
    description: string, 
    quorumType: 'SIMPLE_MAJORITY' | 'TWO_THIRDS' | 'ABSOLUTE_MAJORITY',
    immediateLaunch: boolean = true,
    durationSeconds: number = 300
  ): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', `${currentUser?.name || 'Usuario'} (Delegado/a) intentó crear una votación. Solo la Secretaría Técnica puede lanzar votaciones.`);
      return undefined;
    }
    if (immediateLaunch) {
      const activeM = motionsHistory.find(m => m.status === 'VOTING');
      if (activeM) {
        addAuditLog('ACCION_DENEGADA', `Imposible lanzar votación. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`);
        return undefined;
      }
    }
    const ordCount = motionsHistory.filter(m => m.motionKind === 'MOCION_ORDINARIA').length + 1;
    const code = `MOC-ORD-${String(ordCount).padStart(3, '0')}`;
    const newMotion: Motion = {
      id: `moc-${Date.now()}`,
      code,
      motionKind: 'MOCION_ORDINARIA',
      title,
      description,
      proposedBy: currentUser ? `${currentUser.name} (Secretaría Técnica)` : 'Secretaría Técnica',
      status: immediateLaunch ? 'VOTING' : 'OPEN',
      quorumType,
      createdAt: Date.now(),
      startedAt: immediateLaunch ? Date.now() : undefined,
      durationSeconds: durationSeconds || 300,
      votes: {}
    };

    setMotionsHistory(prev => [newMotion, ...prev]);
    if (immediateLaunch) {
      prevOpenVotingIdRef.current = newMotion.id;
      setActiveMotionId(newMotion.id);
    }
    addAuditLog('NUEVA_MOCION', `Nueva votación general lanzada por la Secretaría Técnica (${currentUser?.name}): ${code} - "${title}"`);
    markLocalMutation();
    return newMotion;
  }, [isSecretariaTecnica, currentUser, motionsHistory, addAuditLog, markLocalMutation]);

  // 1. MOCIÓN EXTENSIVA (50% + 1): Selecciona un párrafo de la Presíntesis y le propone una extensión
  // Privativo de Delegados: Se presenta a la Mesa y la Secretaría Técnica la aprueba y pone a votación
  const proposeExtensiveMotion = useCallback((
    chapterId: string, 
    paragraphId: string, 
    proposedExtension: string, 
    title?: string
  ): Motion | undefined => {
    if (!currentUser || currentUser.role !== 'DELEGATE') {
      addAuditLog('MOCION_RECHAZADA', 'La Secretaría Técnica no tiene permitido presentar mociones. Esta facultad es privativa de las delegadas y delegados regionales.');
      return undefined;
    }

    const chapter = synthesisChapters.find(ch => ch.id === chapterId);
    const paragraph = chapter?.paragraphs.find(p => p.id === paragraphId);
    if (!paragraph) return undefined;

    const count = motionsHistory.filter(m => m.motionKind === 'MOCION_EXTENSIVA').length + 1;
    const code = `MOC-EXT-${String(count).padStart(3, '0')}`;

    const newMotion: Motion = {
      id: `moc-ext-${Date.now()}`,
      code,
      motionKind: 'MOCION_EXTENSIVA',
      title: title || `Moción Extensiva: Ampliación Párrafo ${paragraph.number}`,
      description: `Propuesta para extender el párrafo ${paragraph.number} de la Presíntesis Nacional con texto complementario vinculante. Quórum reglamentario: Mayoría Simple (50% + 1).`,
      proposedBy: `${currentUser.name} (${currentUser.region})`,
      targetParagraphId: paragraphId,
      targetParagraphNumber: paragraph.number,
      originalParagraphText: paragraph.originalText,
      proposedExtensionText: proposedExtension,
      proposedEditedText: proposedExtension,
      status: 'DRAFT',
      quorumType: 'SIMPLE_MAJORITY',
      createdAt: Date.now(),
      durationSeconds: 300,
      votes: {}
    };

    const auditEntry = buildAuditEntry('MOCION_PRESENTADA', `${currentUser.name} (${currentUser.region}) presentó la moción extensiva ${code} sobre el párrafo § ${paragraph.number}. Queda ingresada para aprobación de la Secretaría Técnica.`);

    setMotionsHistory(prev => [newMotion, ...prev]);
    setAuditLogs(prev => [auditEntry, ...prev.slice(0, 199)]);

    // Persistencia atómica sin desplazar votación en curso en sala
    fetch('/api/motions/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motion: newMotion, auditEntry })
    }).catch(() => {});

    return newMotion;
  }, [synthesisChapters, motionsHistory, currentUser, addAuditLog, buildAuditEntry]);

  // 2. MOCIÓN SUPRESIVA (2/3): Selecciona un párrafo de la Presíntesis y propone su eliminación
  // Privativo de Delegados: Se presenta a la Mesa y la Secretaría Técnica la aprueba y pone a votación
  const proposeSuppressiveMotion = useCallback((
    chapterId: string, 
    paragraphId: string, 
    title?: string
  ): Motion | undefined => {
    if (!currentUser || currentUser.role !== 'DELEGATE') {
      addAuditLog('MOCION_RECHAZADA', 'La Secretaría Técnica no tiene permitido presentar mociones. Esta facultad es privativa de las delegadas y delegados regionales.');
      return undefined;
    }

    const chapter = synthesisChapters.find(ch => ch.id === chapterId);
    const paragraph = chapter?.paragraphs.find(p => p.id === paragraphId);
    if (!paragraph) return undefined;

    const count = motionsHistory.filter(m => m.motionKind === 'MOCION_SUPRESIVA').length + 1;
    const code = `MOC-SUP-${String(count).padStart(3, '0')}`;

    const newMotion: Motion = {
      id: `moc-sup-${Date.now()}`,
      code,
      motionKind: 'MOCION_SUPRESIVA',
      title: title || `Moción Supresiva: Eliminar Párrafo ${paragraph.number}`,
      description: `Propuesta reglamentaria para suprimir y eliminar en su totalidad el párrafo ${paragraph.number} de la Presíntesis Nacional. Quórum reglamentario calificado: Dos Tercios (2/3).`,
      proposedBy: `${currentUser.name} (${currentUser.region})`,
      targetParagraphId: paragraphId,
      targetParagraphNumber: paragraph.number,
      originalParagraphText: paragraph.originalText,
      status: 'DRAFT',
      quorumType: 'TWO_THIRDS',
      createdAt: Date.now(),
      durationSeconds: 300,
      votes: {}
    };

    const auditEntry = buildAuditEntry('MOCION_PRESENTADA', `${currentUser.name} (${currentUser.region}) presentó la moción supresiva ${code} sobre el párrafo § ${paragraph.number}. Queda ingresada para aprobación de la Secretaría Técnica.`);

    setMotionsHistory(prev => [newMotion, ...prev]);
    setAuditLogs(prev => [auditEntry, ...prev.slice(0, 199)]);

    fetch('/api/motions/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motion: newMotion, auditEntry })
    }).catch(() => {});

    return newMotion;
  }, [synthesisChapters, motionsHistory, currentUser, addAuditLog, buildAuditEntry]);

  // Descartar moción presentada (Secretaría Técnica)
  const discardPresentedMotion = useCallback((motionId: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede descartar mociones presentadas.');
      return;
    }
    setMotionsHistory(prev => prev.filter(m => m.id !== motionId));
    addAuditLog('MOCION_DESCARTADA', `La Secretaría Técnica (${currentUser?.name}) descartó la moción ${motionId}.`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  // 3. VOTACIÓN POR OPCIONES A / B / C (Deliberación Tripartita Personalizada)
  // Privativo de la Secretaría Técnica: Los delegados no lanzan votaciones
  const launchABCVote = useCallback((
    title: string,
    description: string,
    optionA: { label: string; text: string; region: string },
    optionB: { label: string; text: string; region: string },
    optionC: { label: string; text: string; region: string },
    durationSeconds: number = 300
  ): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Los delegados no tienen permitido lanzar votaciones. Solo la Secretaría Técnica puede lanzar votaciones.');
      return undefined;
    }

    const activeM = motionsHistory.find(m => m.status === 'VOTING');
    if (activeM) {
      addAuditLog('ACCION_DENEGADA', `Imposible lanzar votación A/B/C. Ya existe una votación abierta en sala (${activeM.code}). Por reglamento, solo puede haber una votación activa a la vez.`);
      return undefined;
    }

    const count = motionsHistory.filter(m => m.motionKind === 'DISENSO_PRIMERA_VUELTA').length + 1;
    const code = `VOT-ABC-${String(count).padStart(3, '0')}`;
    const newMotion: Motion = {
      id: `moc-abc-${Date.now()}`,
      code,
      motionKind: 'DISENSO_PRIMERA_VUELTA',
      title,
      description: description || `Votación entre 3 visiones reglamentarias: Opción A (${optionA.label}), Opción B (${optionB.label}) y Opción C (${optionC.label}). Quórum: Mayoría Absoluta (>50%). Si ninguna supera el 50%, pasan las dos primeras mayorías a balotaje de 2ª Vuelta.`,
      proposedBy: 'Secretaría Técnica FE-FA',
      dissensusOptions: {
        a: optionA,
        b: optionB,
        c: optionC
      },
      status: 'VOTING',
      quorumType: 'ABSOLUTE_MAJORITY',
      createdAt: Date.now(),
      startedAt: Date.now(),
      durationSeconds: durationSeconds || 300,
      votes: {}
    };

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionsHistory(prev => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    addAuditLog('VOTACION_ABC_INICIADA', `Votación A/B/C iniciada: "${title}" (${code}) por la Secretaría Técnica`);
    markLocalMutation();
    return newMotion;
  }, [isSecretariaTecnica, motionsHistory, addAuditLog, markLocalMutation]);

  // 4. VOTACIÓN DE DISENSOS DEL DOCUMENTO - PRIMERA VUELTA (A, B, C con Mayoría Absoluta > 50%)
  const launchDissensusRound1 = useCallback((dissensusId: string): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede lanzar votaciones de disensos.');
      return undefined;
    }

    const activeM = motionsHistory.find(m => m.status === 'VOTING');
    if (activeM) {
      addAuditLog('ACCION_DENEGADA', `Imposible abrir votación de disenso. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`);
      return undefined;
    }

    let targetDis: DissensusItem | undefined = undefined;
    for (const ch of synthesisChapters) {
      const found = (ch.dissensusItems || []).find(d => d.id === dissensusId);
      if (found) { targetDis = found; break; }
    }
    if (!targetDis) return undefined;

    const r1Count = motionsHistory.filter(m => m.motionKind === 'DISENSO_PRIMERA_VUELTA').length + 1;
    const code = `DIS-${String(r1Count).padStart(2, '0')}-R1`;
    const newMotion: Motion = {
      id: `moc-dis-r1-${Date.now()}`,
      code,
      motionKind: 'DISENSO_PRIMERA_VUELTA',
      title: `Disenso Primera Vuelta: ${targetDis.title}`,
      description: targetDis.context
        ? `${targetDis.context} — Votación entre 3 opciones: Opción A (${targetDis.optionA.label}), Opción B (${targetDis.optionB.label}) y Opción C (${targetDis.optionC.label}). Requiere Mayoría Absoluta (>50%).`
        : `Votación entre 3 opciones: Opción A (${targetDis.optionA.label}), Opción B (${targetDis.optionB.label}) y Opción C (${targetDis.optionC.label}). Requiere Mayoría Absoluta (>50%). Si ninguna opción supera el 50%, pasan las dos primeras mayorías a Segunda Vuelta.`,
      proposedBy: 'Secretaría Técnica (Articulación de Disensos)',
      dissensusId: targetDis.id,
      dissensusOptions: {
        a: targetDis.optionA,
        b: targetDis.optionB,
        c: targetDis.optionC
      },
      status: 'VOTING',
      quorumType: 'ABSOLUTE_MAJORITY',
      createdAt: Date.now(),
      startedAt: Date.now(),
      durationSeconds: 300,
      votes: {}
    };

    // Actualizar estado del disenso
    setSynthesisChapters(chPrev => chPrev.map(ch => ({
      ...ch,
      dissensusItems: (ch.dissensusItems || []).map(d => d.id === dissensusId ? {
        ...d,
        status: 'EN_VOTACION_R1'
      } : d)
    })));

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionsHistory(prev => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    addAuditLog('DISENSO_VOTACION_R1', `Iniciada Primera Vuelta de Disenso: ${targetDis.title}`);
    markLocalMutation();
    return newMotion;
  }, [isSecretariaTecnica, synthesisChapters, motionsHistory, addAuditLog, markLocalMutation]);

  // 4. VOTACIÓN DE DISENSOS - SEGUNDA VUELTA (50% + 1 entre las dos primeras mayorías)
  const passDissensusToRound2 = useCallback((
    dissensusId: string, 
    option1: 'A' | 'B' | 'C', 
    option2: 'A' | 'B' | 'C'
  ): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede lanzar la segunda vuelta.');
      return undefined;
    }

    const activeM = motionsHistory.find(m => m.status === 'VOTING');
    if (activeM) {
      addAuditLog('ACCION_DENEGADA', `Imposible lanzar 2ª vuelta. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`);
      return undefined;
    }

    let targetDis: DissensusItem | undefined = undefined;
    for (const ch of synthesisChapters) {
      const found = (ch.dissensusItems || []).find(d => d.id === dissensusId);
      if (found) { targetDis = found; break; }
    }
    if (!targetDis) return undefined;

    const r2Count = motionsHistory.filter(m => m.motionKind === 'DISENSO_SEGUNDA_VUELTA').length + 1;
    const code = `DIS-${String(r2Count).padStart(2, '0')}-R2`;
    const newMotion: Motion = {
      id: `moc-dis-r2-${Date.now()}`,
      code,
      motionKind: 'DISENSO_SEGUNDA_VUELTA',
      title: `Balotaje Disenso (${targetDis.title}): Opción ${option1} vs Opción ${option2}`,
      description: `Segunda Vuelta dirimente entre las dos primeras mayorías para definir el acuerdo definitivo. Quórum: Mayoría Simple (50% + 1).`,
      proposedBy: 'Secretaría Técnica (Segunda Vuelta Reglamentaria)',
      dissensusId: targetDis.id,
      runoffOptions: [option1, option2],
      dissensusOptions: {
        a: targetDis.optionA,
        b: targetDis.optionB,
        c: targetDis.optionC
      },
      status: 'VOTING',
      quorumType: 'SIMPLE_MAJORITY',
      createdAt: Date.now(),
      startedAt: Date.now(),
      durationSeconds: 300,
      votes: {}
    };

    setSynthesisChapters(chPrev => chPrev.map(ch => ({
      ...ch,
      dissensusItems: (ch.dissensusItems || []).map(d => d.id === dissensusId ? {
        ...d,
        status: 'EN_VOTACION_R2',
        round2Runoff: [option1, option2]
      } : d)
    })));

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionsHistory(prev => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    addAuditLog('DISENSO_SEGUNDA_VUELTA', `Iniciada Segunda Vuelta entre Opción ${option1} y Opción ${option2}`);
    markLocalMutation();
    return newMotion;
  }, [isSecretariaTecnica, synthesisChapters, motionsHistory, addAuditLog, markLocalMutation]);

  // 5. VOTACIÓN GENERAL DE LA PRESÍNTESIS (50% + 1)
  // Regla: Se vota UNA SOLA VEZ al empezar la discusión en general, no por párrafos
  const launchGeneralPresynthesisVote = useCallback((): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede someter la Presíntesis en General a votación.');
      return undefined;
    }

    const activeM = motionsHistory.find(m => m.status === 'VOTING');
    if (activeM) {
      addAuditLog('ACCION_DENEGADA', `Imposible abrir votación general. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`);
      return undefined;
    }

    const code = 'VOT-GRAL-PRESINTESIS';
    const newMotion: Motion = {
      id: `moc-presintesis-${Date.now()}`,
      code,
      motionKind: 'GENERAL_PRESINTESIS',
      title: 'Votación General de la Presíntesis Regional',
      description: 'Aprobación en general del marco deliberativo y acuerdos emanados de las asambleas regionales del Frente Estudiantil. Se vota una sola vez al comenzar el debate. Quórum: Mayoría Simple (50% + 1).',
      proposedBy: 'Secretaría Técnica FE-FA',
      status: 'VOTING',
      quorumType: 'SIMPLE_MAJORITY',
      createdAt: Date.now(),
      startedAt: Date.now(),
      durationSeconds: 300,
      votes: {}
    };

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionsHistory(prev => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    addAuditLog('VOTACION_GENERAL_PRESINTESIS', 'Iniciada Votación General Única de la Presíntesis Regional (50%+1) por Secretaría Técnica');
    markLocalMutation();
    return newMotion;
  }, [isSecretariaTecnica, motionsHistory, addAuditLog, markLocalMutation]);

  // 6. VOTACIÓN GENERAL DE LA SÍNTESIS FINAL (50% + 1)
  const launchFinalSynthesisVote = useCallback((): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede someter la Síntesis Final a votación general.');
      return undefined;
    }

    const activeM = motionsHistory.find(m => m.status === 'VOTING');
    if (activeM) {
      addAuditLog('ACCION_DENEGADA', `Imposible abrir votación de Síntesis Final. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`);
      return undefined;
    }

    const code = 'VOT-FINAL-SINTESIS';
    const newMotion: Motion = {
      id: `moc-sintesis-final-${Date.now()}`,
      code,
      motionKind: 'GENERAL_SINTESIS_FINAL',
      title: 'Votación General de la Síntesis Final del Plenario',
      description: 'Aprobación solemne del texto definitivo consolidado con todas las mociones y disensos resueltos. Quórum: Mayoría Simple (50% + 1).',
      proposedBy: 'Secretaría Técnica FE-FA',
      status: 'VOTING',
      quorumType: 'SIMPLE_MAJORITY',
      createdAt: Date.now(),
      startedAt: Date.now(),
      durationSeconds: 300,
      votes: {}
    };

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionsHistory(prev => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    addAuditLog('VOTACION_GENERAL_SINTESIS_FINAL', 'Iniciada Votación General Solemne de la Síntesis Final (50%+1)');
    markLocalMutation();
    return newMotion;
  }, [isSecretariaTecnica, motionsHistory, addAuditLog, markLocalMutation]);

  // Presíntesis Builder Functions (Secretaría Técnica)
  const addChapter = useCallback((number: number, title: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede crear nuevos capítulos en la Presíntesis.');
      return;
    }
    const newChapter: SynthesisChapter = {
      id: `cap-${Date.now()}`,
      number,
      title: title.trim(),
      paragraphs: [],
      dissensusItems: [],
      lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
      lastModifiedAt: Date.now()
    };
    setSynthesisChapters(prev => [...prev, newChapter]);
    addAuditLog('CREACION_CAPITULO', `Secretaría Técnica agregó el Capítulo ${number}: "${title}"`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  const updateChapter = useCallback((chapterId: string, number: number, title: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede editar capítulos en la Presíntesis.');
      return;
    }
    setSynthesisChapters(prev => prev.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          number,
          title: title.trim(),
          lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
          lastModifiedAt: Date.now()
        };
      }
      return ch;
    }));
    addAuditLog('EDICION_CAPITULO', `Secretaría Técnica actualizó el Capítulo ${number}: "${title.trim()}"`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  const deleteChapter = useCallback((chapterId: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede eliminar capítulos de la Presíntesis.');
      return;
    }
    const target = synthesisChapters.find(ch => ch.id === chapterId);
    setSynthesisChapters(prev => prev.filter(ch => ch.id !== chapterId));
    addAuditLog(
      'ELIMINACION_CAPITULO',
      target
        ? `Secretaría Técnica eliminó el Capítulo ${target.number}: "${target.title}"`
        : `Secretaría Técnica eliminó el capítulo ${chapterId}`
    );
    markLocalMutation();
  }, [isSecretariaTecnica, synthesisChapters, addAuditLog, markLocalMutation]);

  const addParagraphToChapter = useCallback((chapterId: string, number: string, text: string, title?: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede agregar párrafos a la Presíntesis.');
      return;
    }
    const newPara: PresynthesisParagraph = {
      id: `par-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      chapterId,
      number: number.trim(),
      title: title?.trim() || undefined,
      originalText: text.trim(),
      status: 'ACTIVO'
    };
    setSynthesisChapters(prev => {
      if (prev.length === 0) {
        const autoCapId = `cap-${Date.now()}`;
        return [{
          id: autoCapId,
          number: 1,
          title: 'Acuerdos Base del Plenario',
          paragraphs: [{ ...newPara, chapterId: autoCapId }],
          dissensusItems: [],
          lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
          lastModifiedAt: Date.now()
        }];
      }
      const targetExists = prev.some(ch => ch.id === chapterId);
      const targetId = targetExists ? chapterId : prev[0].id;
      return prev.map(ch => {
        if (ch.id === targetId) {
          return {
            ...ch,
            paragraphs: [...(ch.paragraphs || []), { ...newPara, chapterId: targetId }],
            lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
            lastModifiedAt: Date.now()
          };
        }
        return ch;
      });
    });
    addAuditLog('ALTA_PARRAFO_PRESINTESIS', `Secretaría Técnica agregó el párrafo § ${number} al capítulo ${chapterId}`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  const updateParagraphInChapter = useCallback((chapterId: string, paragraphId: string, text: string, title?: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede editar párrafos de la Presíntesis.');
      return;
    }
    setSynthesisChapters(prev => prev.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          paragraphs: (ch.paragraphs || []).map(p => p.id === paragraphId ? {
            ...p,
            originalText: text.trim(),
            title: title !== undefined ? title.trim() : p.title
          } : p),
          lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
          lastModifiedAt: Date.now()
        };
      }
      return ch;
    }));
    addAuditLog('EDICION_PARRAFO_PRESINTESIS', `Secretaría Técnica editó el párrafo ${paragraphId}`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  const deleteParagraphFromChapter = useCallback((chapterId: string, paragraphId: string) => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede eliminar párrafos de la Presíntesis.');
      return;
    }
    setSynthesisChapters(prev => prev.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          paragraphs: (ch.paragraphs || []).filter(p => p.id !== paragraphId),
          lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
          lastModifiedAt: Date.now()
        };
      }
      return ch;
    }));
    addAuditLog('ELIMINACION_PARRAFO_PRESINTESIS', `Secretaría Técnica eliminó el párrafo ${paragraphId}`);
    markLocalMutation();
  }, [isSecretariaTecnica, currentUser, addAuditLog, markLocalMutation]);

  // Edición puntual de párrafos
  const updateParagraphText = useCallback((chapterId: string, paragraphId: string, newText: string) => {
    updateParagraphInChapter(chapterId, paragraphId, newText);
  }, [updateParagraphInChapter]);

  // Gestión de Disensos Tripartitos (A, B, C) con auto-creación de capítulo si está vacío
  const addDissensusItem = useCallback((
    chapterId: string, 
    dissensus: Omit<DissensusItem, 'id' | 'status'>
  ): DissensusItem => {
    const newId = `dis-${Date.now()}`;
    let resolvedChapterId = chapterId;

    setSynthesisChapters(prev => {
      if (prev.length === 0) {
        const autoCapId = `cap-${Date.now()}`;
        resolvedChapterId = autoCapId;
        const autoChapter: SynthesisChapter = {
          id: autoCapId,
          number: 1,
          title: 'Acuerdos y Disensos del Plenario',
          paragraphs: [],
          dissensusItems: [{
            ...dissensus,
            chapterId: autoCapId,
            id: newId,
            status: 'PENDIENTE'
          }],
          lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
          lastModifiedAt: Date.now()
        };
        return [autoChapter];
      }

      const targetExists = prev.some(ch => ch.id === chapterId);
      const targetId = targetExists ? chapterId : prev[0].id;
      resolvedChapterId = targetId;

      return prev.map(ch => {
        if (ch.id === targetId) {
          return {
            ...ch,
            dissensusItems: [
              ...(ch.dissensusItems || []),
              {
                ...dissensus,
                chapterId: targetId,
                id: newId,
                status: 'PENDIENTE'
              }
            ],
            lastModifiedAt: Date.now()
          };
        }
        return ch;
      });
    });

    addAuditLog('NUEVO_DISENSO', `Secretaría Técnica registró el disenso "${dissensus.title}" para deliberación tripartita (A, B y C).`);
    markLocalMutation();
    return {
      ...dissensus,
      chapterId: resolvedChapterId,
      id: newId,
      status: 'PENDIENTE'
    };
  }, [currentUser, addAuditLog, markLocalMutation]);

  const updateDissensusItem = useCallback((
    dissensusId: string, 
    updates: Partial<DissensusItem>
  ) => {
    setSynthesisChapters(prev => prev.map(ch => ({
      ...ch,
      dissensusItems: (ch.dissensusItems || []).map(d => d.id === dissensusId ? { ...d, ...updates } : d),
      lastModifiedAt: Date.now()
    })));
    addAuditLog('EDICION_DISENSO', `Secretaría Técnica actualizó el disenso ${dissensusId}.`);
    markLocalMutation();
  }, [addAuditLog, markLocalMutation]);

  const deleteDissensusItem = useCallback((dissensusId: string) => {
    setSynthesisChapters(prev => prev.map(ch => ({
      ...ch,
      dissensusItems: (ch.dissensusItems || []).filter(d => d.id !== dissensusId),
      lastModifiedAt: Date.now()
    })));
    addAuditLog('ELIMINACION_DISENSO', `Secretaría Técnica eliminó el disenso ${dissensusId}.`);
    markLocalMutation();
  }, [addAuditLog, markLocalMutation]);

  // Exportación oficial en PDF de la Síntesis Nacional Final
  const exportFinalSynthesisPDF = useCallback(() => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - (margin * 2);
    let y = 18;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        doc.addPage();
        y = 18;
        drawPageHeader();
      }
    };

    const drawPageHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('PLENARIO NACIONAL FRENTE ESTUDIANTIL · DOCUMENTO OFICIAL VINCULANTE', margin, 12);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 14, pageWidth - margin, 14);
    };

    const drawPageFooter = (pageNum: number, totalPages: number) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Fe Pública y Custodia: Secretaría Técnica Nacional FE-FA', margin, pageHeight - 9);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    };

    // 1. Cover / Top Institutional Header
    doc.setFillColor(74, 21, 75); // #4A154B Morado Cardenal
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('SÍNTESIS NACIONAL FINAL CONSOLIDADA', margin + 6, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(243, 232, 255);
    doc.text('Plenario Nacional Frente Estudiantil · Frente Amplio Chile', margin + 6, y + 16);
    doc.setFontSize(8);
    doc.setTextColor(216, 180, 254);
    doc.text('Resoluciones Soberanas, Mociones Reglamentarias y Articulado Promulgado', margin + 6, y + 21);

    y += 32;

    // 2. Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    const dateStr = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fecha de Emisión Oficial: ${dateStr} a las ${timeStr} hrs`, margin + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Fe Pública: Secretaría Técnica Nacional (Mesa Directiva del Plenario)', margin + 4, y + 13);
    doc.text(`Acreditación: ${delegates.length} delegadas/os regionales con derecho a voz y voto`, margin + 4, y + 19);

    y += 30;

    // 3. Preámbulo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(74, 21, 75);
    doc.text('PREÁMBULO POLÍTICO Y METODOLOGÍA SOBERANA', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const preambulo = 'El presente documento consolida la voluntad democrática y vinculante del Plenario Nacional del Frente Estudiantil. Reúne los acuerdos aprobados en la Presíntesis Regional, las ampliaciones promulgadas mediante mociones extensivas (50%+1), la exclusión de párrafos derogados mediante mociones supresivas (2/3) y los acuerdos emanados del sufragio en disensos de opciones A, B y C.';
    const preambuloLines = doc.splitTextToSize(preambulo, contentWidth);
    doc.text(preambuloLines, margin, y);
    y += (preambuloLines.length * 4.2) + 6;

    // 4. Capítulos
    synthesisChapters.forEach((chapter) => {
      checkPageBreak(30);

      // Chapter Header Bar
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(74, 21, 75);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(74, 21, 75);
      doc.text(`CAPÍTULO ${chapter.number}: ${chapter.title.toUpperCase()}`, margin + 4, y + 6);
      y += 14;

      const activeParagraphs = (chapter.paragraphs || []).filter(p => p.status !== 'SUPRIMIDO');
      const suppressedParagraphs = (chapter.paragraphs || []).filter(p => p.status === 'SUPRIMIDO');
      const resolvedDissensus = (chapter.dissensusItems || []).filter(d => d.status === 'RESUELTO');

      // Paragraphs
      if (activeParagraphs.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text('(Sin párrafos activos en este capítulo)', margin + 4, y);
        y += 6;
      } else {
        activeParagraphs.forEach((p) => {
          const paraHeader = `§ ${p.number}${p.title ? ` — ${p.title}` : ''}`;
          const isExtended = p.status === 'EXTENDIDO' && !!p.extensionText;
          
          const textLines = doc.splitTextToSize(`"${p.originalText}"`, contentWidth - 6);
          let extraHeight = textLines.length * 4 + 8;
          if (isExtended) {
            extraHeight += 16;
          }
          checkPageBreak(extraHeight);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(paraHeader, margin, y);
          y += 4.5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(textLines, margin + 4, y);
          y += (textLines.length * 4) + 2;

          if (isExtended) {
            doc.setFillColor(250, 245, 255);
            doc.setDrawColor(192, 132, 252);
            doc.setLineWidth(0.4);
            const extLines = doc.splitTextToSize(`+ Redacción Extensiva Aprobada (${p.appliedMotionCode || '50%+1'}): "${p.extensionText}"`, contentWidth - 10);
            const boxH = (extLines.length * 3.8) + 5;
            doc.roundedRect(margin + 4, y, contentWidth - 4, boxH, 1.5, 1.5, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(74, 21, 75);
            doc.text(extLines, margin + 7, y + 4);
            y += boxH + 3;
          }
          y += 2;
        });
      }

      // Suppressed Paragraphs
      if (suppressedParagraphs.length > 0) {
        checkPageBreak(15 + (suppressedParagraphs.length * 5));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(185, 28, 28);
        doc.text('PÁRRAFOS SUPRIMIDOS POR EL PLENARIO (Quórum 2/3):', margin, y);
        y += 4.5;

        suppressedParagraphs.forEach((p) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(153, 27, 27);
          doc.text(`• [✕] Párrafo § ${p.number} — Suprimido por 2/3 de votos en sala (${p.appliedMotionCode || 'Moción Supresiva'}).`, margin + 4, y);
          y += 4;
        });
        y += 3;
      }

      // Resolved Dissensus
      if (resolvedDissensus.length > 0) {
        checkPageBreak(15 + (resolvedDissensus.length * 10));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(5, 150, 105);
        doc.text('RESOLUCIONES DE DISENSOS (Opciones A/B/C):', margin, y);
        y += 4.5;

        resolvedDissensus.forEach((dis) => {
          const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(4, 120, 87);
          doc.text(`• ${dis.title} -> Aprobada Opción ${dis.winner} (${winObj?.label || 'Visión Ganadora'})`, margin + 4, y);
          y += 3.8;
          if (winObj?.text) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            const winLines = doc.splitTextToSize(`"${winObj.text}"`, contentWidth - 10);
            doc.text(winLines, margin + 8, y);
            y += (winLines.length * 3.8) + 2;
          }
        });
        y += 3;
      }

      y += 5;
    });

    // Final signature block
    checkPageBreak(35);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(74, 21, 75);
    doc.text('CERTIFICACIÓN Y FE PÚBLICA OFICIAL', margin, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Documento formalizado y ratificado por la Secretaría Técnica del Plenario Nacional del Frente Estudiantil.', margin, y);
    doc.text('Frente Amplio Chile · Santiago de Chile, 2026.', margin, y + 4);

    // Number all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPageFooter(i, totalPages);
    }

    doc.save(`Sintesis_Nacional_Final_FE-FA_${new Date().toISOString().slice(0, 10)}.pdf`);
    addAuditLog('EXPORTACION_PDF_SINTESIS', `Documento oficial de Síntesis Nacional Final exportado en PDF por ${currentUser?.name || 'Secretaría Técnica'}`);
  }, [synthesisChapters, delegates.length, currentUser, addAuditLog]);

  // Descarga oficial del Documento de Síntesis Nacional Final (Exporta PDF de forma ordenada y limpia)
  const downloadFinalSynthesisDocument = useCallback(() => {
    exportFinalSynthesisPDF();
  }, [exportFinalSynthesisPDF]);
  // Order motions
  const sendOrderMotion = useCallback((category: OrderMotionCategory, message: string) => {
    if (!currentUser) return;
    const newOrder: OrderMotion = {
      id: `om-${Date.now()}`,
      delegateId: currentUser.id,
      delegateName: `${currentUser.name} (${currentUser.region})`,
      region: currentUser.region,
      category,
      message,
      timestamp: Date.now(),
      status: 'PENDIENTE'
    };
    setOrderMotions(prev => [newOrder, ...prev]);
    addAuditLog('MOCION_ORDEN', `${currentUser.name} envió [${category}]: ${message.substring(0, 50)}...`);
  }, [currentUser, addAuditLog]);

  const resolveOrderMotion = useCallback((id: string, newStatus: 'ATENDIDA' | 'DESESTIMADA') => {
    setOrderMotions(prev => prev.map(om => {
      if (om.id === id) {
        return {
          ...om,
          status: newStatus,
          resolvedBy: currentUser?.name || 'Mesa Directiva'
        };
      }
      return om;
    }));
    addAuditLog('RESOLUCION_MOCION_ORDEN', `Mesa Directiva declaró ${newStatus} la moción de orden ${id}`);
  }, [currentUser, addAuditLog]);

  // CSV Ingestion for Padron
  const importDelegatesCSV = useCallback((csvText: string) => {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return { success: false, count: 0, error: 'El archivo está vacío o no contiene filas' };

      const parsed: Delegate[] = [];
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 4) {
          const [name, email, region, genderStr, roleStr] = parts;
          parsed.push({
            id: `del-csv-${Date.now()}-${i}`,
            name: name || `Delegado/a ${i}`,
            email: email || `delegado${i}@fe-fa.cl`,
            region: (region as ChileanRegion) || 'Metropolitana',
            role: (roleStr as UserRole) === 'SECRETARY' ? 'SECRETARY' : 'DELEGATE',
            gender: (genderStr as any) || 'Femenino',
            isOnline: true,
            hasSpokenInCurrentMotion: false,
            ipAddress: `190.161.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          });
        }
      }

      if (parsed.length > 0) {
        setDelegates(prev => [...prev, ...parsed]);
        addAuditLog('CARGA_MASIVA_CSV', `Carga exitosa de ${parsed.length} delegadas/os al padrón oficial`);
        markLocalMutation();
        return { success: true, count: parsed.length };
      }
      return { success: false, count: 0, error: 'Formato CSV no reconocido. Columnas requeridas: Nombre, Correo, Región, Género, Rol' };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Error procesando archivo CSV' };
    }
  }, [addAuditLog, markLocalMutation]);

  const exportPadronCSV = useCallback(() => {
    const headers = ['ID,Nombre,Correo,Región,Género,Rol,Estado'];
    const rows = delegates.map(d => 
      `"${d.id}","${d.name}","${d.email}","${d.region}","${d.gender}","${d.role}","${d.isOnline ? 'Online' : 'Offline'}"`
    );
    const content = [headers, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Padron_Oficial_FE-FA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addAuditLog('EXPORTACION_PADRON_CSV', `Exportación de padrón con ${delegates.length} registros`);
  }, [delegates, addAuditLog]);

  const exportActaCSV = useCallback(() => {
    const headers = ['Moción,Delegado,Región,Voto,Timestamp,FirmaDigitalHash'];
    const rows: string[] = [];
    motionsHistory.forEach(m => {
      Object.values(m.votes).forEach(v => {
        rows.push(`"${m.code} - ${m.title.replace(/"/g, '""')}","${v.delegateName}","${v.region}","${v.vote}","${new Date(v.timestamp).toISOString()}","${v.digitalSignatureHash}"`);
      });
    });
    const content = [headers, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Acta_Votaciones_FE-FA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addAuditLog('EXPORTACION_ACTA_CSV', `Exportación de acta de votaciones nominales`);
  }, [motionsHistory, addAuditLog]);

  const resetAllData = useCallback(() => {
    localStorage.clear();
    lastSeenVersionRef.current = 0;
    prevOpenVotingIdRef.current = null;
    setDelegates(INITIAL_DELEGATES);
    setCurrentUser(INITIAL_DELEGATES[0]);
    setMotionsHistory(INITIAL_MOTIONS);
    setSynthesisChapters(INITIAL_SYNTHESIS_CHAPTERS);
    setOrderMotions(INITIAL_ORDER_MOTIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setActiveMotionId('');
    addAuditLog('REINICIO_SISTEMA', `Restablecimiento de fábrica del entorno deliberativo`);
    markLocalMutation();
  }, [addAuditLog, markLocalMutation]);

  return (
    <PlenarioContext.Provider value={{
      currentUser,
      setCurrentUser,
      delegates,
      activeTab,
      setActiveTab,
      activeMotion,
      activeMotionId,
      setActiveMotionId,
      motionsHistory,
      hasActiveVoting,
      activeVotingMotion,
      isAnyVotingOpen: hasActiveVoting,
      activeOpenVotingMotion: activeVotingMotion,
      speakerQueue,
      activeSpeaker,
      timerSeconds,
      timerTotal,
      isTimerRunning,
      lowBandwidthMode,
      setLowBandwidthMode,
      forceMuted,
      setForceMuted,
      synthesisChapters,
      orderMotions,
      auditLogs,
      actas,
      activeActaId,
      setActiveActaId,
      createActa,
      updateActa,
      deleteActa,
      certifyActa,
      isSecretariaTecnica,
      isDelegate,
      canVote,
      showLoginModal,
      setShowLoginModal,
      loginWithEmail,
      logout,
      castVote,
      openVotingForMotion,
      closeVotingForMotion,
      discardPresentedMotion,
      createNewMotion,
      proposeExtensiveMotion,
      proposeSuppressiveMotion,
      launchABCVote,
      launchDissensusRound1,
      passDissensusToRound2,
      addDissensusItem,
      updateDissensusItem,
      deleteDissensusItem,
      launchGeneralPresynthesisVote,
      launchFinalSynthesisVote,
      deleteDelegate,
      updateDelegate,
      addDelegate,
      addChapter,
      updateChapter,
      deleteChapter,
      addParagraphToChapter,
      updateParagraphInChapter,
      deleteParagraphFromChapter,
      updateParagraphText,
      downloadFinalSynthesisDocument,
      exportFinalSynthesisPDF,
      importDelegatesCSV,
      exportPadronCSV,
      exportActaCSV,
      addAuditLog,
      resetAllData,
      storageStatus,
      saveToInternalStorage,
      uploadFileToInternalStorage,
      listInternalFiles,
      loadDemoTemplate,
      resetToCleanLaunch
    }}>
      {children}
    </PlenarioContext.Provider>
  );
};

export const usePlenario = () => {
  const context = useContext(PlenarioContext);
  if (!context) throw new Error('usePlenario must be used within a PlenarioProvider');
  return context;
};
