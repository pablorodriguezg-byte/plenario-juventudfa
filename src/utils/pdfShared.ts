import { jsPDF } from 'jspdf';

export interface LogoAssets {
  whiteDataUrl: string | null;
  blueDataUrl: string | null;
  watermarkDataUrl: string | null;
}

const FA_LOGO_URL = '/assets/aistudio/239A2F73-D6B6-456E-A594-91458B73B455_b67ce703.png';

export const PDF_PALETTE = {
  PLUM: [43, 20, 77] as [number, number, number],          // #2B144D
  PLUM_MID: [75, 44, 122] as [number, number, number],     // #4B2C7A
  LAVENDER_TEXT: [91, 56, 134] as [number, number, number],// #5B3886
  GOLD: [245, 166, 35] as [number, number, number],        // #F5A623
  HEADER_BLUE: [37, 83, 158] as [number, number, number],  // #25539E
  BODY_GRAY: [55, 65, 81] as [number, number, number],     // #374151
  MUTED_GRAY: [107, 114, 128] as [number, number, number], // #6B7280
  LIGHT_GRAY: [156, 163, 175] as [number, number, number], // #9CA3AF
  BORDER_GRAY: [217, 221, 227] as [number, number, number],// #D9DDE3
  LAVENDER_BG: [243, 240, 250] as [number, number, number],// #F3F0FA
  CREAM_BG: [253, 246, 233] as [number, number, number],   // #FDF6E9
  AMBER_DARK: [180, 83, 9] as [number, number, number],    // #B45309
  EMERALD_DARK: [4, 120, 87] as [number, number, number],  // #047857
  EMERALD_BG: [236, 253, 245] as [number, number, number], // #ECFDF5
  ROSE_DARK: [185, 28, 28] as [number, number, number],    // #B91C1C
  ROSE_BG: [254, 242, 242] as [number, number, number]     // #FEF2F2
};

export const sanitizePdfText = (raw?: string | null): string => {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/✓/g, '')
    .replace(/✕/g, 'x')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/•/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    // Remove emojis / surrogate-pair glyphs unsupported by standard Helvetica in jsPDF
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .trim();
};

/**
 * Wraps text strictly inside `maxWidth` (mm) AFTER applying the exact font family,
 * style, and size so jsPDF font metrics always match what gets drawn.
 * Guarantees no single line (even unbroken URLs or codes) ever overflows `maxWidth`.
 */
export const measureTextBlock = (
  pdf: jsPDF,
  text: string,
  maxWidth: number,
  fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic',
  fontSize: number
): string[] => {
  pdf.setFont('helvetica', fontStyle);
  pdf.setFontSize(fontSize);

  const safeW = Math.max(10, maxWidth - 0.5);
  const clean = sanitizePdfText(text);
  if (!clean) return [];

  const initialLines: string[] = pdf.splitTextToSize(clean, safeW);
  const boundedLines: string[] = [];

  for (const rawLine of initialLines) {
    if (pdf.getTextWidth(rawLine) <= safeW) {
      boundedLines.push(rawLine);
      continue;
    }

    let current = '';
    for (const ch of rawLine) {
      const candidate = current + ch;
      if (pdf.getTextWidth(candidate) > safeW && current.length > 0) {
        boundedLines.push(current);
        current = ch;
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) {
      boundedLines.push(current);
    }
  }

  return boundedLines;
};

export const drawTextBlockLines = (
  pdf: jsPDF,
  lines: string[],
  x: number,
  startY: number,
  lineStepMm: number
) => {
  lines.forEach((line, idx) => {
    pdf.text(line, x, startY + idx * lineStepMm);
  });
};

export const loadLogoAssets = async (): Promise<LogoAssets> => {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar el emblema'));
      image.src = FA_LOGO_URL;
    });

    const size = 256;

    const blueCanvas = document.createElement('canvas');
    blueCanvas.width = size;
    blueCanvas.height = size;
    const blueCtx = blueCanvas.getContext('2d');
    if (blueCtx) {
      blueCtx.drawImage(img, 0, 0, size, size);
      blueCtx.globalCompositeOperation = 'source-in';
      blueCtx.fillStyle = '#25539E';
      blueCtx.fillRect(0, 0, size, size);
    }

    const whiteCanvas = document.createElement('canvas');
    whiteCanvas.width = size;
    whiteCanvas.height = size;
    const whiteCtx = whiteCanvas.getContext('2d');
    if (whiteCtx) {
      whiteCtx.drawImage(img, 0, 0, size, size);
      whiteCtx.globalCompositeOperation = 'source-in';
      whiteCtx.fillStyle = '#FFFFFF';
      whiteCtx.fillRect(0, 0, size, size);
    }

    const wmCanvas = document.createElement('canvas');
    wmCanvas.width = 420;
    wmCanvas.height = 420;
    const wmCtx = wmCanvas.getContext('2d');
    if (wmCtx) {
      wmCtx.globalAlpha = 0.085;
      wmCtx.drawImage(whiteCanvas, 0, 0, 420, 420);
    }

    return {
      blueDataUrl: blueCanvas.toDataURL('image/png'),
      whiteDataUrl: whiteCanvas.toDataURL('image/png'),
      watermarkDataUrl: wmCanvas.toDataURL('image/png')
    };
  } catch {
    return { whiteDataUrl: null, blueDataUrl: null, watermarkDataUrl: null };
  }
};

export const drawVectorEmblemFallback = (
  pdf: jsPDF,
  cx: number,
  cy: number,
  r: number,
  rgb: [number, number, number]
) => {
  pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
  pdf.setLineWidth(Math.max(0.35, r * 0.09));
  pdf.circle(cx, cy, r, 'S');
  pdf.line(cx - r * 0.85, cy + r * 0.12, cx - r * 0.25, cy - r * 0.16);
  pdf.line(cx - r * 0.25, cy - r * 0.16, cx + r * 0.85, cy + r * 0.05);
  pdf.line(cx - r * 0.25, cy - r * 0.16, cx - r * 0.45, cy + r * 0.82);
  pdf.line(cx - r * 0.25, cy - r * 0.16, cx + r * 0.05, cy + r * 0.88);
  pdf.line(cx - r * 0.1, cy - r * 0.13, cx + r * 0.45, cy + r * 0.78);
};

export const drawInstitutionalInteriorHeader = (
  pdf: jsPDF,
  logos: LogoAssets,
  leftTitleSpaced: string,
  marginX: number,
  pageW: number
) => {
  const { HEADER_BLUE, LIGHT_GRAY, BORDER_GRAY } = PDF_PALETTE;
  if (logos.blueDataUrl) {
    pdf.addImage(logos.blueDataUrl, 'PNG', marginX, 8.2, 5.4, 5.4);
  } else {
    drawVectorEmblemFallback(pdf, marginX + 2.7, 10.9, 2.7, HEADER_BLUE);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  pdf.setTextColor(HEADER_BLUE[0], HEADER_BLUE[1], HEADER_BLUE[2]);
  pdf.text(leftTitleSpaced, marginX + 7.8, 12.1);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.4);
  pdf.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
  pdf.text('F R E N T E   E S T U D I A N T I L   ·   F R E N T E   A M P L I O', pageW - marginX, 12.1, {
    align: 'right'
  });

  pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
  pdf.setLineWidth(0.25);
  pdf.line(marginX, 16.5, pageW - marginX, 16.5);
};
