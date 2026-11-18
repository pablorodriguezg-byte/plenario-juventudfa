import React, { useEffect, useMemo, useState } from 'react';
import { CHILE_REGIONS_GEO, ChileRegionGeo } from '../../data/chileRegionsGeo';
import { ChileanRegion, Delegate, Motion } from '../../types/plenario';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  UserCheck,
  UserX,
  Users,
  Vote
} from 'lucide-react';

type MapFocus = 'ALL' | 'CENTRO_NORTE' | 'SUR' | 'MAGALLANES';

const FOCUS_CONFIG: Record<
  Exclude<MapFocus, 'ALL'>,
  { viewBox: string; title: string; subtitle: string; regionIds: ChileanRegion[] }
> = {
  CENTRO_NORTE: {
    viewBox: '55 296 155 212',
    title: 'Centro-Norte y Valle Central',
    subtitle: 'Coquimbo, Valparaíso, Metropolitana, O’Higgins y Maule',
    regionIds: ['Coquimbo', 'Valparaíso', 'Metropolitana', "O'Higgins", 'Maule']
  },
  SUR: {
    viewBox: '36 485 155 128',
    title: 'Biobío y Los Ríos',
    subtitle: 'Región del Biobío y Región de Los Ríos',
    regionIds: ['Biobío', 'Los Ríos']
  },
  MAGALLANES: {
    viewBox: '4 798 204 202',
    title: 'Zona Austral',
    subtitle: 'Magallanes y Antártica Chilena',
    regionIds: ['Magallanes']
  }
};

// Y positions tuned cleanly for non-overlapping right-hand cartographic leader callouts
const MAIN_LABEL_Y: Partial<Record<ChileanRegion, number>> = {
  Coquimbo: 344,
  Valparaíso: 394,
  Metropolitana: 421,
  "O'Higgins": 448,
  Maule: 478,
  Biobío: 522,
  'Los Ríos': 582
};

interface ChileDelegatesMapProps {
  delegates: Delegate[];
  activeMotion?: Motion | null;
}

