export type UserRole = 'DELEGATE' | 'SECRETARY';

export type GenderIdentity = 'Femenino' | 'Masculino' | 'No-binario';

export type ChileanRegion = 
  | 'Arica y Parinacota'
  | 'Tarapacá'
  | 'Antofagasta'
  | 'Atacama'
  | 'Coquimbo'
  | 'Valparaíso'
  | 'Metropolitana'
  | "O'Higgins"
  | 'Maule'
  | 'Ñuble'
  | 'Biobío'
  | 'Araucanía'
  | 'Los Ríos'
  | 'Los Lagos'
  | 'Aysén'
  | 'Magallanes';

export type VoteOption = 
  | 'A_FAVOR' 
  | 'EN_CONTRA' 
  | 'ABSTENCION'
  | 'OPCION_A'
  | 'OPCION_B'
  | 'OPCION_C';

export interface Delegate {
  id: string;
  name: string;
  email: string;
  region: ChileanRegion;
  gender: GenderIdentity;
  role: UserRole;
  organization?: string;
  avatarUrl?: string;
  isOnline: boolean;
  hasSpokenInCurrentMotion: boolean;
  lastSessionId?: string;
  ipAddress?: string;
}

export interface SpeakerQueueItem {
  id: string;
  delegateId: string;
  delegateName: string;
  region: ChileanRegion;
  gender: GenderIdentity;
  organization?: string;
  topic?: string;
  requestedAt?: number;
  joinedAt?: number;
  priorityScore: number;
  status?: 'WAITING' | 'SPEAKING' | 'FINISHED' | 'EXPIRED' | 'COMPLETED';
  timeAllocatedSeconds?: number;
}

export interface MotionVote {
  delegateId: string;
  delegateName: string;
  region: ChileanRegion;
  vote: VoteOption;
  timestamp: number;
  digitalSignatureHash: string;
  notes?: string;
}

export type MotionStatus = 
  | 'DRAFT' 
  | 'OPEN' 
  | 'VOTING' 
  | 'CLOSED' 
  | 'APPROVED' 
  | 'REJECTED'
  | 'PASSED_TO_RUNOFF';

export type QuorumType = 'SIMPLE_MAJORITY' | 'TWO_THIRDS' | 'ABSOLUTE_MAJORITY';

export type MotionKind = 
  | 'MOCION_EXTENSIVA'         // Quórum: 50% + 1 (extiende un párrafo de la presíntesis)
  | 'MOCION_SUPRESIVA'         // Quórum: 2/3 (elimina un párrafo de la presíntesis)
  | 'DISENSO_PRIMERA_VUELTA'   // Quórum: Mayoría Absoluta (>50% de A, B, C); si no, pasan las 2 primeras mayorías a 2ª vuelta
  | 'DISENSO_SEGUNDA_VUELTA'   // Quórum: 50% + 1 entre las 2 opciones clasificadas
  | 'GENERAL_PRESINTESIS'      // Quórum: 50% + 1 (Aprobación general de la Presíntesis regional)
  | 'GENERAL_SINTESIS_FINAL';  // Quórum: 50% + 1 (Aprobación solemne del texto definitivo consolidado)

export interface Motion {
  id: string;
  code: string; // e.g. "MOC-EXT-001", "MOC-SUP-002", "DIS-101-R1"
  motionKind: MotionKind;
  title: string;
  description: string;
  proposedBy: string; // Delegate or Region
  status: MotionStatus;
  quorumType: QuorumType;
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
  durationSeconds: number;
  
  // Enlace a párrafo de la Presíntesis
  targetParagraphId?: string;
  targetParagraphNumber?: string;
  originalParagraphText?: string;
  proposedExtensionText?: string;
  proposedEditedText?: string;
  
  // Enlace a Disenso A, B, C
  dissensusId?: string;
  dissensusOptions?: {
    a: { title?: string; label?: string; text: string; region?: string; originRegion?: string };
    b: { title?: string; label?: string; text: string; region?: string; originRegion?: string };
    c: { title?: string; label?: string; text: string; region?: string; originRegion?: string };
  };
  runoffOptions?: ['A' | 'B' | 'C', 'A' | 'B' | 'C'];
  
