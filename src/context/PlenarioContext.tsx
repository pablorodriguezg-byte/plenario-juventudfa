import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  FieldValue
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Delegate,
  Motion,
  MotionVote,
  SynthesisChapter,
  OrderMotion,
  AuditLogEntry,
  VoteOption,
  SpeakerQueueItem,
  UserRole,
  ChileanRegion,
  Acta,
  DissensusItem,
  PresynthesisParagraph
} from '../types/plenario';
import {
  INITIAL_DELEGATES,
  INITIAL_AUDIT_LOGS,
  DEMO_TEMPLATE
} from '../data/initialData';

interface AuthLoginResult {
  success: boolean;
  error?: string;
}

interface PlenarioContextType {
  currentUser: Delegate | null;
  setCurrentUser: (delegate: Delegate | null) => void;
  authReady: boolean;
  delegates: Delegate[];
  activeTab: 'inicio' | 'plenario' | 'texto-final' | 'actas' | 'padron' | 'mesa-votaciones';
  setActiveTab: (tab: 'inicio' | 'plenario' | 'texto-final' | 'actas' | 'padron' | 'mesa-votaciones') => void;
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
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  synthesisChapters: SynthesisChapter[];
  globalMotionsEnabled: boolean;
  isChapterMotionsEnabled: (chapterId?: string) => boolean;
  toggleGlobalMotionsEnabled: (enabled: boolean) => void;
  toggleChapterMotionsEnabled: (chapterId: string, enabled: boolean) => void;
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
  checkUsernameAccess: (username: string) => Promise<{
    success: boolean;
    exists: boolean;
    hasAccessKey: boolean;
    displayName?: string;
    role?: UserRole;
    error?: string;
  }>;
  loginWithCredentials: (
    username: string,
    accessKey: string
  ) => Promise<AuthLoginResult & { requiresSetup?: boolean }>;
  setupFirstTimeAccessKey: (username: string, newAccessKey: string) => Promise<AuthLoginResult>;
  logout: () => Promise<void>;
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
  deleteDelegate: (delegateId: string) => Promise<AuthLoginResult>;
  updateDelegate: (delegateId: string, updates: Partial<Delegate>) => Promise<AuthLoginResult>;
  addDelegate: (newDel: Omit<Delegate, 'id' | 'isOnline' | 'hasSpokenInCurrentMotion'>) => Promise<AuthLoginResult>;

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
  importDelegatesCSV: (csvText: string) => Promise<{ success: boolean; count: number; error?: string }>;
  exportPadronCSV: () => void;
  exportActaCSV: () => void;
  addAuditLog: (action: string, details: string) => void;
  resetAllData: () => void;

  // Persistencia en la nube (Firebase Firestore en vivo)
  storageStatus: { connected: boolean; storagePath: string; lastSaved?: number };
  saveToInternalStorage: () => Promise<boolean>;
  uploadFileToInternalStorage: (filename: string, content: string, type?: string, category?: string) => Promise<{ success: boolean; file?: any; error?: string }>;
  listInternalFiles: () => Promise<Array<{ id: string; name: string; sizeBytes: number; createdAt: number }>>;
  loadDemoTemplate: () => void;
  resetToCleanLaunch: () => void;
}

const PlenarioContext = createContext<PlenarioContextType | undefined>(undefined);

const USERNAME_STORAGE_KEY = 'fe_fa_current_username';
const USER_CACHE_STORAGE_KEY = 'fe_fa_current_user_cache';
const KEY_HASH_STORAGE_KEY = 'fe_fa_current_key_hash';
const THEME_STORAGE_KEY = 'fe_fa_theme';

