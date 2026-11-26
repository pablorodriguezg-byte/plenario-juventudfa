import React, { useEffect, useMemo, useState } from 'react';
import { usePlenario } from '../../context/PlenarioContext';
import { Motion, SynthesisChapter } from '../../types/plenario';
import { HemicicloPlenarioChart } from '../plenario/HemicicloPlenarioChart';
import { VoteBreakdownModal } from '../plenario/VotingTimeline';
import { ChileDelegatesMap } from './ChileDelegatesMap';
import { CHILE_REGIONS_GEO } from '../../data/chileRegionsGeo';
import { InlineDiffViewer } from '../../utils/textDiff';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  KeyRound,
  Lock,
  Radio,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  Vote,
  XCircle
} from 'lucide-react';

const VOTINGS_PER_PAGE = 6;

const getMotionKindLabel = (kind?: Motion['motionKind']): string => {
  switch (kind) {
    case 'GENERAL_PRESINTESIS':
      return 'Presíntesis';
    case 'DISENSO_PRIMERA_VUELTA':
      return 'Disenso 1ª Vuelta';
    case 'DISENSO_SEGUNDA_VUELTA':
      return 'Balotaje 2ª Vuelta';
    case 'MOCION_EXTENSIVA':
      return 'Moción Extensiva';
    case 'MOCION_SUPRESIVA':
      return 'Moción Supresiva';
    case 'GENERAL_SINTESIS_FINAL':
      return 'Síntesis Final';
    case 'MOCION_ORDINARIA':
      return 'Moción en Sala';
    default:
      return 'Votación';
  }
};

const getQuorumShortLabel = (quorumType?: Motion['quorumType']): string => {
  switch (quorumType) {
    case 'TWO_THIRDS':
      return 'Quórum 2/3 (66.7%)';
    case 'ABSOLUTE_MAJORITY':
      return 'Mayoría Absoluta (>50%)';
    default:
      return 'Mayoría Simple (50%+1)';
  }
};

