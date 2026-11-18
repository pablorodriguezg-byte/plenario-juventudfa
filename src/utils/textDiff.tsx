import React from 'react';

export interface DiffWord {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

/**
 * Computes word-by-word diff between original and modified text using Longest Common Subsequence (LCS).
 */
export function computeWordDiff(original: string, modified: string): DiffWord[] {
  const origWords = (original || '').trim().split(/\s+/).filter(Boolean);
  const modWords = (modified || '').trim().split(/\s+/).filter(Boolean);

  if (origWords.length === 0 && modWords.length === 0) return [];
  if (origWords.length === 0) {
    return modWords.map(w => ({ type: 'added', text: w }));
  }
  if (modWords.length === 0) {
    return origWords.map(w => ({ type: 'removed', text: w }));
  }

  const n = origWords.length;
  const m = modWords.length;

  // DP table for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origWords[i - 1] === modWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to assemble diff
  const result: DiffWord[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === modWords[j - 1]) {
      result.unshift({ type: 'unchanged', text: origWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: modWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'removed', text: origWords[i - 1] });
      i--;
    }
  }

  return result;
}

/**
 * Validates that an extensive motion edit preserves part of the original base text
 * and does not erase the original paragraph entirely.
 */
export function validateExtensiveEdit(original: string, modified: string): {
  isValid: boolean;
  error?: string;
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
} {
  const trimmedMod = (modified || '').trim();
  const trimmedOrig = (original || '').trim();

  if (!trimmedMod) {
    return {
      isValid: false,
      error: 'El texto no puede quedar vacío. Debe conservar la base del párrafo aprobado.',
      addedCount: 0,
      removedCount: 0,
      unchangedCount: 0
    };
  }

  if (trimmedMod === trimmedOrig) {
    return {
      isValid: false,
      error: 'No se han realizado modificaciones. Edite el texto agregando palabras (en morado) o modificando partes específicas.',
      addedCount: 0,
      removedCount: 0,
      unchangedCount: trimmedOrig.split(/\s+/).length
    };
  }

  const diff = computeWordDiff(trimmedOrig, trimmedMod);
  const unchangedCount = diff.filter(d => d.type === 'unchanged').length;
  const addedCount = diff.filter(d => d.type === 'added').length;
  const removedCount = diff.filter(d => d.type === 'removed').length;

  if (unchangedCount === 0) {
    return {
      isValid: false,
      error: 'No se puede borrar todo el texto original. Las mociones extensivas permiten editar y complementar el párrafo aprobado, no reemplazarlo por completo.',
      addedCount,
      removedCount,
      unchangedCount: 0
    };
  }

  return {
    isValid: true,
    addedCount,
    removedCount,
    unchangedCount
  };
}

interface InlineDiffViewerProps {
  original: string;
  modified?: string;
  className?: string;
  showLegend?: boolean;
}

export const InlineDiffViewer: React.FC<InlineDiffViewerProps> = ({
  original,
  modified,
  className = '',
  showLegend = false
}) => {
  if (!modified || modified.trim() === (original || '').trim()) {
    return <span className={className}>{original}</span>;
  }

  const diff = computeWordDiff(original, modified);
  const hasAdditions = diff.some(d => d.type === 'added');
  const hasDeletions = diff.some(d => d.type === 'removed');

  return (
    <div className="space-y-1.5">
      <p className={`leading-relaxed text-slate-800 ${className}`}>
        {diff.map((item, idx) => {
          if (item.type === 'unchanged') {
            return (
              <React.Fragment key={idx}>
                <span>{item.text}</span>
                <span> </span>
              </React.Fragment>
            );
          }
          if (item.type === 'added') {
            return (
              <React.Fragment key={idx}>
                <span
                  className="inline bg-purple-100 text-purple-950 font-bold px-1.5 py-0.5 rounded border border-purple-300 underline decoration-purple-600 decoration-2 shadow-2xs mx-0.5"
                  title="Palabra agregada en la moción extensiva"
                >
                  {item.text}
                </span>
                <span> </span>
              </React.Fragment>
            );
          }
          if (item.type === 'removed') {
            return (
              <React.Fragment key={idx}>
                <span
                  className="inline bg-rose-100 text-rose-800 line-through px-1.5 py-0.5 rounded border border-rose-300 opacity-80 select-none shadow-2xs mx-0.5"
                  title="Palabra reemplazada/suprimida"
                >
                  {item.text}
                </span>
                <span> </span>
              </React.Fragment>
            );
          }
          return null;
        })}
      </p>

      {showLegend && (hasAdditions || hasDeletions) && (
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono select-none">
          {hasAdditions && (
            <span className="inline-flex items-center gap-1.5 text-purple-950 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-[#4A154B]" />
              <span>Morado: Palabras agregadas</span>
            </span>
          )}
          {hasDeletions && (
            <span className="inline-flex items-center gap-1.5 text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Rojo tachado: Palabras reemplazadas</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