const hashAccessKey = (rawKey: string): string => {
  const input = (rawKey || '').trim();
  if (!input) return '';
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + ((i + 1) * 31);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `hk_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
};

const sanitizeUserForCache = (user: Delegate): Delegate => {
  const { accessKey: _omitted, ...safeUser } = user;
  return safeUser;
};

const readCachedUser = (): Delegate | null => {
  try {
    const savedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
    const savedKeyHash = localStorage.getItem(KEY_HASH_STORAGE_KEY);
    if (!savedUsername || !savedKeyHash) return null;
    const raw = localStorage.getItem(USER_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Delegate;
    if (parsed && parsed.username && parsed.id) {
      return sanitizeUserForCache(parsed);
    }
    return null;
  } catch {
    return null;
  }
};

const normalizeUsername = (raw?: string | null): string => {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._\-]/g, '');
};

const isValidUsername = (username?: string | null): boolean => {
  const clean = normalizeUsername(username);
  return clean.length >= 2 && clean.length <= 64 && /^[a-z0-9._\-]+$/.test(clean);
};

const stripUndefinedDeep = <T,>(value: T): T => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof FieldValue) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      out[k] = stripUndefinedDeep(v);
    }
  }
  return out as T;
};

const toPublicRosterEntry = (d: Delegate) =>
  stripUndefinedDeep({
    id: d.id,
    name: d.name,
    username: d.username,
    region: d.region,
    role: d.role,
    organization: d.organization,
    avatarUrl: d.avatarUrl,
    isOnline: Boolean(d.isOnline),
    hasSpokenInCurrentMotion: Boolean(d.hasSpokenInCurrentMotion)
  });

const playTone = (frequency: number, type: OscillatorType, duration: number) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    // Audio might be constrained before user interaction
  }
};

export const PlenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialCachedUser = useMemo(() => readCachedUser(), []);
  const hasSavedUsername = useMemo(() => {
    try {
      const u = localStorage.getItem(USERNAME_STORAGE_KEY);
      const h = localStorage.getItem(KEY_HASH_STORAGE_KEY);
      return Boolean(u && isValidUsername(u) && h);
    } catch {
      return false;
    }
  }, []);

  const [authReady, setAuthReady] = useState<boolean>(true);
  const [rosterDelegates, setRosterDelegates] = useState<Delegate[]>([]);
  const [adminDelegates, setAdminDelegates] = useState<Delegate[]>([]);
  const [currentUser, setCurrentUser] = useState<Delegate | null>(initialCachedUser);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'inicio' | 'plenario' | 'texto-final' | 'actas' | 'padron' | 'mesa-votaciones'>(
    initialCachedUser || hasSavedUsername ? 'plenario' : 'inicio'
  );

  const [motionDocs, setMotionDocs] = useState<Motion[]>([]);
  const [voteDocs, setVoteDocs] = useState<Array<MotionVote & { motionId: string }>>([]);
  const [activeMotionId, setActiveMotionId] = useState<string>('');

  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(false);
  const [forceMuted, setForceMuted] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme: 'light' | 'dark') => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [speakerQueue, setSpeakerQueue] = useState<SpeakerQueueItem[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerQueueItem | null>(null);
  const [timerTotal, setTimerTotal] = useState<number>(120);
  const [timerSeconds, setTimerSeconds] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [synthesisChapters, setSynthesisChapters] = useState<SynthesisChapter[]>([]);
  const [globalMotionsEnabled, setGlobalMotionsEnabled] = useState<boolean>(true);
  const [orderMotions, setOrderMotions] = useState<OrderMotion[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [actas, setActas] = useState<Acta[]>([]);
  const [activeActaId, setActiveActaId] = useState<string>('');

  const [storageStatus, setStorageStatus] = useState<{ connected: boolean; storagePath: string; lastSaved?: number }>({
    connected: false,
    storagePath: 'Firebase Firestore (Nube en Vivo)',
    lastSaved: undefined
  });

  const prevOpenVotingIdRef = useRef<string | null>(null);

  const delegates: Delegate[] = useMemo(() => {
    if (currentUser?.role === 'SECRETARY' && adminDelegates.length > 0) {
      return adminDelegates;
    }
    if (rosterDelegates.length > 0) {
      return rosterDelegates;
    }
    return currentUser ? [currentUser] : [];
  }, [currentUser, adminDelegates, rosterDelegates]);

  const motionsHistory: Motion[] = useMemo(() => {
    const votesByMotion = new Map<string, Record<string, MotionVote>>();
    for (const v of voteDocs) {
      const existingMap = votesByMotion.get(v.motionId) || {};
      existingMap[v.delegateId] = {
        delegateId: v.delegateId,
        delegateName: v.delegateName,
        region: v.region,
        vote: v.vote,
        timestamp: v.timestamp,
        digitalSignatureHash: v.digitalSignatureHash,
        notes: v.notes
      };
      votesByMotion.set(v.motionId, existingMap);
    }
    return [...motionDocs]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((m) => ({
        ...m,
        votes: votesByMotion.get(m.id) || {}
      }));
  }, [motionDocs, voteDocs]);

  // Auto-focus active open VOTING motion across all devices
  useEffect(() => {
    const openVoting = motionsHistory.find((m) => m.status === 'VOTING');
    if (openVoting) {
      if (openVoting.id !== prevOpenVotingIdRef.current) {
        prevOpenVotingIdRef.current = openVoting.id;
        setActiveMotionId(openVoting.id);
      }
    } else {
      prevOpenVotingIdRef.current = null;
      setActiveMotionId((prevId) => {
        const stillValid = motionsHistory.find((m) => m.id === prevId && m.status !== 'DRAFT');
        if (stillValid) return prevId;
        const nonDraft = motionsHistory.filter((m) => m.status !== 'DRAFT');
        if (nonDraft.length === 0) return '';
        const sorted = [...nonDraft].sort((a, b) => {
          const tA = a.closedAt || a.startedAt || a.createdAt || 0;
          const tB = b.closedAt || b.startedAt || b.createdAt || 0;
          return tB - tA;
        });
        return sorted[0]?.id || '';
      });
    }
  }, [motionsHistory]);

  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);

  // Bootstrap initial Secretary accounts and room documents if Firestore is fresh (parallel & memoized)
  const ensureBootstrappedRoom = useCallback(async () => {
    if (bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current;
    }

    const run = async () => {
      const roomDefs: Array<{ id: 'synthesis' | 'roster' | 'actas' | 'order_motions'; payload: Record<string, unknown> }> = [
        {
          id: 'synthesis',
          payload: {
            kind: 'synthesis',
            chapters: [],
            motionsEnabledGlobal: true,
            updatedByUid: 'sec-pablo',
            updatedByUsernameLower: 'pablo.rodriguez',
            updatedAt: serverTimestamp()
          }
        },
        {
          id: 'roster',
          payload: {
            kind: 'roster',
            delegatesPublic: INITIAL_DELEGATES.map(toPublicRosterEntry),
            updatedByUid: 'sec-pablo',
            updatedByUsernameLower: 'pablo.rodriguez',
            updatedAt: serverTimestamp()
          }
        },
        {
          id: 'actas',
          payload: {
            kind: 'actas',
            items: [],
            updatedByUid: 'sec-pablo',
            updatedByUsernameLower: 'pablo.rodriguez',
            updatedAt: serverTimestamp()
          }
        },
        {
          id: 'order_motions',
          payload: {
            kind: 'order_motions',
            items: [],
            updatedByUid: 'sec-pablo',
            updatedByUsernameLower: 'pablo.rodriguez',
            updatedAt: serverTimestamp()
          }
        }
      ];

      const [secSnap, pabloSnap, ...roomSnaps] = await Promise.all([
        getDoc(doc(db, 'accredited_users', 'secretaria')),
        getDoc(doc(db, 'accredited_users', 'pablo.rodriguez')),
        ...roomDefs.map((rm) => getDoc(doc(db, 'plenario_rooms', rm.id)))
      ]);

      if (!secSnap.exists() || !pabloSnap.exists()) {
        const batch1 = writeBatch(db);
        for (const del of INITIAL_DELEGATES) {
          const key = normalizeUsername(del.username);
          const existingSnap = key === 'secretaria' ? secSnap : pabloSnap;
          if (!existingSnap.exists()) {
            batch1.set(
              doc(db, 'accredited_users', key),
              stripUndefinedDeep({
                id: del.id,
                name: del.name,
                username: del.username,
                usernameLower: key,
                region: del.region,
                role: del.role,
                organization: del.organization || 'Secretaría Técnica Nacional',
                avatarUrl: del.avatarUrl,
                isOnline: false,
                hasSpokenInCurrentMotion: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              })
            );
          }
        }
        await batch1.commit();
      }

      const missingRooms = roomDefs.filter((_, idx) => !roomSnaps[idx]?.exists());

      if (missingRooms.length > 0) {
        const batch2 = writeBatch(db);
        for (const rm of missingRooms) {
          batch2.set(doc(db, 'plenario_rooms', rm.id), rm.payload);
        }
        const initLog = INITIAL_AUDIT_LOGS[0];
        if (initLog) {
          const logSnap = await getDoc(doc(db, 'audit_logs', initLog.id));
          if (!logSnap.exists()) {
            batch2.set(doc(db, 'audit_logs', initLog.id), {
              id: initLog.id,
              roomId: 'main',
              timestamp: Date.now(),
              isoTime: new Date().toISOString(),
              delegateId: 'sec-01',
              delegateName: 'Secretaría Técnica FE-FA',
              ipAddress: 'cloud-init',
              action: initLog.action,
              details: initLog.details.slice(0, 1000),
              integrityHash: initLog.integrityHash,
              authorUid: 'sec-01',
              createdAt: serverTimestamp()
            });
          }
        }
        await batch2.commit();
      }
    };

    bootstrapPromiseRef.current = run().catch((err) => {
      bootstrapPromiseRef.current = null;
      throw err;
    });
    return bootstrapPromiseRef.current;
  }, []);

  // Verify saved username session & bootstrap room in background without blocking UI render
  useEffect(() => {
    let active = true;
    ensureBootstrappedRoom().catch((err) => {
      console.error('Error inicializando sala del Plenario:', err);
    });

    const savedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
    const savedKeyHash = localStorage.getItem(KEY_HASH_STORAGE_KEY);
    if (savedUsername && isValidUsername(savedUsername) && savedKeyHash) {
      const usernameLower = normalizeUsername(savedUsername);
      getDoc(doc(db, 'accredited_users', usernameLower))
        .then((snap) => {
          if (!active) return;
          if (snap.exists()) {
            const userData = snap.data() as Delegate;
            const storedKey = (userData.accessKey || '').trim();
            const expectedHash = storedKey ? hashAccessKey(storedKey) : '';
            if (!storedKey || expectedHash !== savedKeyHash) {
              localStorage.removeItem(USERNAME_STORAGE_KEY);
              localStorage.removeItem(USER_CACHE_STORAGE_KEY);
              localStorage.removeItem(KEY_HASH_STORAGE_KEY);
              setCurrentUser(null);
              setActiveTab('inicio');
              setShowLoginModal(false);
              return;
            }
            localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(sanitizeUserForCache(userData)));
            setCurrentUser(userData);
            setShowLoginModal(false);
            updateDoc(doc(db, 'accredited_users', usernameLower), {
              isOnline: true,
              lastSessionId: `sess-${Date.now()}`,
              updatedAt: serverTimestamp()
            }).catch(() => {});
          } else {
            localStorage.removeItem(USERNAME_STORAGE_KEY);
            localStorage.removeItem(USER_CACHE_STORAGE_KEY);
            localStorage.removeItem(KEY_HASH_STORAGE_KEY);
            setCurrentUser(null);
            setActiveTab('inicio');
            setShowLoginModal(false);
          }
        })
        .catch((err) => {
          console.error('Error validando sesión guardada:', err);
        })
        .finally(() => {
          if (active) setAuthReady(true);
        });
    } else {
      localStorage.removeItem(USERNAME_STORAGE_KEY);
      localStorage.removeItem(USER_CACHE_STORAGE_KEY);
      localStorage.removeItem(KEY_HASH_STORAGE_KEY);
      setCurrentUser(null);
      setActiveTab('inicio');
      setShowLoginModal(false);
      setAuthReady(true);
    }

    return () => {
      active = false;
    };
  }, [ensureBootstrappedRoom]);

  // Attach PUBLIC Firestore real-time onSnapshot listeners immediately (for Inicio & workspace)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // 1. Synthesis chapters listener
    unsubs.push(
      onSnapshot(
        doc(db, 'plenario_rooms', 'synthesis'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.chapters)) {
              setSynthesisChapters(data.chapters as SynthesisChapter[]);
            }
            if (typeof data.motionsEnabledGlobal === 'boolean') {
              setGlobalMotionsEnabled(data.motionsEnabledGlobal);
            }
          }
          setStorageStatus({
            connected: true,
            storagePath: 'Firebase Firestore (Nube en Vivo)',
            lastSaved: Date.now()
          });
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'plenario_rooms/synthesis')
      )
    );

    // 2. Roster listener
    unsubs.push(
      onSnapshot(
        doc(db, 'plenario_rooms', 'roster'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.delegatesPublic)) {
              const cleanRoster = (data.delegatesPublic as Array<Record<string, unknown>>)
                .filter((entry) => typeof entry?.id === 'string' && typeof entry?.name === 'string')
                .map((entry) => ({
                  ...(entry as unknown as Delegate),
                  username: typeof entry.username === 'string' ? entry.username : ''
                }));
              setRosterDelegates(cleanRoster);
            }
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'plenario_rooms/roster')
      )
    );

    // 3. Actas listener
    unsubs.push(
      onSnapshot(
        doc(db, 'plenario_rooms', 'actas'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.items)) {
              setActas(data.items as Acta[]);
            }
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'plenario_rooms/actas')
      )
    );

    // 4. Order motions listener
    unsubs.push(
      onSnapshot(
        doc(db, 'plenario_rooms', 'order_motions'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.items)) {
              setOrderMotions(data.items as OrderMotion[]);
            }
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'plenario_rooms/order_motions')
      )
    );

    // 5. Motions collection listener
    unsubs.push(
      onSnapshot(
        query(collection(db, 'motions'), where('roomId', '==', 'main')),
        (snap) => {
          const list: Motion[] = snap.docs.map((d) => {
            const raw = d.data();
            return {
              id: raw.id || d.id,
              code: raw.code,
              motionKind: raw.motionKind,
              title: raw.title,
              description: raw.description,
              proposedBy: raw.proposedBy,
              status: raw.status,
              quorumType: raw.quorumType,
              createdAt: raw.createdAtMs || Date.now(),
              startedAt: raw.startedAtMs,
              closedAt: raw.closedAtMs,
              durationSeconds: raw.durationSeconds || 300,
              targetParagraphId: raw.targetParagraphId,
              targetParagraphNumber: raw.targetParagraphNumber,
              originalParagraphText: raw.originalParagraphText,
              proposedExtensionText: raw.proposedExtensionText,
              proposedEditedText: raw.proposedEditedText,
              dissensusId: raw.dissensusId,
              dissensusOptions: raw.dissensusOptions,
              runoffOptions: raw.runoffOptions,
              resultSummary: raw.resultSummary,
              votes: {}
            };
          });
          setMotionDocs(list);
          setStorageStatus({
            connected: true,
            storagePath: 'Firebase Firestore (Nube en Vivo)',
            lastSaved: Date.now()
          });
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'motions')
      )
    );

    // 6. Votes collection listener
    unsubs.push(
      onSnapshot(
        query(collection(db, 'votes'), where('roomId', '==', 'main')),
        (snap) => {
          const list = snap.docs.map((d) => {
            const raw = d.data();
            return {
              motionId: raw.motionId as string,
              delegateId: raw.delegateId as string,
              delegateName: raw.delegateName as string,
              region: raw.region as ChileanRegion,
              vote: raw.vote as VoteOption,
              timestamp: raw.timestamp as number,
              digitalSignatureHash: raw.digitalSignatureHash as string,
              notes: raw.notes as string | undefined
            };
          });
          setVoteDocs(list);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'votes')
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []);

  // Attach AUTHENTICATED profile & Secretary-only Firestore listeners
  useEffect(() => {
    if (!authReady || !currentUser) {
      setAdminDelegates([]);
      setAuditLogs([]);
      return;
    }

    const isAdminUser = currentUser.role === 'SECRETARY';
    const usernameLower = normalizeUsername(currentUser.username);
    const unsubs: Array<() => void> = [];

    // 1. Own accredited profile listener
    unsubs.push(
      onSnapshot(
        doc(db, 'accredited_users', usernameLower),
        (snap) => {
          if (snap.exists()) {
            const userData = snap.data() as Delegate;
            const savedHash = localStorage.getItem(KEY_HASH_STORAGE_KEY);
            const storedKey = (userData.accessKey || '').trim();
            if (!savedHash || !storedKey || hashAccessKey(storedKey) !== savedHash) {
              localStorage.removeItem(USERNAME_STORAGE_KEY);
              localStorage.removeItem(USER_CACHE_STORAGE_KEY);
              localStorage.removeItem(KEY_HASH_STORAGE_KEY);
              setCurrentUser(null);
              setActiveTab('inicio');
              setShowLoginModal(false);
              return;
            }
            localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(sanitizeUserForCache(userData)));
            setCurrentUser(userData);
          } else if (usernameLower === 'secretaria' || usernameLower === 'pablo.rodriguez') {
            ensureBootstrappedRoom().catch(() => {});
          } else {
            localStorage.removeItem(USERNAME_STORAGE_KEY);
            localStorage.removeItem(USER_CACHE_STORAGE_KEY);
            localStorage.removeItem(KEY_HASH_STORAGE_KEY);
            setCurrentUser(null);
            setActiveTab('inicio');
            setShowLoginModal(false);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, `accredited_users/${usernameLower}`)
      )
    );

    // 2. Admin-only full Padrón and Audit Logs listeners
    if (isAdminUser) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'accredited_users'), where('role', 'in', ['DELEGATE', 'SECRETARY'])),
          (snap) => {
            const list = snap.docs
              .filter((d) => !d.id.includes('@'))
              .map((d) => {
                const raw = d.data() as Partial<Delegate>;
                const uname =
                  typeof raw.username === 'string' && raw.username.trim().length > 0
                    ? raw.username
                    : d.id;
                return {
                  ...(raw as Delegate),
                  username: uname
                };
              })
              .filter((d) => isValidUsername(d.username));
            list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
            setAdminDelegates(list);
          },
          (error) => handleFirestoreError(error, OperationType.LIST, 'accredited_users')
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'audit_logs'), where('roomId', '==', 'main')),
          (snap) => {
            const list = snap.docs
              .map((d) => d.data() as AuditLogEntry)
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .slice(0, 200);
            setAuditLogs(list);
          },
          (error) => handleFirestoreError(error, OperationType.LIST, 'audit_logs')
        )
      );
    } else {
      setAdminDelegates([]);
      setAuditLogs([]);
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, currentUser?.username, currentUser?.role, ensureBootstrappedRoom]);

  // Write audit log to Firestore
  const writeAuditLogEntry = useCallback(
    (action: string, details: string, customUser?: Delegate | null) => {
      const actor = customUser ?? currentUser;
      const actorId = actor?.id || 'system';
      const now = Date.now();
      const id = `aud-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const entry = {
        id,
        roomId: 'main',
        timestamp: now,
        isoTime: new Date(now).toISOString(),
        delegateId: actorId,
        delegateName: actor ? `${actor.name} (${actor.role})` : 'Sistema Automatizado',
        ipAddress: actor?.ipAddress || 'cloud-client',
        action: action.slice(0, 80),
        details: (details || action).slice(0, 1000),
        integrityHash:
          Array.from(action + details + now)
            .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
            .toString(16) + '...sha256',
        authorUid: actorId,
        createdAt: serverTimestamp()
      };

      setDoc(doc(db, 'audit_logs', id), entry).catch((err) => {
        console.warn('Error registrando auditoría:', err);
      });
    },
    [currentUser]
  );

  const addAuditLog = useCallback(
    (action: string, details: string) => {
      writeAuditLogEntry(action, details);
    },
    [writeAuditLogEntry]
  );

  const persistSynthesisChapters = useCallback(
    (nextChapters: SynthesisChapter[], nextGlobalEnabled?: boolean) => {
      if (!currentUser) return;
      const usernameLower = normalizeUsername(currentUser.username);
      const resolvedGlobal = typeof nextGlobalEnabled === 'boolean' ? nextGlobalEnabled : globalMotionsEnabled;
      setSynthesisChapters(nextChapters);
      if (typeof nextGlobalEnabled === 'boolean') {
        setGlobalMotionsEnabled(nextGlobalEnabled);
      }
      setDoc(doc(db, 'plenario_rooms', 'synthesis'), {
        kind: 'synthesis',
        chapters: stripUndefinedDeep(nextChapters),
        motionsEnabledGlobal: resolvedGlobal,
        updatedByUid: currentUser.id,
        updatedByUsernameLower: usernameLower,
        updatedAt: serverTimestamp()
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, 'plenario_rooms/synthesis'));
    },
    [currentUser, globalMotionsEnabled]
  );

  const persistActas = useCallback(
    (nextActas: Acta[]) => {
      if (!currentUser) return;
      const usernameLower = normalizeUsername(currentUser.username);
      setActas(nextActas);
      setDoc(doc(db, 'plenario_rooms', 'actas'), {
        kind: 'actas',
        items: stripUndefinedDeep(nextActas),
        updatedByUid: currentUser.id,
        updatedByUsernameLower: usernameLower,
        updatedAt: serverTimestamp()
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, 'plenario_rooms/actas'));
    },
    [currentUser]
  );

  // Step 1: Check username in Padrón and whether a personal accessKey is already configured
  const checkUsernameAccess = useCallback(
    async (
      rawUsername: string
    ): Promise<{
      success: boolean;
      exists: boolean;
      hasAccessKey: boolean;
      displayName?: string;
      role?: UserRole;
      error?: string;
    }> => {
      const usernameLower = normalizeUsername(rawUsername);
      if (!isValidUsername(usernameLower)) {
        return {
          success: false,
          exists: false,
          hasAccessKey: false,
          error: 'Ingrese un nombre de usuario válido (solo letras, números, puntos, guiones o guión bajo).'
        };
      }

      try {
        let snap = await getDoc(doc(db, 'accredited_users', usernameLower));
        if (!snap.exists() && (usernameLower === 'secretaria' || usernameLower === 'pablo.rodriguez')) {
          await ensureBootstrappedRoom();
          snap = await getDoc(doc(db, 'accredited_users', usernameLower));
        }
        if (!snap.exists()) {
          return {
            success: false,
            exists: false,
            hasAccessKey: false,
            error: `El usuario "@${usernameLower}" no se encuentra registrado en el Padrón Oficial. Verifique el nombre o contacte a la Secretaría Técnica.`
          };
        }

        const userData = snap.data() as Delegate;
        const storedKey = (userData.accessKey || '').trim();
        return {
          success: true,
          exists: true,
          hasAccessKey: storedKey.length > 0,
          displayName: userData.name,
          role: userData.role
        };
      } catch (err: any) {
        return {
          success: false,
          exists: false,
          hasAccessKey: false,
          error: err?.message || 'Error al verificar el nombre de usuario en el Padrón Oficial.'
        };
      }
    },
    [ensureBootstrappedRoom]
  );

  // Step 2A: Returning user login with username + personal accessKey
  const loginWithCredentials = useCallback(
    async (
      rawUsername: string,
      rawAccessKey: string
    ): Promise<AuthLoginResult & { requiresSetup?: boolean }> => {
      const usernameLower = normalizeUsername(rawUsername);
      if (!isValidUsername(usernameLower)) {
        return {
          success: false,
          error: 'Ingrese un nombre de usuario válido (solo letras, números, puntos, guiones o guión bajo).'
        };
      }

      const cleanKey = (rawAccessKey || '').trim();
      if (!cleanKey) {
        return { success: false, error: 'Debe ingresar su clave de acceso personal.' };
      }

      try {
        let snap = await getDoc(doc(db, 'accredited_users', usernameLower));
        if (!snap.exists() && (usernameLower === 'secretaria' || usernameLower === 'pablo.rodriguez')) {
          await ensureBootstrappedRoom();
          snap = await getDoc(doc(db, 'accredited_users', usernameLower));
        }
        if (!snap.exists()) {
          return {
            success: false,
            error: `El usuario "@${usernameLower}" no se encuentra registrado en el Padrón Oficial.`
          };
        }

        const userData = snap.data() as Delegate;
        const storedKey = (userData.accessKey || '').trim();
        if (!storedKey) {
          return {
            success: false,
            requiresSetup: true,
            error: 'Esta cuenta aún no tiene una clave configurada. Cree su clave personal para continuar.'
          };
        }

        if (cleanKey !== storedKey) {
          writeAuditLogEntry(
            'INTENTO_ACCESO_FALLIDO',
            `Intento de ingreso con clave incorrecta para el usuario @${userData.username}.`,
            userData
          );
          return {
            success: false,
            error: 'Clave de acceso incorrecta. Verifique e intente nuevamente o solicite apoyo a la Secretaría Técnica.'
          };
        }

        localStorage.setItem(USERNAME_STORAGE_KEY, usernameLower);
        localStorage.setItem(KEY_HASH_STORAGE_KEY, hashAccessKey(storedKey));
        localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(sanitizeUserForCache(userData)));
        setCurrentUser({ ...userData, isOnline: true });
        setActiveTab('plenario');

        updateDoc(doc(db, 'accredited_users', usernameLower), {
          isOnline: true,
          lastSessionId: `sess-${Date.now()}`,
          updatedAt: serverTimestamp()
        }).catch(() => {});

        writeAuditLogEntry(
          'ACREDITACION_EXITOSA',
          `${userData.name} (${userData.role}) ingresó con el usuario @${userData.username} tras validar su clave personal.`,
          userData
        );

        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'Error al validar las credenciales en el Padrón Oficial.'
        };
      }
    },
    [ensureBootstrappedRoom, writeAuditLogEntry]
  );

  // Step 2B: First-time login — user creates and locks their personal accessKey
  const setupFirstTimeAccessKey = useCallback(
    async (rawUsername: string, rawNewKey: string): Promise<AuthLoginResult> => {
      const usernameLower = normalizeUsername(rawUsername);
      if (!isValidUsername(usernameLower)) {
        return {
          success: false,
          error: 'Nombre de usuario inválido.'
        };
      }

      const cleanNewKey = (rawNewKey || '').trim();
      if (cleanNewKey.length < 4 || cleanNewKey.length > 64) {
        return {
          success: false,
          error: 'La clave debe tener entre 4 y 64 caracteres.'
        };
      }

      try {
        let snap = await getDoc(doc(db, 'accredited_users', usernameLower));
        if (!snap.exists() && (usernameLower === 'secretaria' || usernameLower === 'pablo.rodriguez')) {
          await ensureBootstrappedRoom();
          snap = await getDoc(doc(db, 'accredited_users', usernameLower));
        }
        if (!snap.exists()) {
          return {
            success: false,
            error: `El usuario "@${usernameLower}" no se encuentra registrado en el Padrón Oficial.`
          };
        }

        const userData = snap.data() as Delegate;
        const existingKey = (userData.accessKey || '').trim();
        if (existingKey.length > 0) {
          return {
            success: false,
            error: 'Esta cuenta ya tiene una clave configurada. Ingrese con su clave o pida a Secretaría Técnica restablecerla.'
          };
        }

        const sessionId = `sess-${Date.now()}`;
        await updateDoc(doc(db, 'accredited_users', usernameLower), {
          accessKey: cleanNewKey,
          isOnline: true,
          lastSessionId: sessionId,
          updatedAt: serverTimestamp()
        });

        const updatedUser: Delegate = {
          ...userData,
          accessKey: cleanNewKey,
          isOnline: true,
          lastSessionId: sessionId
        };

        localStorage.setItem(USERNAME_STORAGE_KEY, usernameLower);
        localStorage.setItem(KEY_HASH_STORAGE_KEY, hashAccessKey(cleanNewKey));
        localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(sanitizeUserForCache(updatedUser)));
        setCurrentUser(updatedUser);
        setActiveTab('plenario');

        writeAuditLogEntry(
          'CREACION_CLAVE_INICIAL',
          `${userData.name} (${userData.role}) creó su clave de acceso personal en su primer ingreso (@${userData.username}).`,
          updatedUser
        );

        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'No se pudo registrar la clave inicial en la base de datos.'
        };
      }
    },
    [ensureBootstrappedRoom, writeAuditLogEntry]
  );

  const logout = useCallback(async () => {
    if (currentUser) {
      const usernameLower = normalizeUsername(currentUser.username);
      updateDoc(doc(db, 'accredited_users', usernameLower), {
        isOnline: false,
        updatedAt: serverTimestamp()
      }).catch(() => {});
      writeAuditLogEntry('CIERRE_SESION', `${currentUser.name} cerró sesión en la plataforma`);
    }
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    localStorage.removeItem(USER_CACHE_STORAGE_KEY);
    localStorage.removeItem(KEY_HASH_STORAGE_KEY);
    setCurrentUser(null);
    setShowLoginModal(false);
    setActiveTab('inicio');
  }, [currentUser, writeAuditLogEntry]);

  const isSecretariaTecnica = useMemo(() => currentUser?.role === 'SECRETARY', [currentUser]);
  const isDelegate = useMemo(() => currentUser?.role === 'DELEGATE', [currentUser]);
  const canVote = useMemo(() => !!currentUser && currentUser.role === 'DELEGATE', [currentUser]);

  const activeMotion: Motion | null = useMemo(() => {
    const selectable = motionsHistory.filter((m) => m.status !== 'DRAFT');
    if (selectable.length === 0) return null;
    const found = selectable.find((m) => m.id === activeMotionId);
    if (found) return found;
    const open = selectable.find((m) => m.status === 'VOTING');
    if (open) return open;
    const sorted = [...selectable].sort((a, b) => {
      const timeA = a.closedAt || a.startedAt || a.createdAt || 0;
      const timeB = b.closedAt || b.startedAt || b.createdAt || 0;
      return timeB - timeA;
    });
    return sorted[0] || null;
  }, [motionsHistory, activeMotionId]);

  const hasActiveVoting = useMemo(() => motionsHistory.some((m) => m.status === 'VOTING'), [motionsHistory]);
  const activeVotingMotion = useMemo(() => motionsHistory.find((m) => m.status === 'VOTING'), [motionsHistory]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === 21) playTone(440, 'sine', 0.2);
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

  const writeNewMotionToFirestore = useCallback(
    (m: Motion) => {
      if (!currentUser) return;
      const actorUsernameLower = normalizeUsername(currentUser.username);
      const payload = stripUndefinedDeep({
        id: m.id,
        roomId: 'main',
        code: m.code.slice(0, 64),
        motionKind: m.motionKind,
        title: m.title.slice(0, 300),
        description: (m.description || '').slice(0, 4000),
        proposedBy: m.proposedBy.slice(0, 200),
        status: m.status,
        quorumType: m.quorumType,
        createdAtMs: m.createdAt,
        startedAtMs: m.startedAt,
        closedAtMs: m.closedAt,
        durationSeconds: m.durationSeconds || 300,
        targetParagraphId: m.targetParagraphId,
        targetParagraphNumber: m.targetParagraphNumber,
        originalParagraphText: m.originalParagraphText?.slice(0, 15000),
        proposedExtensionText: m.proposedExtensionText?.slice(0, 15000),
        proposedEditedText: m.proposedEditedText?.slice(0, 15000),
        dissensusId: m.dissensusId,
        dissensusOptions: m.dissensusOptions,
        runoffOptions: m.runoffOptions,
        resultSummary: m.resultSummary,
        authorUid: currentUser.id,
        actorUsernameLower,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setDoc(doc(db, 'motions', m.id), payload).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `motions/${m.id}`)
      );
    },
    [currentUser]
  );

  // Delegate CRUD (Secretaría Técnica)
  const deleteDelegate = useCallback(
    async (delegateId: string): Promise<AuthLoginResult> => {
      if (!currentUser || currentUser.role !== 'SECRETARY') {
        return {
          success: false,
          error: 'Acceso no autorizado. Solo la Secretaría Técnica puede gestionar y eliminar usuarios del padrón.'
        };
      }
      if (currentUser.id === delegateId) {
        return { success: false, error: 'No puede eliminar su propia cuenta activa del padrón.' };
      }
      const target = delegates.find((d) => d.id === delegateId);
      if (!target) {
        return { success: false, error: 'Delegado/a no encontrado en el padrón.' };
      }
      const targetUsernameLower = normalizeUsername(target.username);
      if (targetUsernameLower === 'pablo.rodriguez' || targetUsernameLower === 'secretaria') {
        return { success: false, error: 'No se puede eliminar una cuenta base de la Secretaría Técnica.' };
      }

      const nextList = delegates.filter((d) => d.id !== delegateId);
      const actorUsernameLower = normalizeUsername(currentUser.username);

      try {
        const batch = writeBatch(db);
        if (isValidUsername(targetUsernameLower)) {
          batch.delete(doc(db, 'accredited_users', targetUsernameLower));
        }
        batch.set(doc(db, 'plenario_rooms', 'roster'), {
          kind: 'roster',
          delegatesPublic: nextList.map(toPublicRosterEntry),
          updatedByUid: currentUser.id,
          updatedByUsernameLower: actorUsernameLower,
          updatedAt: serverTimestamp()
        });
        await batch.commit();

        setAdminDelegates(nextList);
        setRosterDelegates(nextList);
        setSpeakerQueue((prev) => prev.filter((item) => item.delegateId !== delegateId));
        if (activeSpeaker?.delegateId === delegateId) {
          setActiveSpeaker(null);
          setIsTimerRunning(false);
        }

        addAuditLog(
          'ELIMINACION_DELEGADO',
          `${currentUser.name} (Secretaría Técnica) eliminó del padrón a ${target.name} (@${target.username})`
        );
        return { success: true };
      } catch (err: any) {
        console.error('Error eliminando usuario:', err);
        return {
          success: false,
          error: err?.message || 'No se pudo eliminar al usuario en la base de datos.'
        };
      }
    },
    [currentUser, delegates, activeSpeaker, addAuditLog]
  );

  const updateDelegate = useCallback(
    async (delegateId: string, updates: Partial<Delegate>): Promise<AuthLoginResult> => {
      if (!currentUser || currentUser.role !== 'SECRETARY') {
        return {
          success: false,
          error: 'Acceso no autorizado. Solo la Secretaría Técnica puede modificar usuarios en el padrón.'
        };
      }
      const target = delegates.find((d) => d.id === delegateId);
      if (!target) {
        return { success: false, error: 'Usuario no encontrado en el padrón.' };
      }

      const nextUsernameLower = normalizeUsername(updates.username ?? target.username);
      const oldUsernameLower = normalizeUsername(target.username);

      if (!isValidUsername(nextUsernameLower)) {
        return {
          success: false,
          error: 'El nombre de usuario debe tener al menos 2 caracteres válidos (letras sin tildes, números, puntos o guiones).'
        };
      }

      if (
        oldUsernameLower !== nextUsernameLower &&
        (oldUsernameLower === 'pablo.rodriguez' || oldUsernameLower === 'secretaria')
      ) {
        return {
          success: false,
          error: 'No se puede cambiar el nombre de usuario de las cuentas base de Secretaría Técnica (sí puede editar nombre o región).'
        };
      }

      const hasKeyUpdate = Object.prototype.hasOwnProperty.call(updates, 'accessKey');
      const cleanedAccessKey = hasKeyUpdate ? (updates.accessKey || '').trim() : (target.accessKey || '').trim();
      if (hasKeyUpdate && cleanedAccessKey.length > 0 && (cleanedAccessKey.length < 4 || cleanedAccessKey.length > 64)) {
        return {
          success: false,
          error: 'La clave de acceso debe tener entre 4 y 64 caracteres (o dejarse vacía para solicitar nueva clave en el primer ingreso).'
        };
      }

      const actorUsernameLower = normalizeUsername(currentUser.username);
      const merged: Delegate = {
        ...target,
        ...updates,
        username: nextUsernameLower,
        accessKey: cleanedAccessKey
      };
      const nextList = delegates.map((d) => (d.id === delegateId ? merged : d));

      try {
        if (oldUsernameLower !== nextUsernameLower) {
          const conflictSnap = await getDoc(doc(db, 'accredited_users', nextUsernameLower));
          if (conflictSnap.exists()) {
            return {
              success: false,
              error: `El nombre de usuario "@${nextUsernameLower}" ya está asignado a otro usuario.`
            };
          }
        }

        const batch = writeBatch(db);
        if (oldUsernameLower !== nextUsernameLower) {
          if (isValidUsername(oldUsernameLower)) {
            batch.delete(doc(db, 'accredited_users', oldUsernameLower));
          }
          batch.set(
            doc(db, 'accredited_users', nextUsernameLower),
            stripUndefinedDeep({
              id: merged.id,
              name: merged.name.slice(0, 160),
              username: nextUsernameLower,
              usernameLower: nextUsernameLower,
              region: merged.region,
              role: merged.role,
              organization: merged.organization,
              avatarUrl: merged.avatarUrl,
              isOnline: Boolean(merged.isOnline),
              hasSpokenInCurrentMotion: Boolean(merged.hasSpokenInCurrentMotion),
              accessKey: cleanedAccessKey || undefined,
              lastSessionId: merged.lastSessionId,
              actorUsernameLower,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          );
        } else {
          const existingSnap = await getDoc(doc(db, 'accredited_users', nextUsernameLower));
          if (existingSnap.exists()) {
            const updatePayload: Record<string, unknown> = {
              id: merged.id,
              name: merged.name.slice(0, 160),
              username: nextUsernameLower,
              region: merged.region,
              role: merged.role,
              organization: merged.organization,
              avatarUrl: merged.avatarUrl,
              isOnline: Boolean(merged.isOnline),
              hasSpokenInCurrentMotion: Boolean(merged.hasSpokenInCurrentMotion),
              actorUsernameLower,
              updatedAt: serverTimestamp()
            };
            if (hasKeyUpdate) {
              updatePayload.accessKey = cleanedAccessKey;
            }
            batch.update(
              doc(db, 'accredited_users', nextUsernameLower),
              stripUndefinedDeep(updatePayload)
            );
          } else {
            batch.set(
              doc(db, 'accredited_users', nextUsernameLower),
              stripUndefinedDeep({
                id: merged.id,
                name: merged.name.slice(0, 160),
                username: nextUsernameLower,
                usernameLower: nextUsernameLower,
                region: merged.region,
                role: merged.role,
                organization: merged.organization,
                avatarUrl: merged.avatarUrl,
                isOnline: Boolean(merged.isOnline),
                hasSpokenInCurrentMotion: Boolean(merged.hasSpokenInCurrentMotion),
                accessKey: cleanedAccessKey || undefined,
                actorUsernameLower,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              })
            );
          }
        }

        batch.set(doc(db, 'plenario_rooms', 'roster'), {
          kind: 'roster',
          delegatesPublic: nextList.map(toPublicRosterEntry),
          updatedByUid: currentUser.id,
          updatedByUsernameLower: actorUsernameLower,
          updatedAt: serverTimestamp()
        });

        await batch.commit();

        setAdminDelegates(nextList);
        setRosterDelegates(nextList);

        if (currentUser.id === delegateId) {
          localStorage.setItem(USERNAME_STORAGE_KEY, nextUsernameLower);
          if (cleanedAccessKey) {
            localStorage.setItem(KEY_HASH_STORAGE_KEY, hashAccessKey(cleanedAccessKey));
          } else {
            localStorage.removeItem(KEY_HASH_STORAGE_KEY);
          }
          localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(sanitizeUserForCache(merged)));
          setCurrentUser(merged);
        }

        const keyNote = hasKeyUpdate
          ? cleanedAccessKey
            ? ' (incluye actualización de clave de acceso)'
            : ' (clave de acceso restablecida para primer ingreso)'
          : '';
        addAuditLog(
          'MODIFICACION_USUARIO',
          `${currentUser.name} (Secretaría Técnica) modificó los datos de ${merged.name} (@${merged.username})${keyNote}`
        );
        return { success: true };
      } catch (err: any) {
        console.error('Error modificando usuario:', err);
        return {
          success: false,
          error: err?.message || 'No se pudieron guardar los cambios en la base de datos.'
        };
      }
    },
    [currentUser, delegates, addAuditLog]
  );

  const addDelegate = useCallback(
    async (newDel: Omit<Delegate, 'id' | 'isOnline' | 'hasSpokenInCurrentMotion'>): Promise<AuthLoginResult> => {
      if (!currentUser || currentUser.role !== 'SECRETARY') {
        return {
          success: false,
          error: 'Solo la Secretaría Técnica puede agregar usuarios al padrón.'
        };
      }
      const usernameLower = normalizeUsername(newDel.username);
      if (!isValidUsername(usernameLower)) {
        return {
          success: false,
          error: 'El nombre de usuario debe tener al menos 2 caracteres válidos (letras sin tildes, números, puntos o guiones).'
        };
      }

      const cleanName = (newDel.name || '').trim().slice(0, 160);
      if (!cleanName) {
        return { success: false, error: 'Debe ingresar el nombre completo del usuario.' };
      }

      const cleanAccessKey = (newDel.accessKey || '').trim();
      if (cleanAccessKey.length > 0 && (cleanAccessKey.length < 4 || cleanAccessKey.length > 64)) {
        return {
          success: false,
          error: 'La clave inicial debe tener entre 4 y 64 caracteres (o dejarse vacía para creación en primer ingreso).'
        };
      }

      try {
        const existingSnap = await getDoc(doc(db, 'accredited_users', usernameLower));
        if (existingSnap.exists()) {
          return {
            success: false,
            error: `El usuario "@${usernameLower}" ya existe en el padrón oficial.`
          };
        }

        const actorUsernameLower = normalizeUsername(currentUser.username);
        const id = `del-${Date.now()}`;
        const delegate: Delegate = {
          ...newDel,
          name: cleanName,
          username: usernameLower,
          accessKey: cleanAccessKey || undefined,
          id,
          isOnline: false,
          hasSpokenInCurrentMotion: false
        };

        const filtered = delegates.filter((d) => normalizeUsername(d.username) !== usernameLower);
        const nextList = [delegate, ...filtered];

        const batch = writeBatch(db);
        batch.set(
          doc(db, 'accredited_users', usernameLower),
          stripUndefinedDeep({
            id: delegate.id,
            name: cleanName,
            username: usernameLower,
            usernameLower,
            region: delegate.region,
            role: delegate.role,
            organization: delegate.organization,
            avatarUrl: delegate.avatarUrl,
            accessKey: cleanAccessKey || undefined,
            isOnline: false,
            hasSpokenInCurrentMotion: false,
            actorUsernameLower,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        );
        batch.set(doc(db, 'plenario_rooms', 'roster'), {
          kind: 'roster',
          delegatesPublic: nextList.map(toPublicRosterEntry),
          updatedByUid: currentUser.id,
          updatedByUsernameLower: actorUsernameLower,
          updatedAt: serverTimestamp()
        });
        await batch.commit();

        setAdminDelegates(nextList);
        setRosterDelegates(nextList);

        addAuditLog(
          'ALTA_DELEGADO',
          `Acreditación individual agregada por Secretaría Técnica: ${delegate.name} (@${usernameLower}, ${delegate.region})`
        );
        return { success: true };
      } catch (err: any) {
        console.error('Error agregando usuario:', err);
        return {
          success: false,
          error: err?.message || 'No se pudo agregar al usuario en la base de datos.'
        };
      }
    },
    [currentUser, delegates, addAuditLog]
  );

  // Actas Operations
  const createActa = useCallback(
    (data: Partial<Acta>): Acta => {
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
        quorumInstallationText:
          data.quorumInstallationText ||
          `Con la presencia acreditada de ${delegates.length} delegadas/os regionales se verifica el quórum estatutario para sesionar.`,
        accreditedDelegatesCount: delegates.length,
        agendaTopics:
          data.agendaTopics && data.agendaTopics.length > 0
            ? data.agendaTopics
            : [
                '1. Apertura de la sesión y verificación de quórum',
                '2. Puntos en debate del Documento de Síntesis Nacional',
                '3. Votaciones parlamentarias vinculantes'
              ],
        bodyContent:
          data.bodyContent ||
          'Se da inicio a la sesión deliberativa con la participación de las bancadas de todo el país...',
        conclusions:
          data.conclusions && data.conclusions.length > 0
            ? data.conclusions
            : ['Ratificación de los consensos alcanzados en el Plenario.'],
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

      const nextActas = [newActa, ...actas];
      persistActas(nextActas);
      setActiveActaId(newActa.id);
      addAuditLog(
        'CREACION_ACTA',
        `Nueva acta creada por ${currentUser?.name || 'Secretaría'}: ${code} - "${newActa.sessionTitle}"`
      );
      return newActa;
    },
    [actas, delegates.length, activeMotionId, currentUser, addAuditLog, persistActas]
  );

  const updateActa = useCallback(
    (id: string, updates: Partial<Acta>) => {
      const nextActas = actas.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updates,
              lastModifiedAt: Date.now(),
              lastModifiedBy: currentUser ? currentUser.name : a.lastModifiedBy
            }
          : a
      );
      persistActas(nextActas);
      addAuditLog('EDICION_ACTA', `Acta ${id} actualizada por ${currentUser?.name || 'Secretaría'}`);
    },
    [actas, currentUser, addAuditLog, persistActas]
  );

  const deleteActa = useCallback(
    (id: string) => {
      if (!isSecretariaTecnica) {
        return { success: false, error: 'Solo la Secretaría Técnica puede gestionar y eliminar borradores de actas.' };
      }
      const target = actas.find((a) => a.id === id);
      if (!target) return { success: false, error: 'Acta no encontrada.' };
      if (target.status === 'CERTIFICADA') {
        return {
          success: false,
          error: 'No se puede eliminar un acta que ya ha sido formalmente certificada y firmada digitalmente.'
        };
      }

      const remaining = actas.filter((a) => a.id !== id);
      persistActas(remaining);
      if (activeActaId === id && remaining.length > 0) {
        setActiveActaId(remaining[0].id);
      }
      addAuditLog('ELIMINACION_ACTA', `Acta ${target.code} eliminada por ${currentUser?.name}`);
      return { success: true };
    },
    [isSecretariaTecnica, actas, activeActaId, currentUser, addAuditLog, persistActas]
  );

  const certifyActa = useCallback(
    (id: string) => {
      if (!isSecretariaTecnica) return;
      const certHash = `sha256:${Array.from('CERTIFIED' + id + Date.now())
        .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
        .toString(16)}...cert`;

      const nextActas = actas.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'CERTIFICADA' as const,
              integrityHash: certHash,
              lastModifiedAt: Date.now(),
              lastModifiedBy: currentUser ? `${currentUser.name} (Certificación Oficial)` : a.lastModifiedBy,
              digitalSignatures: a.digitalSignatures.map((sig) => ({
                ...sig,
                status: 'FIRMADO' as const,
                timestamp: Date.now()
              }))
            }
          : a
      );
      persistActas(nextActas);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#4A154B', '#00796B', '#FFD700']
      });

      addAuditLog('CERTIFICACION_ACTA', `Acta ${id} certificada con firma digital por la Secretaría Técnica.`);
    },
    [isSecretariaTecnica, actas, currentUser, addAuditLog, persistActas]
  );

  // Voting: Atomic immutable ballot creation in /votes/{motionId}__{delegateId}
  const castVote = useCallback(
    (option: VoteOption, notes?: string) => {
      const targetMotion = activeMotion?.status === 'VOTING' ? activeMotion : activeVotingMotion;
      if (!currentUser || !targetMotion) return;
      if (targetMotion.status !== 'VOTING') return;

      if (!canVote) {
        addAuditLog(
          'VOTO_DENEGADO_DIRECCION',
          `${currentUser.name} no posee derecho a voto conforme a las atribuciones orgánicas del Plenario.`
        );
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

      const now = Date.now();
      const digitalSig = `fe4a-${currentUser.id.substring(0, 4)}-${now.toString(16)}-voto`;
      const voteId = `${targetMotion.id}__${currentUser.id}`;
      const delegateUsernameLower = normalizeUsername(currentUser.username);

      const newVoteDoc = stripUndefinedDeep({
        id: voteId,
        roomId: 'main',
        motionId: targetMotion.id,
        delegateId: currentUser.id,
        delegateUsernameLower,
        delegateName: currentUser.name,
        region: currentUser.region,
        vote: option,
        timestamp: now,
        digitalSignatureHash: digitalSig,
        notes: notes ? notes.slice(0, 500) : undefined,
        authorUid: currentUser.id,
        createdAt: serverTimestamp()
      });

      setVoteDocs((prev) => {
        if (prev.some((v) => v.motionId === targetMotion.id && v.delegateId === currentUser.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            motionId: targetMotion.id,
            delegateId: currentUser.id,
            delegateName: currentUser.name,
            region: currentUser.region,
            vote: option,
            timestamp: now,
            digitalSignatureHash: digitalSig,
            notes
          }
        ];
      });

      setDoc(doc(db, 'votes', voteId), newVoteDoc).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `votes/${voteId}`);
      });

      addAuditLog(
        'EMISION_VOTO',
        `${currentUser.name} (${currentUser.region}) emitió voto definitivo [${option}] en moción ${targetMotion.code}. Hash: ${digitalSig}`
      );
    },
    [currentUser, activeMotion, activeVotingMotion, canVote, addAuditLog]
  );

  const openVotingForMotion = useCallback(
    (motionId: string) => {
      if (!isSecretariaTecnica || !currentUser) {
        addAuditLog(
          'ACCION_DENEGADA',
          `${currentUser?.name || 'Usuario'} (Delegado/a) intentó abrir votación. Los delegados no tienen permitido lanzar o abrir votaciones.`
        );
        return;
      }
      const alreadyOpen = motionsHistory.find((m) => m.status === 'VOTING' && m.id !== motionId);
      if (alreadyOpen) {
        addAuditLog(
          'ACCION_DENEGADA',
          `Imposible abrir votación para ${motionId}. Ya existe una votación abierta en sala (${alreadyOpen.code}). Por reglamento, solo puede haber una votación activa a la vez.`
        );
        return;
      }

      const startedAt = Date.now();
      prevOpenVotingIdRef.current = motionId;
      setActiveMotionId(motionId);
      setMotionDocs((prev) =>
        prev.map((m) => (m.id === motionId ? { ...m, status: 'VOTING', startedAt } : m))
      );

      updateDoc(doc(db, 'motions', motionId), {
        status: 'VOTING',
        startedAtMs: startedAt,
        updatedByUsernameLower: normalizeUsername(currentUser.username),
        updatedAt: serverTimestamp()
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `motions/${motionId}`));

      addAuditLog(
        'APERTURA_VOTACION',
        `Votación formal iniciada por la Secretaría Técnica (${currentUser.name}) para la moción ${motionId}`
      );
    },
    [isSecretariaTecnica, currentUser, motionsHistory, addAuditLog]
  );

  const closeVotingForMotion = useCallback(
    (motionId: string) => {
      if (!isSecretariaTecnica || !currentUser) {
        addAuditLog(
          'ACCION_DENEGADA',
          `${currentUser?.name || 'Usuario'} (Delegado/a) intentó cerrar votación. Atribución privativa de la Secretaría Técnica.`
        );
        return;
      }

      const m = motionsHistory.find((item) => item.id === motionId);
      if (!m) return;

      const eligible = delegates.filter((d) => d.role === 'DELEGATE').length;
      const votesArray = Object.values(m.votes || {});
      const castCount = votesArray.length;
      const aFavor = votesArray.filter((v) => v.vote === 'A_FAVOR').length;
      const enContra = votesArray.filter((v) => v.vote === 'EN_CONTRA').length;
      const abstencion = votesArray.filter((v) => v.vote === 'ABSTENCION').length;
      const opcionA = votesArray.filter((v) => v.vote === 'OPCION_A').length;
      const opcionB = votesArray.filter((v) => v.vote === 'OPCION_B').length;
      const opcionC = votesArray.filter((v) => v.vote === 'OPCION_C').length;

      const quorumMet = eligible > 0 ? castCount >= Math.ceil(eligible * 0.5) : castCount > 0;
      const closedAt = Date.now();

      let nextStatus: Motion['status'];
      let resultSummary: NonNullable<Motion['resultSummary']>;
      let nextChapters = synthesisChapters;
      let synthesisChanged = false;

      if (m.motionKind === 'DISENSO_PRIMERA_VUELTA') {
        const directVotes = opcionA + opcionB + opcionC;
        const pctA = directVotes > 0 ? (opcionA / directVotes) * 100 : 0;
        const pctB = directVotes > 0 ? (opcionB / directVotes) * 100 : 0;
        const pctC = directVotes > 0 ? (opcionC / directVotes) * 100 : 0;

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
          synthesisChanged = true;
          nextChapters = synthesisChapters.map((ch) => ({
            ...ch,
            dissensusItems: (ch.dissensusItems || []).map((dis) =>
              dis.id === m.dissensusId ? { ...dis, status: 'RESUELTO', winner } : dis
            )
          }));
        } else if (runoffOptions && m.dissensusId) {
          synthesisChanged = true;
          nextChapters = synthesisChapters.map((ch) => ({
            ...ch,
            dissensusItems: (ch.dissensusItems || []).map((dis) =>
              dis.id === m.dissensusId
                ? {
                    ...dis,
                    round2Runoff: runoffOptions,
                    round1Votes: { a: opcionA, b: opcionB, c: opcionC, abs: abstencion }
                  }
                : dis
            )
          }));
        }

        if (winner) {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.5 } });
        }

        nextStatus = winner ? 'APPROVED' : 'PASSED_TO_RUNOFF';
        resultSummary = stripUndefinedDeep({
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
        });
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
          synthesisChanged = true;
          nextChapters = synthesisChapters.map((ch) => ({
            ...ch,
            dissensusItems: (ch.dissensusItems || []).map((dis) =>
              dis.id === m.dissensusId ? { ...dis, status: 'RESUELTO', winner } : dis
            )
          }));
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        }

        nextStatus = winner ? 'APPROVED' : 'CLOSED';
        resultSummary = stripUndefinedDeep({
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
        });
      } else {
        const validVotes = aFavor + enContra;
        const percentageFavor = validVotes > 0 ? (aFavor / validVotes) * 100 : 0;

        let isApproved = false;
        if (quorumMet && validVotes > 0) {
          if (m.quorumType === 'TWO_THIRDS') {
            isApproved = aFavor / validVotes >= 2 / 3;
          } else {
            isApproved = aFavor > enContra;
          }
        }

        if (isApproved && m.targetParagraphId) {
          if (m.motionKind === 'MOCION_EXTENSIVA') {
            synthesisChanged = true;
            nextChapters = synthesisChapters.map((ch) => ({
              ...ch,
              paragraphs: (ch.paragraphs || []).map((p) =>
                p.id === m.targetParagraphId
                  ? {
                      ...p,
                      status: 'EXTENDIDO',
                      extensionText: m.proposedExtensionText,
                      modifiedText: m.proposedEditedText || m.proposedExtensionText,
                      appliedMotionCode: m.code,
                      appliedMotionId: m.id
                    }
                  : p
              )
            }));
          } else if (m.motionKind === 'MOCION_SUPRESIVA') {
            synthesisChanged = true;
            nextChapters = synthesisChapters.map((ch) => ({
              ...ch,
              paragraphs: (ch.paragraphs || []).map((p) =>
                p.id === m.targetParagraphId
                  ? {
                      ...p,
                      status: 'SUPRIMIDO',
                      appliedMotionCode: m.code,
                      appliedMotionId: m.id
                    }
                  : p
              )
            }));
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

        nextStatus = isApproved ? 'APPROVED' : 'REJECTED';
        resultSummary = stripUndefinedDeep({
          totalEligible: eligible,
          totalCast: castCount,
          aFavor,
          enContra,
          abstencion,
          percentageFavor: Math.round(percentageFavor * 10) / 10,
          quorumMet,
          isApproved,
          winner: isApproved ? 'A_FAVOR' : 'EN_CONTRA'
        });
      }

      const usernameLower = normalizeUsername(currentUser.username);
      prevOpenVotingIdRef.current = null;
      setActiveMotionId(motionId);
      setMotionDocs((prev) =>
        prev.map((item) =>
          item.id === motionId ? { ...item, status: nextStatus, closedAt, resultSummary } : item
        )
      );
      if (synthesisChanged) {
        setSynthesisChapters(nextChapters);
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'motions', motionId), {
        status: nextStatus,
        closedAtMs: closedAt,
        resultSummary,
        updatedByUsernameLower: usernameLower,
        updatedAt: serverTimestamp()
      });
      if (synthesisChanged) {
        batch.set(doc(db, 'plenario_rooms', 'synthesis'), {
          kind: 'synthesis',
          chapters: stripUndefinedDeep(nextChapters),
          motionsEnabledGlobal: globalMotionsEnabled,
          updatedByUid: currentUser.id,
          updatedByUsernameLower: usernameLower,
          updatedAt: serverTimestamp()
        });
      }
      batch.commit().catch((err) => handleFirestoreError(err, OperationType.UPDATE, `motions/${motionId}`));

      addAuditLog('CIERRE_VOTACION', `Escrutinio público formal finalizado por ${currentUser.name} para ${m.code}.`);
    },
    [isSecretariaTecnica, currentUser, delegates, motionsHistory, synthesisChapters, globalMotionsEnabled, addAuditLog]
  );

  const createNewMotion = useCallback(
    (
      title: string,
      description: string,
      quorumType: 'SIMPLE_MAJORITY' | 'TWO_THIRDS' | 'ABSOLUTE_MAJORITY',
      immediateLaunch: boolean = true,
      durationSeconds: number = 300
    ): Motion | undefined => {
      if (!isSecretariaTecnica || !currentUser) {
        addAuditLog(
          'ACCION_DENEGADA',
          `${currentUser?.name || 'Usuario'} (Delegado/a) intentó crear una votación. Solo la Secretaría Técnica puede lanzar votaciones.`
        );
        return undefined;
      }
      if (immediateLaunch) {
        const activeM = motionsHistory.find((m) => m.status === 'VOTING');
        if (activeM) {
          addAuditLog(
            'ACCION_DENEGADA',
            `Imposible lanzar votación. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`
          );
          return undefined;
        }
      }
      const ordCount = motionsHistory.filter((m) => m.motionKind === 'MOCION_ORDINARIA').length + 1;
      const code = `MOC-ORD-${String(ordCount).padStart(3, '0')}`;
      const now = Date.now();
      const newMotion: Motion = {
        id: `moc-${now}`,
        code,
        motionKind: 'MOCION_ORDINARIA',
        title,
        description,
        proposedBy: `${currentUser.name} (Secretaría Técnica)`,
        status: immediateLaunch ? 'VOTING' : 'OPEN',
        quorumType,
        createdAt: now,
        startedAt: immediateLaunch ? now : undefined,
        durationSeconds: durationSeconds || 300,
        votes: {}
      };

      setMotionDocs((prev) => [newMotion, ...prev]);
      if (immediateLaunch) {
        prevOpenVotingIdRef.current = newMotion.id;
        setActiveMotionId(newMotion.id);
      }
      writeNewMotionToFirestore(newMotion);
      addAuditLog(
        'NUEVA_MOCION',
        `Nueva votación general lanzada por la Secretaría Técnica (${currentUser.name}): ${code} - "${title}"`
      );
      return newMotion;
    },
    [isSecretariaTecnica, currentUser, motionsHistory, addAuditLog, writeNewMotionToFirestore]
  );

  const isChapterMotionsEnabled = useCallback(
    (chapterId?: string): boolean => {
      if (!chapterId) {
        if (synthesisChapters.length === 0) return globalMotionsEnabled;
        return synthesisChapters.some((ch) =>
          typeof ch.motionsEnabled === 'boolean' ? ch.motionsEnabled : globalMotionsEnabled
        );
      }
      const chapter = synthesisChapters.find((ch) => ch.id === chapterId);
      if (!chapter) return globalMotionsEnabled;
      return typeof chapter.motionsEnabled === 'boolean' ? chapter.motionsEnabled : globalMotionsEnabled;
    },
    [synthesisChapters, globalMotionsEnabled]
  );

  const toggleGlobalMotionsEnabled = useCallback(
    (enabled: boolean) => {
      if (!isSecretariaTecnica || !currentUser) {
        addAuditLog(
          'ACCION_DENEGADA',
          'Solo la Secretaría Técnica puede habilitar o deshabilitar el ingreso de mociones.'
        );
        return;
      }
      const nextChapters = synthesisChapters.map((ch) => ({
        ...ch,
        motionsEnabled: enabled
      }));
      persistSynthesisChapters(nextChapters, enabled);
      addAuditLog(
        'CONTROL_MOCIONES_GENERAL',
        `${currentUser.name} (Secretaría Técnica) ${enabled ? 'HABILITÓ (ON)' : 'DESHABILITÓ (OFF)'} el ingreso de mociones de forma general para todos los capítulos.`
      );
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, persistSynthesisChapters, addAuditLog]
  );

  const toggleChapterMotionsEnabled = useCallback(
    (chapterId: string, enabled: boolean) => {
      if (!isSecretariaTecnica || !currentUser) {
        addAuditLog(
          'ACCION_DENEGADA',
          'Solo la Secretaría Técnica puede habilitar o deshabilitar el ingreso de mociones por capítulo.'
        );
        return;
      }
      const targetChapter = synthesisChapters.find((ch) => ch.id === chapterId);
      if (!targetChapter) return;
      const nextChapters = synthesisChapters.map((ch) =>
        ch.id === chapterId
          ? { ...ch, motionsEnabled: enabled }
          : { ...ch, motionsEnabled: typeof ch.motionsEnabled === 'boolean' ? ch.motionsEnabled : globalMotionsEnabled }
      );
      const anyEnabled = nextChapters.some((ch) => ch.motionsEnabled !== false);
      persistSynthesisChapters(nextChapters, anyEnabled);
      addAuditLog(
        'CONTROL_MOCIONES_CAPITULO',
        `${currentUser.name} (Secretaría Técnica) ${enabled ? 'HABILITÓ (ON)' : 'DESHABILITÓ (OFF)'} el ingreso de mociones para el Capítulo ${targetChapter.number}: "${targetChapter.title}".`
      );
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, globalMotionsEnabled, persistSynthesisChapters, addAuditLog]
  );

  const proposeExtensiveMotion = useCallback(
    (chapterId: string, paragraphId: string, proposedExtension: string, title?: string): Motion | undefined => {
      if (!currentUser || currentUser.role !== 'DELEGATE') {
        addAuditLog(
          'MOCION_RECHAZADA',
          'La Secretaría Técnica no tiene permitido presentar mociones. Esta facultad es privativa de las delegadas y delegados regionales.'
        );
        return undefined;
      }

      if (!isChapterMotionsEnabled(chapterId)) {
        addAuditLog(
          'MOCION_BLOQUEADA',
          `${currentUser.name} intentó presentar una moción extensiva en un capítulo con el ingreso de mociones deshabilitado (OFF) por Secretaría Técnica.`
        );
        return undefined;
      }

      const chapter = synthesisChapters.find((ch) => ch.id === chapterId);
      const paragraph = chapter?.paragraphs.find((p) => p.id === paragraphId);
      if (!paragraph) return undefined;

      const count = motionsHistory.filter((m) => m.motionKind === 'MOCION_EXTENSIVA').length + 1;
      const code = `MOC-EXT-${String(count).padStart(3, '0')}`;
      const now = Date.now();

      const newMotion: Motion = {
        id: `moc-ext-${now}`,
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
        createdAt: now,
        durationSeconds: 300,
        votes: {}
      };

      setMotionDocs((prev) => [newMotion, ...prev]);
      writeNewMotionToFirestore(newMotion);
      addAuditLog(
        'MOCION_PRESENTADA',
        `${currentUser.name} (${currentUser.region}) presentó la moción extensiva ${code} sobre el párrafo § ${paragraph.number}. Queda ingresada para aprobación de la Secretaría Técnica.`
      );
      return newMotion;
    },
    [synthesisChapters, motionsHistory, currentUser, isChapterMotionsEnabled, addAuditLog, writeNewMotionToFirestore]
  );

  const proposeSuppressiveMotion = useCallback(
    (chapterId: string, paragraphId: string, title?: string): Motion | undefined => {
      if (!currentUser || currentUser.role !== 'DELEGATE') {
        addAuditLog(
          'MOCION_RECHAZADA',
          'La Secretaría Técnica no tiene permitido presentar mociones. Esta facultad es privativa de las delegadas y delegados regionales.'
        );
        return undefined;
      }

      if (!isChapterMotionsEnabled(chapterId)) {
        addAuditLog(
          'MOCION_BLOQUEADA',
          `${currentUser.name} intentó presentar una moción supresiva en un capítulo con el ingreso de mociones deshabilitado (OFF) por Secretaría Técnica.`
        );
        return undefined;
      }

      const chapter = synthesisChapters.find((ch) => ch.id === chapterId);
      const paragraph = chapter?.paragraphs.find((p) => p.id === paragraphId);
      if (!paragraph) return undefined;

      const count = motionsHistory.filter((m) => m.motionKind === 'MOCION_SUPRESIVA').length + 1;
      const code = `MOC-SUP-${String(count).padStart(3, '0')}`;
      const now = Date.now();

      const newMotion: Motion = {
        id: `moc-sup-${now}`,
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
        createdAt: now,
        durationSeconds: 300,
        votes: {}
      };

      setMotionDocs((prev) => [newMotion, ...prev]);
      writeNewMotionToFirestore(newMotion);
      addAuditLog(
        'MOCION_PRESENTADA',
        `${currentUser.name} (${currentUser.region}) presentó la moción supresiva ${code} sobre el párrafo § ${paragraph.number}. Queda ingresada para aprobación de la Secretaría Técnica.`
      );
      return newMotion;
    },
    [synthesisChapters, motionsHistory, currentUser, isChapterMotionsEnabled, addAuditLog, writeNewMotionToFirestore]
  );

  const discardPresentedMotion = useCallback(
    (motionId: string) => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede descartar mociones presentadas.');
        return;
      }
      setMotionDocs((prev) => prev.filter((m) => m.id !== motionId));
      const batch = writeBatch(db);
      batch.delete(doc(db, 'motions', motionId));
      batch.commit().catch((err) => handleFirestoreError(err, OperationType.DELETE, `motions/${motionId}`));
      addAuditLog('MOCION_DESCARTADA', `La Secretaría Técnica (${currentUser?.name}) descartó la moción ${motionId}.`);
    },
    [isSecretariaTecnica, currentUser, addAuditLog]
  );

  const launchABCVote = useCallback(
    (
      title: string,
      description: string,
      optionA: { label: string; text: string; region: string },
      optionB: { label: string; text: string; region: string },
      optionC: { label: string; text: string; region: string },
      durationSeconds: number = 300
    ): Motion | undefined => {
      if (!isSecretariaTecnica) {
        addAuditLog(
          'ACCION_DENEGADA',
          'Los delegados no tienen permitido lanzar votaciones. Solo la Secretaría Técnica puede lanzar votaciones.'
        );
        return undefined;
      }
      const activeM = motionsHistory.find((m) => m.status === 'VOTING');
      if (activeM) {
        addAuditLog(
          'ACCION_DENEGADA',
          `Imposible lanzar votación A/B/C. Ya existe una votación abierta en sala (${activeM.code}). Por reglamento, solo puede haber una votación activa a la vez.`
        );
        return undefined;
      }

      const count = motionsHistory.filter((m) => m.motionKind === 'DISENSO_PRIMERA_VUELTA').length + 1;
      const code = `VOT-ABC-${String(count).padStart(3, '0')}`;
      const now = Date.now();
      const newMotion: Motion = {
        id: `moc-abc-${now}`,
        code,
        motionKind: 'DISENSO_PRIMERA_VUELTA',
        title,
        description:
          description ||
          `Votación entre 3 visiones reglamentarias: Opción A (${optionA.label}), Opción B (${optionB.label}) y Opción C (${optionC.label}). Quórum: Mayoría Absoluta (>50%). Si ninguna supera el 50%, pasan las dos primeras mayorías a balotaje de 2ª Vuelta.`,
        proposedBy: 'Secretaría Técnica FE-FA',
        dissensusOptions: { a: optionA, b: optionB, c: optionC },
        status: 'VOTING',
        quorumType: 'ABSOLUTE_MAJORITY',
        createdAt: now,
        startedAt: now,
        durationSeconds: durationSeconds || 300,
        votes: {}
      };

      prevOpenVotingIdRef.current = newMotion.id;
      setMotionDocs((prev) => [newMotion, ...prev]);
      setActiveMotionId(newMotion.id);
      writeNewMotionToFirestore(newMotion);
      addAuditLog('VOTACION_ABC_INICIADA', `Votación A/B/C iniciada: "${title}" (${code}) por la Secretaría Técnica`);
      return newMotion;
    },
    [isSecretariaTecnica, motionsHistory, addAuditLog, writeNewMotionToFirestore]
  );

  const launchDissensusRound1 = useCallback(
    (dissensusId: string): Motion | undefined => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede lanzar votaciones de disensos.');
        return undefined;
      }
      const activeM = motionsHistory.find((m) => m.status === 'VOTING');
      if (activeM) {
        addAuditLog(
          'ACCION_DENEGADA',
          `Imposible abrir votación de disenso. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`
        );
        return undefined;
      }

      let targetDis: DissensusItem | undefined = undefined;
      for (const ch of synthesisChapters) {
        const found = (ch.dissensusItems || []).find((d) => d.id === dissensusId);
        if (found) {
          targetDis = found;
          break;
        }
      }
      if (!targetDis) return undefined;

      const r1Count = motionsHistory.filter((m) => m.motionKind === 'DISENSO_PRIMERA_VUELTA').length + 1;
      const code = `DIS-${String(r1Count).padStart(2, '0')}-R1`;
      const now = Date.now();
      const newMotion: Motion = {
        id: `moc-dis-r1-${now}`,
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
        createdAt: now,
        startedAt: now,
        durationSeconds: 300,
        votes: {}
      };

      const nextChapters = synthesisChapters.map((ch) => ({
        ...ch,
        dissensusItems: (ch.dissensusItems || []).map((d) =>
          d.id === dissensusId ? { ...d, status: 'EN_VOTACION_R1' as const } : d
        )
      }));

      prevOpenVotingIdRef.current = newMotion.id;
      setMotionDocs((prev) => [newMotion, ...prev]);
      setActiveMotionId(newMotion.id);
      persistSynthesisChapters(nextChapters);
      writeNewMotionToFirestore(newMotion);
      addAuditLog('DISENSO_VOTACION_R1', `Iniciada Primera Vuelta de Disenso: ${targetDis.title}`);
      return newMotion;
    },
    [isSecretariaTecnica, synthesisChapters, motionsHistory, addAuditLog, persistSynthesisChapters, writeNewMotionToFirestore]
  );

  const passDissensusToRound2 = useCallback(
    (dissensusId: string, option1: 'A' | 'B' | 'C', option2: 'A' | 'B' | 'C'): Motion | undefined => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede lanzar la segunda vuelta.');
        return undefined;
      }
      const activeM = motionsHistory.find((m) => m.status === 'VOTING');
      if (activeM) {
        addAuditLog(
          'ACCION_DENEGADA',
          `Imposible lanzar 2ª vuelta. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`
        );
        return undefined;
      }

      let targetDis: DissensusItem | undefined = undefined;
      for (const ch of synthesisChapters) {
        const found = (ch.dissensusItems || []).find((d) => d.id === dissensusId);
        if (found) {
          targetDis = found;
          break;
        }
      }
      if (!targetDis) return undefined;

      const r2Count = motionsHistory.filter((m) => m.motionKind === 'DISENSO_SEGUNDA_VUELTA').length + 1;
      const code = `DIS-${String(r2Count).padStart(2, '0')}-R2`;
      const now = Date.now();
      const newMotion: Motion = {
        id: `moc-dis-r2-${now}`,
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
        createdAt: now,
        startedAt: now,
        durationSeconds: 300,
        votes: {}
      };

      const nextChapters = synthesisChapters.map((ch) => ({
        ...ch,
        dissensusItems: (ch.dissensusItems || []).map((d) =>
          d.id === dissensusId
            ? { ...d, status: 'EN_VOTACION_R2' as const, round2Runoff: [option1, option2] as ['A' | 'B' | 'C', 'A' | 'B' | 'C'] }
            : d
        )
      }));

      prevOpenVotingIdRef.current = newMotion.id;
      setMotionDocs((prev) => [newMotion, ...prev]);
      setActiveMotionId(newMotion.id);
      persistSynthesisChapters(nextChapters);
      writeNewMotionToFirestore(newMotion);
      addAuditLog('DISENSO_SEGUNDA_VUELTA', `Iniciada Segunda Vuelta entre Opción ${option1} y Opción ${option2}`);
      return newMotion;
    },
    [isSecretariaTecnica, synthesisChapters, motionsHistory, addAuditLog, persistSynthesisChapters, writeNewMotionToFirestore]
  );

  const launchGeneralPresynthesisVote = useCallback((): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede someter la Presíntesis en General a votación.');
      return undefined;
    }
    const activeM = motionsHistory.find((m) => m.status === 'VOTING');
    if (activeM) {
      addAuditLog(
        'ACCION_DENEGADA',
        `Imposible abrir votación general. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`
      );
      return undefined;
    }

    const now = Date.now();
    const newMotion: Motion = {
      id: `moc-presintesis-${now}`,
      code: 'VOT-GRAL-PRESINTESIS',
      motionKind: 'GENERAL_PRESINTESIS',
      title: 'Votación General de la Presíntesis Regional',
      description:
        'Aprobación en general del marco deliberativo y acuerdos emanados de las asambleas regionales del Frente Estudiantil. Se vota una sola vez al comenzar el debate. Quórum: Mayoría Simple (50% + 1).',
      proposedBy: 'Secretaría Técnica FE-FA',
      status: 'VOTING',
      quorumType: 'SIMPLE_MAJORITY',
      createdAt: now,
      startedAt: now,
      durationSeconds: 300,
      votes: {}
    };

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionDocs((prev) => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    writeNewMotionToFirestore(newMotion);
    addAuditLog(
      'VOTACION_GENERAL_PRESINTESIS',
      'Iniciada Votación General Única de la Presíntesis Regional (50%+1) por Secretaría Técnica'
    );
    return newMotion;
  }, [isSecretariaTecnica, motionsHistory, addAuditLog, writeNewMotionToFirestore]);

  const launchFinalSynthesisVote = useCallback((): Motion | undefined => {
    if (!isSecretariaTecnica) {
      addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede someter la Síntesis Final a votación general.');
      return undefined;
    }
    const activeM = motionsHistory.find((m) => m.status === 'VOTING');
    if (activeM) {
      addAuditLog(
        'ACCION_DENEGADA',
        `Imposible abrir votación de Síntesis Final. Ya existe una votación abierta en sala (${activeM.code}). Solo puede haber una votación activa a la vez.`
      );
      return undefined;
    }

    const now = Date.now();
    const newMotion: Motion = {
      id: `moc-sintesis-final-${now}`,
      code: 'VOT-FINAL-SINTESIS',
      motionKind: 'GENERAL_SINTESIS_FINAL',
      title: 'Votación General de la Síntesis Final del Plenario',
      description:
        'Aprobación solemne del texto definitivo consolidado con todas las mociones y disensos resueltos. Quórum: Mayoría Simple (50% + 1).',
      proposedBy: 'Secretaría Técnica FE-FA',
      status: 'VOTING',
      quorumType: 'SIMPLE_MAJORITY',
      createdAt: now,
      startedAt: now,
      durationSeconds: 300,
      votes: {}
    };

    prevOpenVotingIdRef.current = newMotion.id;
    setMotionDocs((prev) => [newMotion, ...prev]);
    setActiveMotionId(newMotion.id);
    writeNewMotionToFirestore(newMotion);
    addAuditLog('VOTACION_GENERAL_SINTESIS_FINAL', 'Iniciada Votación General Solemne de la Síntesis Final (50%+1)');
    return newMotion;
  }, [isSecretariaTecnica, motionsHistory, addAuditLog, writeNewMotionToFirestore]);

  // Presíntesis Builder Functions
  const addChapter = useCallback(
    (number: number, title: string) => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede crear nuevos capítulos en la Presíntesis.');
        return;
      }
      const defaultEnabled =
        synthesisChapters.length > 0 && synthesisChapters.every((ch) => ch.motionsEnabled === false)
          ? false
          : globalMotionsEnabled;
      const newChapter: SynthesisChapter = {
        id: `cap-${Date.now()}`,
        number,
        title: title.trim(),
        motionsEnabled: defaultEnabled,
        paragraphs: [],
        dissensusItems: [],
        lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
        lastModifiedAt: Date.now()
      };
      persistSynthesisChapters([...synthesisChapters, newChapter]);
      addAuditLog('CREACION_CAPITULO', `Secretaría Técnica agregó el Capítulo ${number}: "${title}"`);
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, globalMotionsEnabled, addAuditLog, persistSynthesisChapters]
  );

  const updateChapter = useCallback(
    (chapterId: string, number: number, title: string) => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede editar capítulos en la Presíntesis.');
        return;
      }
      const next = synthesisChapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              number,
              title: title.trim(),
              lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
              lastModifiedAt: Date.now()
            }
          : ch
      );
      persistSynthesisChapters(next);
      addAuditLog('EDICION_CAPITULO', `Secretaría Técnica actualizó el Capítulo ${number}: "${title.trim()}"`);
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  const deleteChapter = useCallback(
    (chapterId: string) => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede eliminar capítulos de la Presíntesis.');
        return;
      }
      const target = synthesisChapters.find((ch) => ch.id === chapterId);
      persistSynthesisChapters(synthesisChapters.filter((ch) => ch.id !== chapterId));
      addAuditLog(
        'ELIMINACION_CAPITULO',
        target
          ? `Secretaría Técnica eliminó el Capítulo ${target.number}: "${target.title}"`
          : `Secretaría Técnica eliminó el capítulo ${chapterId}`
      );
    },
    [isSecretariaTecnica, synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  const addParagraphToChapter = useCallback(
    (chapterId: string, number: string, text: string, title?: string) => {
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

      let next: SynthesisChapter[];
      if (synthesisChapters.length === 0) {
        const autoCapId = `cap-${Date.now()}`;
        next = [
          {
            id: autoCapId,
            number: 1,
            title: 'Acuerdos Base del Plenario',
            motionsEnabled: globalMotionsEnabled,
            paragraphs: [{ ...newPara, chapterId: autoCapId }],
            dissensusItems: [],
            lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
            lastModifiedAt: Date.now()
          }
        ];
      } else {
        const targetExists = synthesisChapters.some((ch) => ch.id === chapterId);
        const targetId = targetExists ? chapterId : synthesisChapters[0].id;
        next = synthesisChapters.map((ch) =>
          ch.id === targetId
            ? {
                ...ch,
                paragraphs: [...(ch.paragraphs || []), { ...newPara, chapterId: targetId }],
                lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
                lastModifiedAt: Date.now()
              }
            : ch
        );
      }

      persistSynthesisChapters(next);
      addAuditLog('ALTA_PARRAFO_PRESINTESIS', `Secretaría Técnica agregó el párrafo § ${number} al capítulo ${chapterId}`);
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  const updateParagraphInChapter = useCallback(
    (chapterId: string, paragraphId: string, text: string, title?: string) => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede editar párrafos de la Presíntesis.');
        return;
      }
      const next = synthesisChapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              paragraphs: (ch.paragraphs || []).map((p) =>
                p.id === paragraphId
                  ? {
                      ...p,
                      originalText: text.trim(),
                      title: title !== undefined ? title.trim() : p.title
                    }
                  : p
              ),
              lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
              lastModifiedAt: Date.now()
            }
          : ch
      );
      persistSynthesisChapters(next);
      addAuditLog('EDICION_PARRAFO_PRESINTESIS', `Secretaría Técnica editó el párrafo ${paragraphId}`);
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  const deleteParagraphFromChapter = useCallback(
    (chapterId: string, paragraphId: string) => {
      if (!isSecretariaTecnica) {
        addAuditLog('ACCION_DENEGADA', 'Solo la Secretaría Técnica puede eliminar párrafos de la Presíntesis.');
        return;
      }
      const next = synthesisChapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              paragraphs: (ch.paragraphs || []).filter((p) => p.id !== paragraphId),
              lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
              lastModifiedAt: Date.now()
            }
          : ch
      );
      persistSynthesisChapters(next);
      addAuditLog('ELIMINACION_PARRAFO_PRESINTESIS', `Secretaría Técnica eliminó el párrafo ${paragraphId}`);
    },
    [isSecretariaTecnica, currentUser, synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  const updateParagraphText = useCallback(
    (chapterId: string, paragraphId: string, newText: string) => {
      updateParagraphInChapter(chapterId, paragraphId, newText);
    },
    [updateParagraphInChapter]
  );

  // Gestión de Disensos Tripartitos (A, B, C)
  const addDissensusItem = useCallback(
    (chapterId: string, dissensus: Omit<DissensusItem, 'id' | 'status'>): DissensusItem => {
      const newId = `dis-${Date.now()}`;
      let resolvedChapterId = chapterId;
      let next: SynthesisChapter[];

      if (synthesisChapters.length === 0) {
        const autoCapId = `cap-${Date.now()}`;
        resolvedChapterId = autoCapId;
        next = [
          {
            id: autoCapId,
            number: 1,
            title: 'Acuerdos y Disensos del Plenario',
            motionsEnabled: globalMotionsEnabled,
            paragraphs: [],
            dissensusItems: [{ ...dissensus, chapterId: autoCapId, id: newId, status: 'PENDIENTE' }],
            lastModifiedBy: currentUser?.name || 'Secretaría Técnica',
            lastModifiedAt: Date.now()
          }
        ];
      } else {
        const targetExists = synthesisChapters.some((ch) => ch.id === chapterId);
        const targetId = targetExists ? chapterId : synthesisChapters[0].id;
        resolvedChapterId = targetId;
        next = synthesisChapters.map((ch) =>
          ch.id === targetId
            ? {
                ...ch,
                dissensusItems: [
                  ...(ch.dissensusItems || []),
                  { ...dissensus, chapterId: targetId, id: newId, status: 'PENDIENTE' as const }
                ],
                lastModifiedAt: Date.now()
              }
            : ch
        );
      }

      persistSynthesisChapters(next);
      addAuditLog(
        'NUEVO_DISENSO',
        `Secretaría Técnica registró el disenso "${dissensus.title}" para deliberación tripartita (A, B y C).`
      );
      return { ...dissensus, chapterId: resolvedChapterId, id: newId, status: 'PENDIENTE' };
    },
    [synthesisChapters, currentUser, addAuditLog, persistSynthesisChapters]
  );

  const updateDissensusItem = useCallback(
    (dissensusId: string, updates: Partial<DissensusItem>) => {
      const next = synthesisChapters.map((ch) => ({
        ...ch,
        dissensusItems: (ch.dissensusItems || []).map((d) => (d.id === dissensusId ? { ...d, ...updates } : d)),
        lastModifiedAt: Date.now()
      }));
      persistSynthesisChapters(next);
      addAuditLog('EDICION_DISENSO', `Secretaría Técnica actualizó el disenso ${dissensusId}.`);
    },
    [synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  const deleteDissensusItem = useCallback(
    (dissensusId: string) => {
      const next = synthesisChapters.map((ch) => ({
        ...ch,
        dissensusItems: (ch.dissensusItems || []).filter((d) => d.id !== dissensusId),
        lastModifiedAt: Date.now()
      }));
      persistSynthesisChapters(next);
      addAuditLog('ELIMINACION_DISENSO', `Secretaría Técnica eliminó el disenso ${dissensusId}.`);
    },
    [synthesisChapters, addAuditLog, persistSynthesisChapters]
  );

  // Exportación oficial en PDF de la Síntesis Nacional Final
  const exportFinalSynthesisPDF = useCallback(() => {
    const pdfDoc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const drawPageHeader = () => {
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(100, 116, 139);
      pdfDoc.text('PLENARIO NACIONAL FRENTE ESTUDIANTIL · DOCUMENTO OFICIAL VINCULANTE', margin, 12);
      pdfDoc.setDrawColor(226, 232, 240);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.line(margin, 14, pageWidth - margin, 14);
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        pdfDoc.addPage();
        y = 18;
        drawPageHeader();
      }
    };

    const drawPageFooter = (pageNum: number, totalPages: number) => {
      pdfDoc.setDrawColor(226, 232, 240);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(148, 163, 184);
      pdfDoc.text('Fe Pública y Custodia: Secretaría Técnica Nacional FE-FA', margin, pageHeight - 9);
      pdfDoc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    };

    pdfDoc.setFillColor(74, 21, 75);
    pdfDoc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setFontSize(13);
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.text('SÍNTESIS NACIONAL FINAL CONSOLIDADA', margin + 6, y + 10);

    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(9);
    pdfDoc.setTextColor(243, 232, 255);
    pdfDoc.text('Plenario Nacional Frente Estudiantil · Frente Amplio Chile', margin + 6, y + 16);
    pdfDoc.setFontSize(8);
    pdfDoc.setTextColor(216, 180, 254);
    pdfDoc.text('Resoluciones Soberanas, Mociones Reglamentarias y Articulado Promulgado', margin + 6, y + 21);

    y += 32;

    pdfDoc.setFillColor(248, 250, 252);
    pdfDoc.setDrawColor(203, 213, 225);
    pdfDoc.setLineWidth(0.4);
    pdfDoc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    const dateStr = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });

    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setFontSize(8.5);
    pdfDoc.setTextColor(15, 23, 42);
    pdfDoc.text(`Fecha de Emisión Oficial: ${dateStr} a las ${timeStr} hrs`, margin + 4, y + 7);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setTextColor(71, 85, 105);
    pdfDoc.text('Fe Pública: Secretaría Técnica Nacional (Mesa Directiva del Plenario)', margin + 4, y + 13);
    pdfDoc.text(`Acreditación: ${delegates.length} delegadas/os regionales con derecho a voz y voto`, margin + 4, y + 19);

    y += 30;

    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setFontSize(10);
    pdfDoc.setTextColor(74, 21, 75);
    pdfDoc.text('PREÁMBULO POLÍTICO Y METODOLOGÍA SOBERANA', margin, y);
    y += 5;

    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(8.5);
    pdfDoc.setTextColor(51, 65, 85);
    const preambulo =
      'El presente documento consolida la voluntad democrática y vinculante del Plenario Nacional del Frente Estudiantil. Reúne los acuerdos aprobados en la Presíntesis Regional, las ampliaciones promulgadas mediante mociones extensivas (50%+1), la exclusión de párrafos derogados mediante mociones supresivas (2/3) y los acuerdos emanados del sufragio en disensos de opciones A, B y C.';
    const preambuloLines = pdfDoc.splitTextToSize(preambulo, contentWidth);
    pdfDoc.text(preambuloLines, margin, y);
    y += preambuloLines.length * 4.2 + 6;

    synthesisChapters.forEach((chapter) => {
      checkPageBreak(30);

      pdfDoc.setFillColor(241, 245, 249);
      pdfDoc.setDrawColor(74, 21, 75);
      pdfDoc.setLineWidth(0.8);
      pdfDoc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'FD');

      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setFontSize(9.5);
      pdfDoc.setTextColor(74, 21, 75);
      pdfDoc.text(`CAPÍTULO ${chapter.number}: ${chapter.title.toUpperCase()}`, margin + 4, y + 6);
      y += 14;

      const activeParagraphs = (chapter.paragraphs || []).filter((p) => p.status !== 'SUPRIMIDO');
      const suppressedParagraphs = (chapter.paragraphs || []).filter((p) => p.status === 'SUPRIMIDO');
      const resolvedDissensus = (chapter.dissensusItems || []).filter((d) => d.status === 'RESUELTO');

      if (activeParagraphs.length === 0) {
        pdfDoc.setFont('helvetica', 'italic');
        pdfDoc.setFontSize(8.5);
        pdfDoc.setTextColor(148, 163, 184);
        pdfDoc.text('(Sin párrafos activos en este capítulo)', margin + 4, y);
        y += 6;
      } else {
        activeParagraphs.forEach((p) => {
          const paraHeader = `§ ${p.number}${p.title ? ` — ${p.title}` : ''}`;
          const isExtended = p.status === 'EXTENDIDO' && !!p.extensionText;

          const textLines = pdfDoc.splitTextToSize(`"${p.originalText}"`, contentWidth - 6);
          let extraHeight = textLines.length * 4 + 8;
          if (isExtended) extraHeight += 16;
          checkPageBreak(extraHeight);

          pdfDoc.setFont('helvetica', 'bold');
          pdfDoc.setFontSize(9);
          pdfDoc.setTextColor(15, 23, 42);
          pdfDoc.text(paraHeader, margin, y);
          y += 4.5;

          pdfDoc.setFont('helvetica', 'normal');
          pdfDoc.setFontSize(8.5);
          pdfDoc.setTextColor(51, 65, 85);
          pdfDoc.text(textLines, margin + 4, y);
          y += textLines.length * 4 + 2;

          if (isExtended) {
            pdfDoc.setFillColor(250, 245, 255);
            pdfDoc.setDrawColor(192, 132, 252);
            pdfDoc.setLineWidth(0.4);
            const extLines = pdfDoc.splitTextToSize(
              `+ Redacción Extensiva Aprobada (${p.appliedMotionCode || '50%+1'}): "${p.extensionText}"`,
              contentWidth - 10
            );
            const boxH = extLines.length * 3.8 + 5;
            pdfDoc.roundedRect(margin + 4, y, contentWidth - 4, boxH, 1.5, 1.5, 'FD');

            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.setFontSize(8);
            pdfDoc.setTextColor(74, 21, 75);
            pdfDoc.text(extLines, margin + 7, y + 4);
            y += boxH + 3;
          }
          y += 2;
        });
      }

      if (suppressedParagraphs.length > 0) {
        checkPageBreak(15 + suppressedParagraphs.length * 5);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.setFontSize(8.5);
        pdfDoc.setTextColor(185, 28, 28);
        pdfDoc.text('PÁRRAFOS SUPRIMIDOS POR EL PLENARIO (Quórum 2/3):', margin, y);
        y += 4.5;

        suppressedParagraphs.forEach((p) => {
          pdfDoc.setFont('helvetica', 'normal');
          pdfDoc.setFontSize(8);
          pdfDoc.setTextColor(153, 27, 27);
          pdfDoc.text(
            `• [✕] Párrafo § ${p.number} — Suprimido por 2/3 de votos en sala (${p.appliedMotionCode || 'Moción Supresiva'}).`,
            margin + 4,
            y
          );
          y += 4;
        });
        y += 3;
      }

      if (resolvedDissensus.length > 0) {
        checkPageBreak(15 + resolvedDissensus.length * 10);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.setFontSize(8.5);
        pdfDoc.setTextColor(5, 150, 105);
        pdfDoc.text('RESOLUCIONES DE DISENSOS (Opciones A/B/C):', margin, y);
        y += 4.5;

        resolvedDissensus.forEach((dis) => {
          const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;
          pdfDoc.setFont('helvetica', 'bold');
          pdfDoc.setFontSize(8);
          pdfDoc.setTextColor(4, 120, 87);
          pdfDoc.text(`• ${dis.title} -> Aprobada Opción ${dis.winner} (${winObj?.label || 'Visión Ganadora'})`, margin + 4, y);
          y += 3.8;
          if (winObj?.text) {
            pdfDoc.setFont('helvetica', 'normal');
            pdfDoc.setTextColor(51, 65, 85);
            const winLines = pdfDoc.splitTextToSize(`"${winObj.text}"`, contentWidth - 10);
            pdfDoc.text(winLines, margin + 8, y);
            y += winLines.length * 3.8 + 2;
          }
        });
        y += 3;
      }

      y += 5;
    });

    checkPageBreak(35);
    pdfDoc.setDrawColor(203, 213, 225);
    pdfDoc.setLineWidth(0.4);
    pdfDoc.line(margin, y, pageWidth - margin, y);
    y += 8;

    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setFontSize(9);
    pdfDoc.setTextColor(74, 21, 75);
    pdfDoc.text('CERTIFICACIÓN Y FE PÚBLICA OFICIAL', margin, y);
    y += 4.5;

    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setFontSize(8);
    pdfDoc.setTextColor(71, 85, 105);
    pdfDoc.text(
      'Documento formalizado y ratificado por la Secretaría Técnica del Plenario Nacional del Frente Estudiantil.',
      margin,
      y
    );
    pdfDoc.text('Frente Amplio Chile · Santiago de Chile, 2026.', margin, y + 4);

    const totalPages = pdfDoc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdfDoc.setPage(i);
      drawPageFooter(i, totalPages);
    }

    pdfDoc.save(`Sintesis_Nacional_Final_FE-FA_${new Date().toISOString().slice(0, 10)}.pdf`);
    addAuditLog(
      'EXPORTACION_PDF_SINTESIS',
      `Documento oficial de Síntesis Nacional Final exportado en PDF por ${currentUser?.name || 'Secretaría Técnica'}`
    );
  }, [synthesisChapters, delegates.length, currentUser, addAuditLog]);

  const downloadFinalSynthesisDocument = useCallback(() => {
    exportFinalSynthesisPDF();
  }, [exportFinalSynthesisPDF]);

  // CSV Ingestion for Padron (nombre,usuario,region,rol)
  const importDelegatesCSV = useCallback(
    async (csvText: string): Promise<{ success: boolean; count: number; error?: string }> => {
      if (!currentUser || currentUser.role !== 'SECRETARY') {
        return { success: false, count: 0, error: 'Solo Secretaría Técnica puede cargar el padrón.' };
      }
      try {
        const lines = csvText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) return { success: false, count: 0, error: 'El archivo está vacío o no contiene filas' };

        const parsed: Delegate[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 3) {
            const name = parts[0];
            const usernameRaw = parts[1];
            const region = parts[2];
            // Support 4 columns (nombre,usuario,region,rol) or 5 columns (ignoring legacy gender col)
            const roleStr = parts.length >= 5 ? parts[4] : parts[3];
            const cleanUsername = normalizeUsername(usernameRaw || '');
            if (!isValidUsername(cleanUsername)) continue;
            parsed.push({
              id: `del-csv-${Date.now()}-${i}`,
              name: name || `Delegado/a ${i}`,
              username: cleanUsername,
              region: (region as ChileanRegion) || 'Metropolitana',
              role: (roleStr as UserRole) === 'SECRETARY' ? 'SECRETARY' : 'DELEGATE',
              isOnline: false,
              hasSpokenInCurrentMotion: false
            });
          }
        }

        if (parsed.length > 0) {
          const existingMap = new Map<string, Delegate>();
          for (const d of delegates) {
            const key = normalizeUsername(d.username);
            if (key) existingMap.set(key, d);
          }

          const snaps = await Promise.all(
            parsed.map((p) => getDoc(doc(db, 'accredited_users', normalizeUsername(p.username))))
          );

          const actorUsernameLower = normalizeUsername(currentUser.username);
          const batch = writeBatch(db);
          parsed.forEach((p, idx) => {
            const usernameLower = normalizeUsername(p.username);
            const existsInDb = snaps[idx]?.exists();
            if (existsInDb) {
              const prevData = snaps[idx].data() as Partial<Delegate>;
              const mergedEntry: Delegate = {
                ...p,
                id: prevData.id || p.id,
                accessKey: prevData.accessKey,
                isOnline: Boolean(prevData.isOnline),
                hasSpokenInCurrentMotion: Boolean(prevData.hasSpokenInCurrentMotion)
              };
              existingMap.set(usernameLower, mergedEntry);
              batch.update(
                doc(db, 'accredited_users', usernameLower),
                stripUndefinedDeep({
                  id: mergedEntry.id,
                  name: mergedEntry.name.slice(0, 160),
                  username: usernameLower,
                  region: mergedEntry.region,
                  role: mergedEntry.role,
                  actorUsernameLower,
                  updatedAt: serverTimestamp()
                })
              );
            } else {
              existingMap.set(usernameLower, p);
              batch.set(
                doc(db, 'accredited_users', usernameLower),
                stripUndefinedDeep({
                  id: p.id,
                  name: p.name.slice(0, 160),
                  username: usernameLower,
                  usernameLower,
                  region: p.region,
                  role: p.role,
                  isOnline: false,
                  hasSpokenInCurrentMotion: false,
                  actorUsernameLower,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                })
              );
            }
          });

          const nextList = Array.from(existingMap.values());
          batch.set(doc(db, 'plenario_rooms', 'roster'), {
            kind: 'roster',
            delegatesPublic: nextList.map(toPublicRosterEntry),
            updatedByUid: currentUser.id,
            updatedByUsernameLower: actorUsernameLower,
            updatedAt: serverTimestamp()
          });
          await batch.commit();

          setAdminDelegates(nextList);
          setRosterDelegates(nextList);

          addAuditLog('CARGA_MASIVA_CSV', `Carga exitosa de ${parsed.length} delegadas/os al padrón oficial`);
          return { success: true, count: parsed.length };
        }
        return {
          success: false,
          count: 0,
          error: 'Formato CSV no reconocido o nombres de usuario inválidos. Columnas requeridas: Nombre, Usuario, Región, Rol'
        };
      } catch (e: any) {
        return { success: false, count: 0, error: e.message || 'Error procesando archivo CSV' };
      }
    },
    [currentUser, delegates, addAuditLog]
  );

  const exportPadronCSV = useCallback(() => {
    const headers = ['ID,Nombre,Usuario,Región,Rol,Estado'];
    const rows = delegates.map(
      (d) => `"${d.id}","${d.name}","${d.username}","${d.region}","${d.role}","${d.isOnline ? 'Online' : 'Offline'}"`
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
    motionsHistory.forEach((m) => {
      Object.values(m.votes).forEach((v) => {
        rows.push(
          `"${m.code} - ${m.title.replace(/"/g, '""')}","${v.delegateName}","${v.region}","${v.vote}","${new Date(v.timestamp).toISOString()}","${v.digitalSignatureHash}"`
        );
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

  const resetToCleanLaunch = useCallback(() => {
    if (!isSecretariaTecnica || !currentUser) return;
    prevOpenVotingIdRef.current = null;
    setActiveMotionId('');
    persistSynthesisChapters([]);
    persistActas([]);

    (async () => {
      try {
        const batch = writeBatch(db);
        const mSnap = await getDocs(query(collection(db, 'motions'), where('roomId', '==', 'main')));
        mSnap.docs.forEach((d) => batch.delete(d.ref));
        const vSnap = await getDocs(query(collection(db, 'votes'), where('roomId', '==', 'main')));
        vSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.set(doc(db, 'plenario_rooms', 'order_motions'), {
          kind: 'order_motions',
          items: [],
          updatedByUid: currentUser.id,
          updatedByUsernameLower: normalizeUsername(currentUser.username),
          updatedAt: serverTimestamp()
        });
        await batch.commit();
        addAuditLog('REINICIO_LIMPIO', 'Plenario restablecido en limpio por la Secretaría Técnica.');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reset_clean_launch');
      }
    })();
  }, [isSecretariaTecnica, currentUser, persistSynthesisChapters, persistActas, addAuditLog]);

  const resetAllData = useCallback(() => {
    resetToCleanLaunch();
  }, [resetToCleanLaunch]);

  const loadDemoTemplate = useCallback(() => {
    if (!isSecretariaTecnica) return;
    persistSynthesisChapters(DEMO_TEMPLATE.chapters);
    addAuditLog('CARGA_PLANTILLA', 'Plantilla de capítulos cargada por Secretaría Técnica.');
  }, [isSecretariaTecnica, persistSynthesisChapters, addAuditLog]);

  const saveToInternalStorage = useCallback(async () => true, []);
  const uploadFileToInternalStorage = useCallback(async () => ({ success: false, error: 'No requerido en modo nube.' }), []);
  const listInternalFiles = useCallback(async () => [], []);

  return (
    <PlenarioContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        authReady,
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
        theme,
        setTheme,
        toggleTheme,
        synthesisChapters,
        globalMotionsEnabled,
        isChapterMotionsEnabled,
        toggleGlobalMotionsEnabled,
        toggleChapterMotionsEnabled,
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
        checkUsernameAccess,
        loginWithCredentials,
        setupFirstTimeAccessKey,
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
      }}
    >
      {children}
    </PlenarioContext.Provider>
  );
};

export const usePlenario = () => {
  const context = useContext(PlenarioContext);
  if (!context) throw new Error('usePlenario must be used within a PlenarioProvider');
  return context;
};