export const ChileDelegatesMap: React.FC<ChileDelegatesMapProps> = ({
  delegates,
  activeMotion
}) => {
  const [mapFocus, setMapFocus] = useState<MapFocus>('ALL');
  const [hoveredRegion, setHoveredRegion] = useState<ChileanRegion | null>(null);
  const [hasManualSelection, setHasManualSelection] = useState(false);

  // Strictly only voting delegates (exclude Secretaría Técnica from map and sidebar)
  const votingDelegates = useMemo(
    () => delegates.filter((d) => d.role === 'DELEGATE'),
    [delegates]
  );

  // Group voting delegates by the active map regions
  const delegatesByRegion = useMemo(() => {
    const map = new Map<ChileanRegion, Delegate[]>();
    for (const r of CHILE_REGIONS_GEO) {
      map.set(r.id, []);
    }
    for (const d of votingDelegates) {
      const list = map.get(d.region);
      if (list) {
        list.push(d);
      }
    }
    return map;
  }, [votingDelegates]);

  const defaultSelectedRegion = useMemo<ChileanRegion>(() => {
    const firstActive = CHILE_REGIONS_GEO.find(
      (r) => (delegatesByRegion.get(r.id) || []).length > 0
    );
    return firstActive ? firstActive.id : 'Metropolitana';
  }, [delegatesByRegion]);

  const [selectedRegion, setSelectedRegion] = useState<ChileanRegion>(defaultSelectedRegion);

  useEffect(() => {
    if (!hasManualSelection) {
      setSelectedRegion(defaultSelectedRegion);
    }
  }, [defaultSelectedRegion, hasManualSelection]);

  const handleSelectRegion = (regionId: ChileanRegion) => {
    setHasManualSelection(true);
    setSelectedRegion(regionId);
  };

  const selectedGeo: ChileRegionGeo = useMemo(
    () => CHILE_REGIONS_GEO.find((r) => r.id === selectedRegion) || CHILE_REGIONS_GEO[2],
    [selectedRegion]
  );

  const selectedIndex = useMemo(
    () => CHILE_REGIONS_GEO.findIndex((r) => r.id === selectedGeo.id),
    [selectedGeo.id]
  );

  const regionDelegates = useMemo(
    () => delegatesByRegion.get(selectedGeo.id) || [],
    [delegatesByRegion, selectedGeo.id]
  );

  const regionsWithDelegates = useMemo(
    () => CHILE_REGIONS_GEO.filter((r) => (delegatesByRegion.get(r.id) || []).length > 0),
    [delegatesByRegion]
  );

  const totalMappedDelegates = useMemo(
    () =>
      CHILE_REGIONS_GEO.reduce(
        (acc, r) => acc + (delegatesByRegion.get(r.id) || []).length,
        0
      ),
    [delegatesByRegion]
  );

  const hoveredGeo = useMemo(
    () => (hoveredRegion ? CHILE_REGIONS_GEO.find((r) => r.id === hoveredRegion) || null : null),
    [hoveredRegion]
  );

  const stepRegion = (delta: -1 | 1) => {
    const nextIdx = (selectedIndex + delta + CHILE_REGIONS_GEO.length) % CHILE_REGIONS_GEO.length;
    handleSelectRegion(CHILE_REGIONS_GEO[nextIdx].id);
  };

  const getRegionFill = (r: ChileRegionGeo) => {
    const count = (delegatesByRegion.get(r.id) || []).length;
    const isSelected = r.id === selectedGeo.id;
    const isHovered = r.id === hoveredRegion;

    if (isSelected) return r.accent;
    if (isHovered) return count > 0 ? r.accent : '#94A3B8';
    if (count > 0) return `${r.accent}C8`;
    return '#DCE6F2';
  };

  const getRegionStroke = (r: ChileRegionGeo) => {
    if (r.id === selectedGeo.id) return '#0F172A';
    if (r.id === hoveredRegion) return '#334155';
    return '#FFFFFF';
  };

  const mainRegions = useMemo(
    () => CHILE_REGIONS_GEO.filter((r) => r.id !== 'Magallanes'),
    []
  );
  const magallanesGeo = useMemo(
    () => CHILE_REGIONS_GEO.find((r) => r.id === 'Magallanes') || null,
    []
  );

  return (
    <div className="bg-white/95 backdrop-blur border border-purple-200/80 rounded-3xl shadow-sm overflow-hidden">
      {/* Top Cartography Header */}
      <div className="px-5 sm:px-7 py-5 bg-gradient-to-r from-[#4A154B] via-[#6D1D6E] to-[#0284C7] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-purple-100">
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Mapa Territorial de Delegaciones</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {CHILE_REGIONS_GEO.length} regiones en mapa
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {regionsWithDelegates.length} con delegados registrados
            </span>
          </div>
          <h2 className="font-serif-doc text-2xl sm:text-3xl font-semibold text-white">
            Explora el mapa y conoce a cada delegación regional
          </h2>
          <p className="text-xs sm:text-sm text-purple-100/95 max-w-2xl">
            Selecciona cualquier región directamente en el mapa para revisar en el menú lateral quiénes son sus delegadas y delegados registrados.
          </p>
        </div>

        {/* Focus Zoom Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-white/15 backdrop-blur-sm p-1 rounded-xl border border-white/20 shrink-0">
          {(
            [
              { id: 'ALL', label: 'Mapa Completo' },
              { id: 'CENTRO_NORTE', label: 'Centro (IV a VII)' },
              { id: 'SUR', label: 'Biobío y Los Ríos' },
              { id: 'MAGALLANES', label: 'Magallanes' }
            ] as const
          ).map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setMapFocus(z.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                mapFocus === z.id
                  ? 'bg-white text-[#4A154B] shadow-xs'
                  : 'text-white/90 hover:bg-white/15'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Map + Regional Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* LEFT STAGE: Redesigned 8-Region Map Canvas */}
        <div className="lg:col-span-7 p-4 sm:p-6 bg-gradient-to-br from-sky-50 via-cyan-50/60 to-indigo-50/70 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between gap-4">
          <div className="relative rounded-2xl bg-gradient-to-b from-[#E8F4FD] via-[#DFEFFD] to-[#D4EAFD] border border-sky-200/90 p-3 sm:p-5 overflow-hidden min-h-[470px] flex flex-col justify-between gap-3">
            {/* Hover / Current Context Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 z-10">
              <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-sky-200 text-xs shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#4A154B] shrink-0" />
                {hoveredGeo ? (
                  <span className="font-bold text-slate-900">
                    {hoveredGeo.numeral} · {hoveredGeo.id}{' '}
                    <span className="text-slate-500 font-normal">
                      ({(delegatesByRegion.get(hoveredGeo.id) || []).length}{' '}
                      {(delegatesByRegion.get(hoveredGeo.id) || []).length === 1
                        ? 'delegado/a'
                        : 'delegados/as'})
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-700 font-medium">
                    {mapFocus === 'ALL'
                      ? 'Haz clic en una región o en su etiqueta para ver sus delegados'
                      : `${FOCUS_CONFIG[mapFocus].title}: ${FOCUS_CONFIG[mapFocus].subtitle}`}
                  </span>
                )}
              </div>

              <span className="text-[11px] font-mono text-sky-900/70 hidden sm:inline">
                Cartografía Oficial BCN
              </span>
            </div>

            {mapFocus === 'ALL' ? (
              /* Redesigned Unified Dual-Frame Canvas (Coquimbo→Los Ríos + Magallanes) */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-1">
                {/* Main Territorial Column: Coquimbo, Valparaíso, RM, O'Higgins, Maule, Biobío, Los Ríos */}
                <div className="md:col-span-7 bg-white/60 backdrop-blur-[2px] rounded-2xl border border-sky-200/80 p-3 flex flex-col justify-between min-h-[410px]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-950/80 px-1 pb-1">
                    <span>Centro-Norte a Los Ríos</span>
                    <span className="font-mono text-[10px] text-sky-700">IV · V · RM · VI · VII · VIII · XIV</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center min-h-[370px]">
                    <svg
                      viewBox="32 294 198 318"
                      className="w-full h-full max-h-[430px] select-none"
                      role="img"
                      aria-label="Mapa interactivo de Coquimbo a Los Ríos"
                    >
                      {/* Graticule grid */}
                      <g stroke="#BAE6FD" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.75">
                        <line x1="32" y1="360" x2="230" y2="360" />
                        <line x1="32" y1="440" x2="230" y2="440" />
                        <line x1="32" y1="520" x2="230" y2="520" />
                        <line x1="95" y1="294" x2="95" y2="612" />
                      </g>

                      {mainRegions.map((r) => {
                        const isSelected = r.id === selectedGeo.id;
                        const isHovered = r.id === hoveredRegion;
                        const count = (delegatesByRegion.get(r.id) || []).length;
                        const labelY = MAIN_LABEL_Y[r.id] ?? r.centroid[1];

                        return (
                          <g
                            key={r.id}
                            onClick={() => handleSelectRegion(r.id)}
                            onMouseEnter={() => setHoveredRegion(r.id)}
                            onMouseLeave={() => setHoveredRegion(null)}
                            className="cursor-pointer"
                          >
                            <path
                              d={r.path}
                              fill={getRegionFill(r)}
                              stroke={getRegionStroke(r)}
                              strokeWidth={isSelected ? 1.8 : 0.9}
                              strokeLinejoin="round"
                            />

                            {/* Clean Cartographic Leader Line + Clickable Region Label */}
                            <line
                              x1={r.centroid[0]}
                              y1={r.centroid[1]}
                              x2="138"
                              y2={labelY}
                              stroke={isSelected ? '#0F172A' : isHovered ? '#334155' : '#64748B'}
                              strokeWidth={isSelected ? 1.1 : 0.7}
                              strokeDasharray={isSelected ? undefined : '2 1.5'}
                            />
                            <circle
                              cx={r.centroid[0]}
                              cy={r.centroid[1]}
                              r={isSelected ? 3.1 : count > 0 ? 2.6 : 1.9}
                              fill={isSelected ? '#0F172A' : count > 0 ? '#FFFFFF' : '#64748B'}
                              stroke={isSelected ? '#FFFFFF' : r.accent}
                              strokeWidth="0.9"
                            />

                            {/* Label Box */}
                            <rect
                              x="139"
                              y={labelY - 8.5}
                              width="86"
                              height="17"
                              rx="4.5"
                              fill={isSelected ? '#0F172A' : '#FFFFFF'}
                              stroke={isSelected ? '#0F172A' : isHovered ? '#4A154B' : '#CBD5E1'}
                              strokeWidth={isSelected ? 1.1 : 0.7}
                            />
                            <text
                              x="144"
                              y={labelY + 2.8}
                              fontSize="6.7"
                              fontWeight="800"
                              fill={isSelected ? '#FFFFFF' : '#1E293B'}
                            >
                              {r.numeral} · {r.id === "O'Higgins" ? "O'Higgins" : r.id}
                            </text>
                            <text
                              x="220"
                              y={labelY + 2.8}
                              textAnchor="end"
                              fontSize="6.7"
                              fontWeight="900"
                              fill={
                                isSelected
                                  ? '#FDE68A'
                                  : count > 0
                                    ? r.accent
                                    : '#94A3B8'
                              }
                            >
                              {count}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Austral Column: Magallanes & Summary Card */}
                <div className="md:col-span-5 flex flex-col gap-3 justify-between">
                  {magallanesGeo && (
                    <div
                      onClick={() => handleSelectRegion(magallanesGeo.id)}
                      onMouseEnter={() => setHoveredRegion(magallanesGeo.id)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectRegion(magallanesGeo.id);
                        }
                      }}
                      className={`flex-1 rounded-2xl border p-3.5 flex flex-col justify-between transition-colors cursor-pointer min-h-[260px] ${
                        selectedGeo.id === magallanesGeo.id
                          ? 'bg-white border-slate-900 shadow-sm'
                          : 'bg-white/75 hover:bg-white border-sky-200/90'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-extrabold text-slate-900">
                            XII · Magallanes
                          </div>
                          <div className="text-[11px] text-slate-500">Zona Austral</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-lg font-mono text-xs font-black tabular-nums ${
                            selectedGeo.id === magallanesGeo.id
                              ? 'bg-slate-900 text-amber-300'
                              : (delegatesByRegion.get(magallanesGeo.id) || []).length > 0
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {(delegatesByRegion.get(magallanesGeo.id) || []).length} deleg.
                        </span>
                      </div>

                      <div className="flex-1 flex items-center justify-center py-1">
                        <svg
                          viewBox="6 800 202 198"
                          className="w-full h-full max-h-[210px] select-none"
                          role="img"
                          aria-label="Mapa interactivo de la Región de Magallanes"
                        >
                          <path
                            d={magallanesGeo.path}
                            fill={getRegionFill(magallanesGeo)}
                            stroke={getRegionStroke(magallanesGeo)}
                            strokeWidth={selectedGeo.id === magallanesGeo.id ? 2.4 : 1.1}
                            strokeLinejoin="round"
                          />
                          {(delegatesByRegion.get(magallanesGeo.id) || []).length > 0 && (
                            <circle
                              cx={magallanesGeo.centroid[0]}
                              cy={magallanesGeo.centroid[1]}
                              r="4.5"
                              fill="#FFFFFF"
                              stroke={magallanesGeo.accent}
                              strokeWidth="1.6"
                            />
                          )}
                        </svg>
                      </div>

                      <div className="text-[11px] text-slate-500 text-center">
                        Capital regional: <strong className="text-slate-700">{magallanesGeo.capital}</strong>
                      </div>
                    </div>
                  )}

                  {/* Territorial Representation Meter */}
                  <div className="bg-white/90 rounded-2xl border border-sky-200/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Presencia Territorial</span>
                      <span className="font-mono font-black text-[#4A154B] tabular-nums">
                        {regionsWithDelegates.length} / {CHILE_REGIONS_GEO.length} regiones
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4A154B] via-sky-600 to-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(regionsWithDelegates.length / CHILE_REGIONS_GEO.length) * 100}%`
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Solo se muestran delegadas y delegados acreditados con derecho a voto.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Macro-Zone Zoomed SVG */
              <div className="h-[410px] sm:h-[450px] w-full bg-white/55 rounded-2xl border border-sky-200/80 p-3 flex items-center justify-center">
                <svg
                  viewBox={FOCUS_CONFIG[mapFocus].viewBox}
                  className="h-full w-full max-h-[430px] select-none"
                  role="img"
                  aria-label={FOCUS_CONFIG[mapFocus].title}
                >
                  {CHILE_REGIONS_GEO.map((r) => {
                    const isSelected = r.id === selectedGeo.id;
                    const count = (delegatesByRegion.get(r.id) || []).length;
                    const inView = FOCUS_CONFIG[mapFocus].regionIds.includes(r.id);
                    if (!inView && mapFocus === 'MAGALLANES') return null;

                    return (
                      <g
                        key={`zoom-${r.id}`}
                        onClick={() => handleSelectRegion(r.id)}
                        onMouseEnter={() => setHoveredRegion(r.id)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        className="cursor-pointer"
                      >
                        <path
                          d={r.path}
                          fill={getRegionFill(r)}
                          stroke={getRegionStroke(r)}
                          strokeWidth={isSelected ? 1.8 : 0.9}
                          strokeLinejoin="round"
                        />
                        {inView && (
                          <g pointerEvents="none">
                            <text
                              x={r.centroid[0]}
                              y={r.centroid[1]}
                              textAnchor="middle"
                              fontSize={mapFocus === 'MAGALLANES' ? '7.5' : '5.6'}
                              fontWeight="800"
                              fill={isSelected || count > 0 ? '#FFFFFF' : '#1E293B'}
                              stroke={isSelected || count > 0 ? '#0F172A' : '#FFFFFF'}
                              strokeWidth="0.9"
                              paintOrder="stroke"
                            >
                              {r.numeral} · {r.id} ({count})
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Map Legend */}
            <div className="pt-2.5 border-t border-sky-200/70 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded bg-[#4A154B] inline-block" />
                  <span>Con delegados registrados</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded bg-[#DCE6F2] border border-slate-300 inline-block" />
                  <span>Sin delegados registrados</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded border-2 border-slate-900 bg-white inline-block" />
                  <span>Región seleccionada</span>
                </div>
              </div>
              {mapFocus !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setMapFocus('ALL')}
                  className="font-bold text-[#4A154B] hover:underline cursor-pointer"
                >
                  ← Volver al mapa completo
                </button>
              )}
            </div>
          </div>

          {/* 8-region quick interactive index buttons */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-600">
              Selección directa de región:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHILE_REGIONS_GEO.map((r) => {
                const count = (delegatesByRegion.get(r.id) || []).length;
                const isSelected = r.id === selectedGeo.id;
                return (
                  <button
                    key={`chip-${r.id}`}
                    type="button"
                    onClick={() => handleSelectRegion(r.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors border cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : count > 0
                          ? 'bg-white hover:bg-purple-50 text-slate-800 border-purple-200'
                          : 'bg-white/65 hover:bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: count > 0 ? r.accent : '#CBD5E1' }}
                    />
                    <span>
                      {r.numeral} · {r.id}
                    </span>
                    <span
                      className={`font-mono tabular-nums text-[10px] ${
                        isSelected ? 'text-purple-200' : count > 0 ? 'text-[#4A154B]' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT LATERAL PANEL: MENÚ LATERAL DE DELEGADOS DE LA REGIÓN */}
        <aside
          aria-live="polite"
          className="lg:col-span-5 bg-white flex flex-col justify-between min-h-[540px]"
        >
          <div>
            {/* Selected Region Banner */}
            <div
              className="p-5 sm:p-6 border-b border-slate-200 text-white"
              style={{
                background: `linear-gradient(135deg, ${selectedGeo.accent} 0%, #1E1B4B 100%)`
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                  <span className="font-mono font-black">{selectedGeo.numeral}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedGeo.zone}</span>
                  <span aria-hidden="true">·</span>
                  <span>Capital: {selectedGeo.capital}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => stepRegion(-1)}
                    aria-label="Región anterior"
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepRegion(1)}
                    aria-label="Región siguiente"
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-serif-doc text-xl sm:text-2xl font-semibold text-white leading-snug">
                {selectedGeo.fullName}
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/90 font-medium tabular-nums">
                <Users className="w-3.5 h-3.5" />
                <span>
                  <strong>{regionDelegates.length}</strong>{' '}
                  {regionDelegates.length === 1 ? 'delegado/a registrado/a' : 'delegados/as registrados/as'}
                </span>
              </div>
            </div>

            {/* Region Delegates List or Empty State */}
            <div className="p-5 sm:p-6">
              {regionDelegates.length === 0 ? (
                <div className="py-12 px-5 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 mx-auto flex items-center justify-center text-slate-400 shadow-2xs">
                    <UserX className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-black text-slate-900">
                      Esta región no tiene delegados registrados
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      No hay delegadas ni delegados acreditados en <strong>{selectedGeo.fullName}</strong> hasta este momento.
                    </p>
                  </div>

                  {regionsWithDelegates.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500">
                        Explorar regiones con delegados activos:
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {regionsWithDelegates.slice(0, 6).map((r) => (
                          <button
                            key={`jump-${r.id}`}
                            type="button"
                            onClick={() => handleSelectRegion(r.id)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 border border-purple-200 text-xs font-bold text-[#4A154B] cursor-pointer"
                          >
                            {r.numeral} · {r.id} ({(delegatesByRegion.get(r.id) || []).length})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
                  {regionDelegates.map((member) => {
                    const castVote = activeMotion?.votes?.[member.id];
                    return (
                      <div
                        key={member.id}
                        className="p-3.5 rounded-2xl bg-slate-50/90 hover:bg-white border border-slate-200 transition-colors flex items-start gap-3"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 overflow-hidden shadow-2xs"
                          style={{ backgroundColor: selectedGeo.accent }}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            member.name
                              .split(' ')
                              .slice(0, 2)
                              .map((w) => w.charAt(0))
                              .join('')
                              .toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-black text-slate-900 truncate">
                              {member.name}
                            </h4>
                            <span className="font-mono text-[11px] text-slate-500">
                              @{member.username}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Delegada/o Regional (Voz y Voto)</span>
                            </span>
                            {member.organization && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="truncate">{member.organization}</span>
                              </>
                            )}
                          </div>

                          {activeMotion && (
                            <div className="pt-1 flex items-center gap-1.5 text-[11px]">
                              <Vote className="w-3 h-3 text-slate-400 shrink-0" />
                              {castVote ? (
                                <span className="font-bold text-[#4A154B]">
                                  Votó en {activeMotion.code}: {castVote.vote.replace('_', ' ')}
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  {activeMotion.status === 'VOTING'
                                    ? `Voto pendiente en ${activeMotion.code}`
                                    : `Sin voto registrado en ${activeMotion.code}`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quiet Sidebar Footer */}
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Total delegados en mapa: <strong className="text-slate-900 tabular-nums">{totalMappedDelegates}</strong>
            </span>
            <span className="font-mono text-[11px] text-slate-500">Sincronizado en vivo</span>
          </div>
        </aside>
      </div>
    </div>
  );
};