  votes: Record<string, MotionVote>;
  resultSummary?: {
    totalEligible: number;
    totalCast: number;
    aFavor: number;
    enContra: number;
    abstencion: number;
    opcionA?: number;
    opcionB?: number;
    opcionC?: number;
    percentageFavor?: number;
    percentageA?: number;
    percentageB?: number;
    percentageC?: number;
    quorumMet: boolean;
    isApproved: boolean;
    winner?: 'A' | 'B' | 'C' | 'A_FAVOR' | 'EN_CONTRA';
    needsRunoff?: boolean;
    runoffOptions?: ['A' | 'B' | 'C', 'A' | 'B' | 'C'];
  };
}

// Estructura de Párrafo de la Presíntesis Nacional
export interface PresynthesisParagraph {
  id: string; // e.g. "par-1-1"
  chapterId: string;
  number: string; // e.g. "1.1", "1.2"
  title?: string;
  originalText: string;
  status: 'ACTIVO' | 'SUPRIMIDO' | 'EXTENDIDO';
  extensionText?: string;
  modifiedText?: string;
  appliedMotionCode?: string;
  appliedMotionId?: string;
}

// Estructura de Disenso con las 3 Visiones Reglamentarias:
// A: Visión uno | B: Visión dos | C: Visión de consenso
export interface DissensusItem {
  id: string; // e.g. "dis-01"
  chapterId: string;
  title: string;
  context: string;
  optionA: {
    label: string; // "Visión Uno"
    text: string;
    originRegion: string;
  };
  optionB: {
    label: string; // "Visión Dos"
    text: string;
    originRegion: string;
  };
  optionC: {
    label: string; // "Visión de Consenso"
    text: string;
    originRegion: string;
  };
  status: 'PENDIENTE' | 'EN_VOTACION_R1' | 'EN_VOTACION_R2' | 'RESUELTO';
  winner?: 'A' | 'B' | 'C';
  round1Votes?: { a: number; b: number; c: number; abs: number };
  round2Runoff?: ['A' | 'B' | 'C', 'A' | 'B' | 'C'];
  round2Votes?: { opt1: number; opt2: number; abs: number };
}

export interface SynthesisChapter {
  id: string;
  number: number;
  title: string;
  paragraphs: PresynthesisParagraph[];
  dissensusItems: DissensusItem[];
  lastModifiedBy: string;
  lastModifiedAt: number;
}

export type OrderMotionCategory = 
  | 'MOCION_ORDEN' 
  | 'PUNTO_INFORMACION' 
  | 'CUESTION_PREVIA' 
  | 'MOCION_CENSURA' 
  | 'MESA_AYUDA';

export interface OrderMotion {
  id: string;
  delegateId: string;
  delegateName: string;
  region: ChileanRegion;
  category: OrderMotionCategory;
  message: string;
  timestamp: number;
  status: 'PENDIENTE' | 'ATENDIDA' | 'DESESTIMADA';
  resolvedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  isoTime: string;
  delegateId: string;
  delegateName: string;
  ipAddress: string;
  action: string;
  details: string;
  integrityHash: string;
}

export type ActaStatus = 'BORRADOR' | 'EN_REVISION' | 'CERTIFICADA';

export interface ActaSignature {
  signerName: string;
  role: string;
  timestamp: number;
  token: string;
  status: 'FIRMADO' | 'PENDIENTE';
}

export interface Acta {
  id: string;
  code: string; // e.g. "ACTA-2026-001"
  sessionTitle: string;
  sessionType: 'ORDINARIA' | 'EXTRAORDINARIA' | 'CONSTITUTIVA';
  date: string;
  timeStart: string;
  timeEnd?: string;
  location: string;
  quorumInstallationText: string;
  accreditedDelegatesCount: number;
  agendaTopics: string[];
  bodyContent: string;
  conclusions: string[];
  votedMotionIds: string[];
  status: ActaStatus;
  digitalSignatures: ActaSignature[];
  integrityHash: string;
  lastModifiedAt: number;
  lastModifiedBy: string;
}
