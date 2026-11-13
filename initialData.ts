import { Delegate, Motion, SynthesisChapter, OrderMotion, AuditLogEntry, Acta } from '../types/plenario';

/**
 * DATOS INICIALES EN LIMPIO PARA LANZAMIENTO OFICIAL
 * Los archivos tipo (votaciones, párrafos y usuarios simulados) han sido eliminados
 * para que el plenario comience desde cero y se configure según las necesidades del evento.
 */

export const INITIAL_DELEGATES: Delegate[] = [
  {
    id: 'sec-01',
    name: 'Secretaría Técnica FE-FA',
    email: 'secretaria@juventudes.cl',
    region: 'Metropolitana',
    gender: 'No-binario',
    role: 'SECRETARY',
    organization: 'Secretaría Técnica Nacional',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    hasSpokenInCurrentMotion: false,
    ipAddress: '127.0.0.1',
  },
  {
    id: 'sec-pablo',
    name: 'Pablo Rodríguez',
    email: 'pablo.rodriguez.g@ug.uchile.cl',
    region: 'Metropolitana',
    gender: 'Masculino',
    role: 'SECRETARY',
    organization: 'Secretaría Técnica / Mesa de Sala',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    hasSpokenInCurrentMotion: false,
    ipAddress: '127.0.0.1',
  }
];

// 0 votaciones simuladas: listo para que la Secretaría Técnica cree o abra la primera votación
export const INITIAL_MOTIONS: Motion[] = [];

// 0 capítulos simulados: listo para cargar la Presíntesis oficial
export const INITIAL_SYNTHESIS_CHAPTERS: SynthesisChapter[] = [];

// 0 mociones de orden simuladas
export const INITIAL_ORDER_MOTIONS: OrderMotion[] = [];

// Registro inicial de auditoría de fe pública
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-init-001',
    timestamp: Date.now(),
    isoTime: new Date().toISOString(),
    delegateId: 'sec-01',
    delegateName: 'Secretaría Técnica FE-FA',
    ipAddress: '127.0.0.1',
    action: 'SISTEMA_INICIALIZADO',
    details: 'Plataforma oficial del Plenario Nacional inicializada en limpio. Archivos tipo eliminados y almacenamiento persistente interno activo.',
    integrityHash: '8e2b71940a02ef4c9902sha256'
  }
];

// 0 actas simuladas
export const INITIAL_ACTAS: Acta[] = [];

/**
 * PLANTILLA DE DEMOSTRACIÓN (OPCIONAL)
 * Permite a la Secretaría Técnica cargar una estructura de prueba si desea hacer un ensayo previo al plenario
 */
export const DEMO_TEMPLATE = {
  delegates: [
    {
      id: 'sec-01',
      name: 'Secretaría Técnica FE-FA',
      email: 'secretaria@juventudes.cl',
      region: 'Metropolitana',
      gender: 'No-binario',
      role: 'SECRETARY',
      organization: 'Secretaría Técnica Nacional',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
      hasSpokenInCurrentMotion: false
    },
    {
      id: 'del-demo-1',
      name: 'Sofía Carvajal',
      email: 'sofia.carvajal@fe-fa.cl',
      region: 'Antofagasta',
      gender: 'Femenino',
      role: 'DELEGATE',
      organization: 'Federación U. de Antofagasta',
      isOnline: true,
      hasSpokenInCurrentMotion: false
    },
    {
      id: 'del-demo-2',
      name: 'Joaquín Navarrete',
      email: 'joaquin.navarrete@fe-fa.cl',
      region: 'Araucanía',
      gender: 'Masculino',
      role: 'DELEGATE',
      organization: 'Federación UFRO',
      isOnline: true,
      hasSpokenInCurrentMotion: false
    },
    {
      id: 'del-demo-3',
      name: 'Alex Cárdenas',
      email: 'alex.cardenas@fe-fa.cl',
      region: 'Los Ríos',
      gender: 'Masculino',
      role: 'DELEGATE',
      organization: 'Federación UACh',
      isOnline: true,
      hasSpokenInCurrentMotion: false
    },
    {
      id: 'del-demo-4',
      name: 'Sam Oyarzún',
      email: 'sam.oyarzun@fe-fa.cl',
      region: 'Metropolitana',
      gender: 'No-binario',
      role: 'DELEGATE',
      organization: 'FECh',
      isOnline: true,
      hasSpokenInCurrentMotion: false
    }
  ] as Delegate[],
  chapters: [
    {
      id: 'chap-demo-1',
      number: 1,
      title: 'Caracterización del Movimiento Estudiantil 2026 y Coyuntura Nacional',
      paragraphs: [
        {
          id: 'par-1-1',
          chapterId: 'chap-demo-1',
          number: '1.1',
          originalText: 'El escenario político y social chileno en 2026 exige una reorganización estratégica del Frente Estudiantil. La reactivación de las federaciones universitarias y centros de estudiantes demuestra que las juventudes continúan siendo el motor crítico de las transformaciones estructurales del país.',
          status: 'ACTIVO'
        },
        {
          id: 'par-1-2',
          chapterId: 'chap-demo-1',
          number: '1.2',
          originalText: 'La educación pública debe constituirse como un derecho social universal, articulando la fuerza transformadora de las bases regionales.',
          status: 'ACTIVO'
        }
      ],
      dissensusItems: [],
      lastModifiedBy: 'Secretaría Técnica FE-FA',
      lastModifiedAt: Date.now()
    }
  ] as SynthesisChapter[]
};