export const PublicInicioView: React.FC = () => {
  const {
    delegates,
    motionsHistory,
    activeVotingMotion,
    synthesisChapters,
    isPresynthesisApproved,
    checkUsernameAccess,
    loginWithCredentials,
    setupFirstTimeAccessKey,
    exportFinalSynthesisPDF,
    setShowLoginModal
  } = usePlenario();

  // Inline "Ingresa acá" 2-step login state
  const [loginStep, setLoginStep] = useState<'USERNAME' | 'ENTER_KEY' | 'CREATE_KEY'>('USERNAME');
  const [usernameInput, setUsernameInput] = useState('');
  const [verifiedDisplayName, setVerifiedDisplayName] = useState('');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [confirmKeyInput, setConfirmKeyInput] = useState('');
  const [showInlineKey, setShowInlineKey] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Share link feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Live countdown ticker for active voting
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!activeVotingMotion) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeVotingMotion]);

  // Hemiciclo selected motion (defaults to live voting or most recent closed)
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
        const tA = a.closedAt || a.startedAt || a.createdAt || 0;
        const tB = b.closedAt || b.startedAt || b.createdAt || 0;
        return tB - tA;
      });
  }, [motionsHistory]);

  const [hemicicloOverrideId, setHemicicloOverrideId] = useState<string>('');
  const hemicicloMotion = useMemo(() => {
    if (hemicicloOverrideId) {
      const found = motionsHistory.find((m) => m.id === hemicicloOverrideId);
      if (found) return found;
    }
    if (activeVotingMotion) return activeVotingMotion;
    return resolvedMotions[0] || null;
  }, [hemicicloOverrideId, motionsHistory, activeVotingMotion, resolvedMotions]);

  // Interactive voting breakdown modal
  const [breakdownMotion, setBreakdownMotion] = useState<Motion | null>(null);

  // Interactive pedagogical guide tab
  const [guideTab, setGuideTab] = useState<'COMO_SE_VOTA' | 'MOCIONES' | 'HEMICICLO'>('COMO_SE_VOTA');

  // Past votings pagination (6 per page) & filters
  const [votingSearch, setVotingSearch] = useState('');
  const [votingFilter, setVotingFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED' | 'RUNOFF'>('ALL');
  const [votingPage, setVotingPage] = useState(1);

  const filteredResolvedMotions = useMemo(() => {
    const q = votingSearch.trim().toLowerCase();
    return resolvedMotions.filter((m) => {
      if (votingFilter === 'APPROVED' && m.status !== 'APPROVED') return false;
      if (votingFilter === 'REJECTED' && m.status !== 'REJECTED') return false;
      if (votingFilter === 'RUNOFF' && m.status !== 'PASSED_TO_RUNOFF') return false;
      if (!q) return true;
      return (
        m.code.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    });
  }, [resolvedMotions, votingSearch, votingFilter]);

  const totalVotingPages = Math.max(1, Math.ceil(filteredResolvedMotions.length / VOTINGS_PER_PAGE));
  const safeVotingPage = Math.min(votingPage, totalVotingPages);
  const paginatedVotings = useMemo(() => {
    const start = (safeVotingPage - 1) * VOTINGS_PER_PAGE;
    return filteredResolvedMotions.slice(start, start + VOTINGS_PER_PAGE);
  }, [filteredResolvedMotions, safeVotingPage]);

  useEffect(() => {
    setVotingPage(1);
  }, [votingSearch, votingFilter]);

  // Approved chapters & paragraphs filters
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ALL');
  const [textSearch, setTextSearch] = useState('');
  const [expandedDiffIds, setExpandedDiffIds] = useState<Record<string, boolean>>({});

  const approvedChaptersData = useMemo(() => {
    const q = textSearch.trim().toLowerCase();
    return (synthesisChapters || [])
      .map((ch) => {
        const activeParagraphs = isPresynthesisApproved
          ? (ch.paragraphs || []).filter((p) => {
              if (p.status === 'SUPRIMIDO') return false;
              if (!q) return true;
              return (
                p.number.toLowerCase().includes(q) ||
                (p.title || '').toLowerCase().includes(q) ||
                p.originalText.toLowerCase().includes(q) ||
                (p.extensionText || '').toLowerCase().includes(q) ||
                (p.modifiedText || '').toLowerCase().includes(q)
              );
            })
          : [];
        const resolvedDissensus = (ch.dissensusItems || []).filter((d) => {
          if (d.status !== 'RESUELTO') return false;
          if (!q) return true;
          return (
            d.title.toLowerCase().includes(q) ||
            d.optionA.text.toLowerCase().includes(q) ||
            d.optionB.text.toLowerCase().includes(q) ||
            d.optionC.text.toLowerCase().includes(q)
          );
        });
        return {
          chapter: ch,
          activeParagraphs,
          resolvedDissensus
        };
      })
      .filter((item) => {
        if (selectedChapterId !== 'ALL' && item.chapter.id !== selectedChapterId) return false;
        if (q) return item.activeParagraphs.length > 0 || item.resolvedDissensus.length > 0;
        return (
          item.activeParagraphs.length > 0 ||
          item.resolvedDissensus.length > 0 ||
          (item.chapter.paragraphs || []).length === 0
        );
      });
  }, [synthesisChapters, isPresynthesisApproved, selectedChapterId, textSearch]);

  // Global counts
  const totalApprovedParagraphs = useMemo(
    () =>
      isPresynthesisApproved
        ? (synthesisChapters || []).reduce(
            (acc, ch) => acc + (ch.paragraphs || []).filter((p) => p.status !== 'SUPRIMIDO').length,
            0
          )
        : 0,
    [synthesisChapters, isPresynthesisApproved]
  );

  const votingDelegatesCount = useMemo(
    () => delegates.filter((d) => d.role === 'DELEGATE').length,
    [delegates]
  );

  const representedRegionsCount = useMemo(() => {
    const activeSet = new Set(
      delegates.filter((d) => d.role === 'DELEGATE').map((d) => d.region)
    );
    return CHILE_REGIONS_GEO.filter((r) => activeSet.has(r.id)).length;
  }, [delegates]);

  const handleInlineUsernameCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || loginLoading) return;
    setLoginError('');
    setLoginLoading(true);
    const result = await checkUsernameAccess(usernameInput);
    setLoginLoading(false);
    if (!result.success || !result.exists) {
      setLoginError(
        result.error || 'Usuario no encontrado en el Padrón Oficial. Verifique su nombre de usuario.'
      );
      return;
    }
    setVerifiedDisplayName(result.displayName || usernameInput);
    setAccessKeyInput('');
    setNewKeyInput('');
    setConfirmKeyInput('');
    setShowInlineKey(false);
    setLoginStep(result.hasAccessKey ? 'ENTER_KEY' : 'CREATE_KEY');
  };

  const handleInlineKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyInput.trim() || loginLoading) return;
    setLoginError('');
    setLoginLoading(true);
    const result = await loginWithCredentials(usernameInput, accessKeyInput);
    setLoginLoading(false);
    if (result.success) {
      setUsernameInput('');
      setAccessKeyInput('');
      setLoginStep('USERNAME');
    } else if (result.requiresSetup) {
      setLoginStep('CREATE_KEY');
      setLoginError('');
    } else {
      setLoginError(result.error || 'Clave de acceso incorrecta.');
    }
  };

  const handleInlineCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;
    const cleanNew = newKeyInput.trim();
    const cleanConfirm = confirmKeyInput.trim();
    if (cleanNew.length < 4 || cleanNew.length > 64) {
      setLoginError('Tu clave personal debe tener entre 4 y 64 caracteres.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setLoginError('Las claves ingresadas no coinciden. Verifica ambos campos.');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    const result = await setupFirstTimeAccessKey(usernameInput, cleanNew);
    setLoginLoading(false);
    if (result.success) {
      setUsernameInput('');
      setNewKeyInput('');
      setConfirmKeyInput('');
      setLoginStep('USERNAME');
    } else {
      setLoginError(result.error || 'No se pudo guardar tu clave personal.');
    }
  };

  const handleInlineSwitchUser = () => {
    setLoginStep('USERNAME');
    setVerifiedDisplayName('');
    setAccessKeyInput('');
    setNewKeyInput('');
    setConfirmKeyInput('');
    setShowInlineKey(false);
    setLoginError('');
  };

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  };

  // Live countdown formatting
  const liveRemainingSeconds = useMemo(() => {
    if (!activeVotingMotion) return 0;
    const start = activeVotingMotion.startedAt || activeVotingMotion.createdAt || nowMs;
    const duration = activeVotingMotion.durationSeconds || 300;
    const elapsed = Math.floor((nowMs - start) / 1000);
    return Math.max(0, duration - elapsed);
  }, [activeVotingMotion, nowMs]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const getMotionStats = (m: Motion) => {
    const votesArr = Object.values(m.votes || {});
    const totalCast = m.resultSummary?.totalCast ?? votesArr.length;
    const totalEligible = m.resultSummary?.totalEligible ?? Math.max(votingDelegatesCount, totalCast);
    const isTripartite =
      m.motionKind === 'DISENSO_PRIMERA_VUELTA' || m.motionKind === 'DISENSO_SEGUNDA_VUELTA';

    const favor = votesArr.filter((v) => v.vote === 'A_FAVOR').length;
    const contra = votesArr.filter((v) => v.vote === 'EN_CONTRA').length;
    const abstencion = votesArr.filter((v) => v.vote === 'ABSTENCION').length;
    const opcA = votesArr.filter((v) => v.vote === 'OPCION_A').length;
    const opcB = votesArr.filter((v) => v.vote === 'OPCION_B').length;
    const opcC = votesArr.filter((v) => v.vote === 'OPCION_C').length;

    const pctFavor = m.resultSummary?.percentageFavor ?? (totalCast > 0 ? (favor / totalCast) * 100 : 0);
    const pctA = m.resultSummary?.percentageA ?? (totalCast > 0 ? (opcA / totalCast) * 100 : 0);
    const pctB = m.resultSummary?.percentageB ?? (totalCast > 0 ? (opcB / totalCast) * 100 : 0);
    const pctC = m.resultSummary?.percentageC ?? (totalCast > 0 ? (opcC / totalCast) * 100 : 0);

    return {
      totalCast,
      totalEligible,
      isTripartite,
      favor,
      contra,
      abstencion,
      opcA,
      opcB,
      opcC,
      pctFavor,
      pctA,
      pctB,
      pctC
    };
  };

  const liveStats = activeVotingMotion ? getMotionStats(activeVotingMotion) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#FAF5FF] via-[#FFF9F5] to-[#F2FBF8] dark:from-slate-950 dark:via-[#0D111C] dark:to-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Scenic Layered Color Backdrop Motifs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-purple-300/25 dark:bg-purple-800/20 blur-3xl" />
        <div className="absolute top-20 -right-24 w-[440px] h-[440px] rounded-full bg-rose-300/20 dark:bg-rose-900/15 blur-3xl" />
        <div className="absolute top-[42%] -left-20 w-[420px] h-[420px] rounded-full bg-sky-300/20 dark:bg-sky-900/15 blur-3xl" />
        <div className="absolute bottom-24 right-0 w-[460px] h-[460px] rounded-full bg-emerald-300/20 dark:bg-emerald-900/15 blur-3xl" />
        {/* Delicate dot architectural mesh */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.35] dark:opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="inicio-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.15" fill="#9333EA" fillOpacity="0.16" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#inicio-dot-grid)" />
        </svg>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9 space-y-12">
        {/* 1. VIBRANT CIVIC HERO + PORTAL "INGRESA ACÁ" */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Luminous Gradient Civic Hero Card */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B0D44] via-[#6B1868] to-[#C83254] text-white p-7 sm:p-9 flex flex-col justify-between gap-7 shadow-lg">
            {/* Decorative Andean Topographic Vector Waves Inside Hero */}
            <svg
              aria-hidden="true"
              viewBox="0 0 800 420"
              className="pointer-events-none absolute inset-0 w-full h-full opacity-20 mix-blend-screen"
              preserveAspectRatio="none"
            >
              <path
                d="M0,330 Q180,240 360,300 T720,250 L800,270 L800,420 L0,420 Z"
                fill="url(#hero-wave-1)"
              />
              <path
                d="M0,260 Q220,170 430,240 T800,190 L800,420 L0,420 Z"
                fill="none"
                stroke="#FDE68A"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <circle cx="690" cy="85" r="76" fill="#38BDF8" fillOpacity="0.28" />
              <circle cx="690" cy="85" r="118" fill="none" stroke="#FBCFE8" strokeWidth="1.2" strokeOpacity="0.4" />
              <defs>
                <linearGradient id="hero-wave-1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F472B6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.35" />
                </linearGradient>
              </defs>
            </svg>

            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold tracking-wide text-amber-200">
                <img
                  src="/assets/aistudio/239A2F73-D6B6-456E-A594-91458B73B455_b67ce703.png"
                  alt="Logo Frente Amplio"
                  className="w-7 h-7 object-contain drop-shadow-xs shrink-0"
                />
                <span>Plenario Nacional de Juventudes</span>
                <span aria-hidden="true">·</span>
                <span className="text-purple-100">Frente Estudiantil FE-FA</span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-200">Portal Ciudadano Abierto</span>
              </div>

              <h1 className="font-serif-doc text-3xl sm:text-4xl lg:text-[42px] font-semibold text-white leading-[1.14] [text-wrap:balance]">
                Democracia transparente y en vivo desde todo Chile
              </h1>

              <p className="text-sm sm:text-base text-purple-100/95 leading-relaxed max-w-2xl">
                Sigue minuto a minuto la votación en curso, explora el mapa interactivo territorial para conocer a cada delegación acreditada, revisa las votaciones realizadas y lee el articulado que el Plenario está aprobando.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/20">
              <a
                href="#territorios"
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 shadow-sm"
              >
                <Compass className="w-4 h-4" />
                <span>Explorar mapa de Chile</span>
              </a>

              <a
                href="#en-vivo"
                className="px-4 py-2.5 bg-white text-[#4A154B] hover:bg-purple-50 rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 shadow-sm"
              >
                <Radio className="w-3.5 h-3.5 text-rose-600" />
                <span>{activeVotingMotion ? 'Ver votación en vivo' : 'Ver sala en vivo'}</span>
              </a>

              <a
                href="#articulado"
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-200" />
                <span>Texto aprobado</span>
              </a>

              <button
                type="button"
                onClick={handleShareLink}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-200 font-black">¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-200" />
                    <span>Compartir enlace</span>
                  </>
                )}
              </button>

              {synthesisChapters.length > 0 && (
                <button
                  type="button"
                  onClick={exportFinalSynthesisPDF}
                  className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-200" />
                  <span>PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: "Ingresa acá" Friendly Portal */}
          <div
            id="ingresa-aca"
            className="lg:col-span-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-purple-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between"
          >
            <div className="h-2 bg-gradient-to-r from-[#4A154B] via-[#E11D48] to-[#0284C7]" />

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#4A154B] dark:text-purple-300">
                    Acceso Acreditado
                  </span>
                  <Lock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                </div>
                <h2 className="font-serif-doc text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                  Ingresa acá
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Si eres <strong>delegada/o regional</strong> o parte de la <strong>Secretaría Técnica</strong>, ingresa tu usuario y tu clave personal de verificación.
                </p>
              </div>

              {loginStep === 'USERNAME' && (
                <form onSubmit={handleInlineUsernameCheck} className="space-y-3">
                  <div>
                    <label htmlFor="inicio-username-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nombre de usuario del Padrón
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-purple-500 dark:text-purple-400 absolute left-3.5 top-3" />
                      <input
                        id="inicio-username-input"
                        type="text"
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={usernameInput}
                        onChange={(e) => {
                          setUsernameInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="ej: nombre.apellido"
                        className="w-full bg-purple-50/50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 font-semibold">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#4A154B] to-[#9D174D] hover:from-[#5E1B5F] hover:to-[#BE185D] disabled:opacity-60 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>{loginLoading ? 'Verificando usuario...' : 'Continuar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {loginStep === 'ENTER_KEY' && (
                <form onSubmit={handleInlineKeyLogin} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{verifiedDisplayName}</div>
                      <div className="text-[11px] text-purple-800 dark:text-purple-300 font-mono truncate">@{usernameInput.trim().toLowerCase()}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleInlineSwitchUser}
                      className="text-[11px] font-bold text-[#4A154B] dark:text-purple-300 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  <div>
                    <label htmlFor="inicio-key-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Clave de Acceso Personal
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-purple-500 dark:text-purple-400 absolute left-3.5 top-3" />
                      <input
                        id="inicio-key-input"
                        type={showInlineKey ? 'text' : 'password'}
                        required
                        autoFocus
                        value={accessKeyInput}
                        onChange={(e) => {
                          setAccessKeyInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="Ingresa tu clave personal"
                        className="w-full bg-purple-50/50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowInlineKey((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showInlineKey ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showInlineKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      ¿Olvidaste tu clave? Secretaría Técnica puede consultarla o restablecerla en el Padrón.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 font-semibold">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#4A154B] to-[#9D174D] hover:from-[#5E1B5F] hover:to-[#BE185D] disabled:opacity-60 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>{loginLoading ? 'Verificando clave...' : 'Ingresar a mis vistas'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {loginStep === 'CREATE_KEY' && (
                <form onSubmit={handleInlineCreateKey} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        Primer ingreso · Crea tu clave
                      </span>
                      <button
                        type="button"
                        onClick={handleInlineSwitchUser}
                        className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Cambiar</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-900/90 dark:text-emerald-200/90 leading-snug">
                      Hola <strong>{verifiedDisplayName}</strong>, define una clave personal (mín. 4 caracteres) para proteger tu cuenta.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="inicio-new-key" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nueva Clave Personal
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-purple-500 dark:text-purple-400 absolute left-3.5 top-3" />
                      <input
                        id="inicio-new-key"
                        type={showInlineKey ? 'text' : 'password'}
                        required
                        minLength={4}
                        maxLength={64}
                        autoFocus
                        value={newKeyInput}
                        onChange={(e) => {
                          setNewKeyInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full bg-purple-50/50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowInlineKey((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showInlineKey ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showInlineKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="inicio-confirm-key" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirmar Clave
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-purple-500 dark:text-purple-400 absolute left-3.5 top-3" />
                      <input
                        id="inicio-confirm-key"
                        type={showInlineKey ? 'text' : 'password'}
                        required
                        minLength={4}
                        maxLength={64}
                        value={confirmKeyInput}
                        onChange={(e) => {
                          setConfirmKeyInput(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="Repite tu nueva clave"
                        className="w-full bg-purple-50/50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 font-semibold">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#4A154B] to-[#9D174D] hover:from-[#5E1B5F] hover:to-[#BE185D] disabled:opacity-60 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>{loginLoading ? 'Guardando clave...' : 'Guardar Clave e Ingresar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] space-y-1">
                  <div className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Delegadas/os</span>
                  </div>
                  <p className="text-emerald-900/80 dark:text-emerald-200/80 leading-snug">
                    Cabina de votación, hemiciclo en vivo y propuestas de mociones.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-[11px] space-y-1">
                  <div className="font-extrabold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                    <span>Secretaría Técnica</span>
                  </div>
                  <p className="text-sky-900/80 dark:text-sky-200/80 leading-snug">
                    Mesa de votaciones, capítulos, actas y padrón nacional.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Para regresar a esta portada pública luego de ingresar, solo haz clic en <strong>Cerrar Sesión</strong>.
              </div>
            </div>
          </div>
        </section>

        {/* 2. COLORFUL 4-COLUMN INTERACTIVE SUMMARY STRIP */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="#articulado"
            className="group bg-gradient-to-br from-white to-sky-50/90 dark:from-slate-900 dark:to-sky-950/40 border border-sky-200/90 dark:border-sky-800/60 hover:border-sky-400 dark:hover:border-sky-500 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-300">Capítulos en Síntesis</span>
              <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-950 dark:text-white mt-1.5 font-mono tabular-nums">
              {synthesisChapters.length}
            </div>
            <div className="text-[11px] text-sky-700 dark:text-sky-400 font-medium mt-1">Ver articulado completo →</div>
          </a>

          <a
            href="#articulado"
            className="group bg-gradient-to-br from-white to-purple-50/90 dark:from-slate-900 dark:to-purple-950/40 border border-purple-200/90 dark:border-purple-800/60 hover:border-purple-400 dark:hover:border-purple-500 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-purple-950 dark:text-purple-300">Párrafos Aprobados</span>
              <FileText className="w-4 h-4 text-[#4A154B] dark:text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#4A154B] dark:text-purple-200 mt-1.5 font-mono tabular-nums">
              {totalApprovedParagraphs}
            </div>
            <div className="text-[11px] text-purple-800 dark:text-purple-400 font-medium mt-1">Vigentes en texto oficial →</div>
          </a>

          <a
            href="#votaciones"
            className="group bg-gradient-to-br from-white to-emerald-50/90 dark:from-slate-900 dark:to-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">Votaciones Realizadas</span>
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-200 mt-1.5 font-mono tabular-nums">
              {resolvedMotions.length}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">Revisar de 6 en 6 →</div>
          </a>

          <a
            href="#territorios"
            className="group bg-gradient-to-br from-white to-amber-50/90 dark:from-slate-900 dark:to-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl p-4 sm:p-5 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-950 dark:text-amber-300">Mapa Territorial</span>
              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200 mt-1.5 font-mono tabular-nums">
              {representedRegionsCount} / {CHILE_REGIONS_GEO.length}
            </div>
            <div className="text-[11px] text-amber-800 dark:text-amber-400 font-medium mt-1">
              {votingDelegatesCount} delegadas/os en padrón →
            </div>
          </a>
        </section>

        {/* 3. MAPA INTERACTIVO DE CHILE Y DELEGADOS POR REGIÓN */}
        <section id="territorios" className="scroll-mt-20">
          <ChileDelegatesMap
            delegates={delegates}
            activeMotion={activeVotingMotion || hemicicloMotion}
          />
        </section>

        {/* 4. VOTACIÓN EN VIVO + HEMICICLO PLENARIO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Live Voting Spotlight */}
          <div
            id="en-vivo"
            className={`lg:col-span-6 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-sm border scroll-mt-20 ${
              activeVotingMotion
                ? 'bg-gradient-to-br from-white via-rose-50/40 to-purple-50/60 dark:from-slate-900 dark:via-rose-950/30 dark:to-purple-950/40 border-rose-300 dark:border-rose-800/70'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800'
            }`}
          >
            {activeVotingMotion && liveStats ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rose-200/70 dark:border-rose-900/60">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-700 dark:text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                      <span>Votación sucediendo en vivo</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 dark:text-white tabular-nums bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                      <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>{formatDuration(liveRemainingSeconds)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span className="font-mono font-bold text-[#4A154B] dark:text-purple-300">{activeVotingMotion.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getMotionKindLabel(activeVotingMotion.motionKind)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getQuorumShortLabel(activeVotingMotion.quorumType)}</span>
                  </div>

                  <h2 className="font-serif-doc text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug">
                    {activeVotingMotion.title}
                  </h2>

                  {activeVotingMotion.description && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {activeVotingMotion.description}
                    </p>
                  )}
                </div>

                {/* Live Tally Progress */}
                <div className="space-y-3 pt-2 border-t border-rose-100 dark:border-rose-900/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Participación en curso</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums">
                      {liveStats.totalCast} / {liveStats.totalEligible} votos emitidos
                    </span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex shadow-inner">
                    {liveStats.isTripartite ? (
                      <>
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.opcA / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-[#0284C7] h-full transition-all"
                        />
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.opcB / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-[#D97706] h-full transition-all"
                        />
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.opcC / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-[#059669] h-full transition-all"
                        />
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.abstencion / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-slate-400 dark:bg-slate-500 h-full transition-all"
                        />
                      </>
                    ) : (
                      <>
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.favor / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-[#4A154B] dark:bg-purple-600 h-full transition-all"
                        />
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.contra / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-rose-600 h-full transition-all"
                        />
                        <div
                          style={{ width: `${liveStats.totalCast > 0 ? (liveStats.abstencion / liveStats.totalCast) * 100 : 0}%` }}
                          className="bg-slate-400 dark:bg-slate-500 h-full transition-all"
                        />
                      </>
                    )}
                  </div>

                  {liveStats.isTripartite ? (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono tabular-nums">
                      <div className="p-2 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl">
                        <div className="text-[10px] font-sans font-bold text-sky-900 dark:text-sky-300">Opción A</div>
                        <div className="text-base font-black text-sky-700 dark:text-sky-300">{liveStats.opcA}</div>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                        <div className="text-[10px] font-sans font-bold text-amber-900 dark:text-amber-300">Opción B</div>
                        <div className="text-base font-black text-amber-700 dark:text-amber-300">{liveStats.opcB}</div>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
                        <div className="text-[10px] font-sans font-bold text-emerald-900 dark:text-emerald-300">Opción C</div>
                        <div className="text-base font-black text-emerald-700 dark:text-emerald-300">{liveStats.opcC}</div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="text-[10px] font-sans font-bold text-slate-700 dark:text-slate-300">Abst.</div>
                        <div className="text-base font-black text-slate-700 dark:text-slate-200">{liveStats.abstencion}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono tabular-nums">
                      <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 rounded-xl">
                        <div className="text-[11px] font-sans font-bold text-purple-950 dark:text-purple-200">A Favor</div>
                        <div className="text-lg font-black text-[#4A154B] dark:text-purple-300">{liveStats.favor}</div>
                      </div>
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl">
                        <div className="text-[11px] font-sans font-bold text-rose-900 dark:text-rose-200">En Contra</div>
                        <div className="text-lg font-black text-rose-700 dark:text-rose-300">{liveStats.contra}</div>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="text-[11px] font-sans font-bold text-slate-700 dark:text-slate-300">Abstención</div>
                        <div className="text-lg font-black text-slate-700 dark:text-slate-200">{liveStats.abstencion}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBreakdownMotion(activeVotingMotion)}
                      className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#4A154B] dark:text-purple-400" />
                      <span>Ver detalle nominal en vivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLoginModal(true)}
                      className="px-4 py-2 bg-[#4A154B] hover:bg-[#5E1B5F] dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>Soy delegado/a · Quiero votar</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-between gap-5">
                <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#4A154B] dark:text-purple-300">Estado de la Sala en Vivo</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">En deliberación abierta</span>
                  </div>
                  <h2 className="font-serif-doc text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                    No hay una votación abierta en este instante
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    En cuanto la Secretaría Técnica inicie una nueva votación en sala, esta tarjeta mostrará la moción, su cuenta regresiva y el escrutinio en directo sin recargar.
                  </p>
                </div>

                {resolvedMotions[0] ? (
                  <div className="p-4 bg-gradient-to-br from-purple-50/70 to-sky-50/70 dark:from-purple-950/40 dark:to-sky-950/30 border border-purple-200/70 dark:border-purple-800/60 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      <span>Última votación concluida</span>
                      <span className="font-mono font-bold text-[#4A154B] dark:text-purple-300">{resolvedMotions[0].code}</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{resolvedMotions[0].title}</div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${
                          resolvedMotions[0].status === 'APPROVED'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : resolvedMotions[0].status === 'PASSED_TO_RUNOFF'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {resolvedMotions[0].status === 'APPROVED' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>
                          {resolvedMotions[0].status === 'APPROVED'
                            ? 'Aprobada en sala'
                            : resolvedMotions[0].status === 'PASSED_TO_RUNOFF'
                              ? 'Pasó a 2ª vuelta'
                              : 'Rechazada en sala'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setBreakdownMotion(resolvedMotions[0])}
                        className="text-xs font-bold text-[#4A154B] dark:text-purple-300 hover:underline cursor-pointer"
                      >
                        Ver resultado completo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-purple-50/70 to-sky-50/70 dark:from-purple-950/30 dark:to-sky-950/30 border border-purple-200/70 dark:border-purple-800/60 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
                    Aún no se han registrado votaciones en esta sesión plenaria.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Interactive Hemiciclo Plenario */}
          <div
            id="hemiciclo"
            className="lg:col-span-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-purple-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-4 shadow-sm scroll-mt-20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-serif-doc text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#4A154B] dark:text-purple-400" />
                  <span>Hemiciclo Plenario</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Toca o pasa el cursor sobre cualquier curul para ver la delegación y su postura.
                </p>
              </div>

              {resolvedMotions.length > 0 && (
                <select
                  aria-label="Seleccionar votación a proyectar en el hemiciclo"
                  value={hemicicloMotion?.id || ''}
                  onChange={(e) => setHemicicloOverrideId(e.target.value)}
                  className="bg-purple-50/70 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl px-3 py-1.5 max-w-[240px] truncate cursor-pointer focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400"
                >
                  {activeVotingMotion && (
                    <option value={activeVotingMotion.id}>
                      En vivo: {activeVotingMotion.code}
                    </option>
                  )}
                  {resolvedMotions.slice(0, 12).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} · {m.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              {hemicicloMotion && (
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 px-1">
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {hemicicloMotion.code} — {hemicicloMotion.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-[#4A154B] dark:text-purple-300 font-bold">
                    {hemicicloMotion.status === 'VOTING' ? 'En vivo' : 'Concluida'}
                  </span>
                </div>
              )}

              <HemicicloPlenarioChart
                motion={hemicicloMotion}
                delegates={delegates}
                maxHeightClass="max-h-[215px]"
              />
            </div>
          </div>
        </section>

        {/* 5. INTERACTIVE PEDAGOGICAL CITIZEN GUIDE */}
        <section className="rounded-3xl bg-gradient-to-br from-indigo-50/90 via-white to-amber-50/80 dark:from-indigo-950/35 dark:via-slate-900 dark:to-amber-950/20 border border-indigo-200/80 dark:border-indigo-900/60 p-6 sm:p-7 space-y-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-200/60 dark:border-indigo-900/50">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Pedagogía Ciudadana</span>
              </div>
              <h2 className="font-serif-doc text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mt-0.5">
                ¿Cómo funciona el Plenario? Guía rápida para visitantes
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-white/90 dark:bg-slate-800/90 border border-indigo-200/80 dark:border-slate-700 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setGuideTab('COMO_SE_VOTA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  guideTab === 'COMO_SE_VOTA'
                    ? 'bg-[#4A154B] dark:bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ¿Cómo se aprueba?
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('MOCIONES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  guideTab === 'MOCIONES'
                    ? 'bg-[#4A154B] dark:bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tipos de mociones
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('HEMICICLO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  guideTab === 'HEMICICLO'
                    ? 'bg-[#4A154B] dark:bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Lectura del hemiciclo
              </button>
            </div>
          </div>

          {guideTab === 'COMO_SE_VOTA' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
              <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-purple-200/70 dark:border-purple-800/60 space-y-2.5">
                <div className="font-extrabold text-[#4A154B] dark:text-purple-300 text-sm">
                  1. Mayoría Simple (50% + 1)
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[52%] h-full bg-gradient-to-r from-[#4A154B] to-purple-500 rounded-full" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Se aplica a presíntesis general, mociones extensivas y acuerdos ordinarios. Basta superar la mitad de los votos emitidos.
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-rose-200/70 dark:border-rose-800/60 space-y-2.5">
                <div className="font-extrabold text-rose-800 dark:text-rose-300 text-sm">
                  2. Quórum Calificado (2/3 · 66.7%)
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[67%] h-full bg-gradient-to-r from-rose-600 to-orange-500 rounded-full" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Exigido para suprimir párrafos ya aprobados. Protege los consensos regionales previos requiriendo dos tercios de la sala.
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 space-y-2.5">
                <div className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">
                  3. Fe Pública Nominal
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Cada sufragio queda registrado públicamente con nombre, región y sello horario, garantizando transparencia total en tiempo real.
                </p>
              </div>
            </div>
          )}

          {guideTab === 'MOCIONES' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
              <div className="p-4 sm:p-5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-1.5">
                <div className="font-black text-[#4A154B] dark:text-purple-300 text-sm">Moción Extensiva (50%+1)</div>
                <p className="text-slate-700 dark:text-slate-300">
                  Propone complementar o precisar un párrafo ya aprobado sin eliminar su idea base. Su texto añadido queda resaltado para fácil lectura.
                </p>
              </div>
              <div className="p-4 sm:p-5 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl space-y-1.5">
                <div className="font-black text-rose-800 dark:text-rose-300 text-sm">Moción Supresiva (2/3)</div>
                <p className="text-slate-700 dark:text-slate-300">
                  Propone retirar un párrafo completo del texto definitivo. Requiere el voto favorable de al menos dos tercios de las delegaciones.
                </p>
              </div>
              <div className="p-4 sm:p-5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-1.5">
                <div className="font-black text-amber-900 dark:text-amber-300 text-sm">Disensos (1ª y 2ª Vuelta)</div>
                <p className="text-slate-700 dark:text-slate-300">
                  Si hay tres visiones (A, B y C) y ninguna supera el 50% en 1ª vuelta, las dos más votadas pasan automáticamente a balotaje.
                </p>
              </div>
            </div>
          )}

          {guideTab === 'HEMICICLO' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 rounded-2xl flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#4A154B] dark:bg-purple-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Morado · A Favor</div>
                  <div className="text-slate-500 dark:text-slate-400">Respalda la moción</div>
                </div>
              </div>
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-rose-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Rojo · En Contra</div>
                  <div className="text-slate-500 dark:text-slate-400">Rechaza la moción</div>
                </div>
              </div>
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-slate-500 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Gris oscuro · Abstención</div>
                  <div className="text-slate-500 dark:text-slate-400">Voto emitido en abstención</div>
                </div>
              </div>
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Gris claro · Pendiente</div>
                  <div className="text-slate-500 dark:text-slate-400">Sin voto registrado aún</div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 6. VOTACIONES REALIZADAS (DE 6 EN 6) Y RESULTADO */}
        <section id="votaciones" className="space-y-5 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold text-[#4A154B] dark:text-purple-300 uppercase tracking-wider">
                Registro Histórico de Sala
              </span>
              <h2 className="font-serif-doc text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white mt-0.5">
                Votaciones realizadas y resultados
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Mostrando de 6 en 6 en orden cronológico inverso. Haz clic en cualquier votación para abrir su desglose nominal y hemiciclo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={votingSearch}
                  onChange={(e) => setVotingSearch(e.target.value)}
                  placeholder="Buscar votación..."
                  className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[#4A154B] dark:focus:border-purple-400 w-48 sm:w-56"
                />
              </div>

              <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900 border border-purple-200 dark:border-slate-700 p-1 rounded-xl">
                {(
                  [
                    { id: 'ALL', label: 'Todas' },
                    { id: 'APPROVED', label: 'Aprobadas' },
                    { id: 'REJECTED', label: 'Rechazadas' },
                    { id: 'RUNOFF', label: 'Balotaje' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVotingFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      votingFilter === tab.id
                        ? 'bg-[#4A154B] dark:bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {paginatedVotings.length === 0 ? (
            <div className="bg-white/90 dark:bg-slate-900/90 border border-purple-200/80 dark:border-slate-800 rounded-3xl p-10 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-purple-300 dark:text-purple-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {resolvedMotions.length === 0
                  ? 'Aún no hay votaciones concluidas'
                  : 'Ninguna votación coincide con el filtro aplicado'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {resolvedMotions.length === 0
                  ? 'Cuando finalice la primera votación en sala, su resultado oficial quedará disponible aquí.'
                  : 'Prueba cambiando la búsqueda o seleccionando "Todas".'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedVotings.map((motion) => {
                const stats = getMotionStats(motion);
                const isApproved = motion.status === 'APPROVED';
                const isRunoff = motion.status === 'PASSED_TO_RUNOFF';
                const timeRef = motion.closedAt || motion.startedAt || motion.createdAt;
                const accentStrip = isApproved
                  ? 'from-emerald-500 to-teal-500'
                  : isRunoff
                    ? 'from-amber-500 to-orange-500'
                    : 'from-rose-500 to-pink-600';

                return (
                  <article
                    key={motion.id}
                    className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-600 rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-2xs"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${accentStrip}`} />

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-mono font-bold text-[#4A154B] dark:text-purple-300">{motion.code}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{getMotionKindLabel(motion.motionKind)}</span>
                          </div>
                          {timeRef && (
                            <span className="font-mono shrink-0">
                              {new Date(timeRef).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {motion.title}
                        </h3>

                        {motion.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {motion.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold ${
                              isApproved
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : isRunoff
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {isApproved ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : isRunoff ? (
                              <Scale className="w-4 h-4 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>
                              {isApproved ? 'Aprobada' : isRunoff ? 'A 2ª Vuelta' : 'Rechazada'}
                            </span>
                          </span>

                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                            {stats.isTripartite
                              ? `${stats.totalCast} sufragios`
                              : `${stats.pctFavor.toFixed(1)}% a favor`}
                          </span>
                        </div>

                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex">
                          {stats.isTripartite ? (
                            <>
                              <div
                                style={{ width: `${stats.pctA}%` }}
                                className="bg-[#0284C7] h-full"
                              />
                              <div
                                style={{ width: `${stats.pctB}%` }}
                                className="bg-[#D97706] h-full"
                              />
                              <div
                                style={{ width: `${stats.pctC}%` }}
                                className="bg-[#059669] h-full"
                              />
                            </>
                          ) : (
                            <>
                              <div
                                style={{
                                  width: `${stats.totalCast > 0 ? (stats.favor / stats.totalCast) * 100 : 0}%`
                                }}
                                className="bg-[#4A154B] dark:bg-purple-600 h-full"
                              />
                              <div
                                style={{
                                  width: `${stats.totalCast > 0 ? (stats.contra / stats.totalCast) * 100 : 0}%`
                                }}
                                className="bg-rose-600 h-full"
                              />
                              <div
                                style={{
                                  width: `${stats.totalCast > 0 ? (stats.abstencion / stats.totalCast) * 100 : 0}%`
                                }}
                                className="bg-slate-400 dark:bg-slate-500 h-full"
                              />
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                          {stats.isTripartite ? (
                            <>
                              <span>A: {stats.opcA}</span>
                              <span>B: {stats.opcB}</span>
                              <span>C: {stats.opcC}</span>
                              <span>Abs: {stats.abstencion}</span>
                            </>
                          ) : (
                            <>
                              <span>Fav: {stats.favor}</span>
                              <span>Con: {stats.contra}</span>
                              <span>Abs: {stats.abstencion}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setBreakdownMotion(motion)}
                            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#4A154B] dark:text-purple-200 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver desglose</span>
                          </button>

                          <a
                            href="#hemiciclo"
                            onClick={() => setHemicicloOverrideId(motion.id)}
                            className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline whitespace-nowrap"
                          >
                            Proyectar en hemiciclo
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls (6 per page) */}
          {filteredResolvedMotions.length > VOTINGS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-purple-200/60 dark:border-slate-800 text-xs">
              <div className="text-slate-600 dark:text-slate-400 font-medium tabular-nums">
                Mostrando {(safeVotingPage - 1) * VOTINGS_PER_PAGE + 1}–
                {Math.min(safeVotingPage * VOTINGS_PER_PAGE, filteredResolvedMotions.length)} de{' '}
                {filteredResolvedMotions.length} votaciones
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeVotingPage <= 1}
                  onClick={() => setVotingPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                {Array.from({ length: totalVotingPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setVotingPage(pageNum)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold transition-colors cursor-pointer ${
                      pageNum === safeVotingPage
                        ? 'bg-[#4A154B] dark:bg-purple-700 text-white'
                        : 'bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safeVotingPage >= totalVotingPages}
                  onClick={() => setVotingPage((p) => Math.min(totalVotingPages, p + 1))}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 7. CAPÍTULOS Y PÁRRAFOS YA APROBADOS */}
        <section id="articulado" className="space-y-5 scroll-mt-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Documento Acordado en Construcción
              </span>
              <h2 className="font-serif-doc text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white mt-0.5">
                Capítulos y párrafos aprobados
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Lectura pública del articulado vigente con sus ampliaciones y consensos aprobados por el Plenario.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  placeholder="Buscar en el articulado..."
                  className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 w-52 sm:w-64"
                />
              </div>

              {synthesisChapters.length > 0 && (
                <button
                  type="button"
                  onClick={exportFinalSynthesisPDF}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Texto Final (PDF)</span>
                </button>
              )}
            </div>
          </div>

          {synthesisChapters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedChapterId('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedChapterId === 'ALL'
                    ? 'bg-[#4A154B] dark:bg-purple-700 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800'
                }`}
              >
                Todos los capítulos ({synthesisChapters.length})
              </button>
              {synthesisChapters.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChapterId(ch.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedChapterId === ch.id
                      ? 'bg-[#4A154B] dark:bg-purple-700 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Cap. {ch.number} · {ch.title}
                </button>
              ))}
            </div>
          )}

          {approvedChaptersData.length === 0 ? (
            <div className="bg-white/95 dark:bg-slate-900/95 border border-emerald-200/80 dark:border-slate-800 rounded-3xl p-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-emerald-300 dark:text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {synthesisChapters.length === 0
                  ? 'Aún no hay capítulos publicados en la síntesis'
                  : !isPresynthesisApproved
                    ? 'Presíntesis pendiente de votación general'
                    : 'No se encontraron párrafos con esa búsqueda'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {synthesisChapters.length === 0
                  ? 'Cuando la Secretaría Técnica cargue capítulos y el Plenario apruebe párrafos, aparecerán aquí automáticamente.'
                  : !isPresynthesisApproved
                    ? 'Los capítulos y párrafos cargados serán publicados aquí como articulado aprobado una vez que el Plenario vote y apruebe la Presíntesis en general.'
                    : 'Intenta con otra palabra clave o selecciona "Todos los capítulos".'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {approvedChaptersData.map(
                ({
                  chapter,
                  activeParagraphs,
                  resolvedDissensus
                }: {
                  chapter: SynthesisChapter;
                  activeParagraphs: SynthesisChapter['paragraphs'];
                  resolvedDissensus: SynthesisChapter['dissensusItems'];
                }) => (
                  <section
                    key={chapter.id}
                    className="bg-[#FFFDF9] dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs"
                  >
                    <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-amber-50/90 via-purple-50/50 to-emerald-50/60 dark:from-slate-800/90 dark:via-purple-950/30 dark:to-slate-800/80 border-b border-amber-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-[#4A154B] dark:text-purple-300">
                          Capítulo {chapter.number}
                        </div>
                        <h3 className="font-serif-doc text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mt-0.5">
                          {chapter.title}
                        </h3>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold tabular-nums shrink-0">
                        {activeParagraphs.length} párrafo{activeParagraphs.length === 1 ? '' : 's'} vigente
                        {activeParagraphs.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                      {activeParagraphs.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Este capítulo aún no tiene párrafos aprobados activos.
                        </p>
                      ) : (
                        <div className="divide-y divide-amber-100 dark:divide-slate-800">
                          {activeParagraphs.map((p) => {
                            const extendedFinalText =
                              p.modifiedText ||
                              (p.extensionText
                                ? `${p.originalText}\n${p.extensionText}`
                                : p.originalText);
                            const isExtended =
                              p.status === 'EXTENDIDO' &&
                              Boolean(p.modifiedText || p.extensionText);
                            const showDiff = Boolean(expandedDiffIds[p.id]);

                            return (
                              <div key={p.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5 max-w-3xl">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="font-mono font-bold text-[#4A154B] dark:text-purple-300">§ {p.number}</span>
                                    {p.title && (
                                      <>
                                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{p.title}</span>
                                      </>
                                    )}
                                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className={isExtended ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                                      {isExtended ? 'Ampliado por moción extensiva' : 'Texto aprobado'}
                                    </span>
                                  </div>

                                  {isExtended && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedDiffIds((prev) => ({
                                          ...prev,
                                          [p.id]: !prev[p.id]
                                        }))
                                      }
                                      className="text-xs font-bold text-[#4A154B] dark:text-purple-300 hover:underline cursor-pointer"
                                    >
                                      {showDiff ? 'Ocultar comparación' : 'Ver ampliación aprobada'}
                                    </button>
                                  )}
                                </div>

                                <p className="font-serif-doc text-[15px] sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                  {isExtended ? extendedFinalText : p.originalText}
                                </p>

                                {isExtended && showDiff && (
                                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs">
                                    <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                                      Comparación de ampliación aprobada:
                                    </div>
                                    <InlineDiffViewer
                                      original={p.originalText}
                                      modified={extendedFinalText}
                                      showLegend
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {resolvedDissensus && resolvedDissensus.length > 0 && (
                        <div className="pt-4 border-t border-amber-200/70 dark:border-slate-800 space-y-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Disensos resueltos en este capítulo
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {resolvedDissensus.map((d) => {
                              const winningOpt =
                                d.winner === 'A'
                                  ? d.optionA
                                  : d.winner === 'B'
                                    ? d.optionB
                                    : d.winner === 'C'
                                      ? d.optionC
                                      : null;
                              return (
                                <div
                                  key={d.id}
                                  className="p-4 bg-white dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-bold text-slate-900 dark:text-white">{d.title}</span>
                                    {d.winner && (
                                      <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                        Opción {d.winner} aprobada
                                      </span>
                                    )}
                                  </div>
                                  {winningOpt && (
                                    <p className="font-serif-doc text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                      {winningOpt.text}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </section>

        {/* Quiet Institutional Footer */}
        <footer className="pt-6 border-t border-purple-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4A154B] dark:text-purple-400" />
            <span>Plenario Nacional FE-FA · Portal Público en Vivo</span>
          </div>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="font-bold text-[#4A154B] dark:text-purple-300 hover:underline cursor-pointer"
          >
            ¿Eres delegada/o o Secretaría Técnica? Ingresa acá
          </button>
        </footer>
      </div>

      {/* Breakdown Modal when clicking any voting */}
      <VoteBreakdownModal
        motion={breakdownMotion}
        isOpen={!!breakdownMotion}
        onClose={() => setBreakdownMotion(null)}
      />
    </div>
  );
};
