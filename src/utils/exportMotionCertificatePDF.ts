import { jsPDF } from 'jspdf';
import { Motion, SynthesisChapter } from '../types/plenario';
import {
  PDF_PALETTE,
  sanitizePdfText,
  measureTextBlock,
  drawTextBlockLines,
  loadLogoAssets,
  drawVectorEmblemFallback,
  drawInstitutionalInteriorHeader
} from './pdfShared';

export interface ExportMotionCertificateOptions {
  synthesisChapters?: SynthesisChapter[];
  delegateOrganization?: string;
}

const getMotionStatusLabel = (motion: Motion): { label: string; tone: 'PLUM' | 'EMERALD' | 'ROSE' | 'AMBER' } => {
  switch (motion.status) {
    case 'APPROVED':
      return { label: 'APROBADA EN PLENARIO', tone: 'EMERALD' };
    case 'REJECTED':
      return { label: 'RECHAZADA EN SALA', tone: 'ROSE' };
    case 'VOTING':
      return { label: 'EN VOTACIÓN EN SALA', tone: 'AMBER' };
    case 'CLOSED':
      return { label: 'VOTACIÓN CERRADA', tone: 'PLUM' };
    case 'OPEN':
      return { label: 'ADMITIDA EN TABLA', tone: 'PLUM' };
    default:
      return { label: 'INGRESADA A SECRETARÍA TÉCNICA', tone: 'PLUM' };
  }
};

const computeVerificationFolio = (motion: Motion): string => {
  const seed = `${motion.id}|${motion.code}|${motion.proposedBy}|${motion.createdAt}|${motion.targetParagraphNumber || ''}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (ch + i) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const hex1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `FEFA-${sanitizePdfText(motion.code)}-${hex1.slice(0, 4)}-${hex2.slice(0, 4)}`;
};

export const exportMotionCertificatePDF = async (
  motion: Motion,
  options?: ExportMotionCertificateOptions
): Promise<void> => {
  const logos = await loadLogoAssets();

  const {
    PLUM,
    PLUM_MID,
    LAVENDER_TEXT,
    GOLD,
    BODY_GRAY,
    MUTED_GRAY,
    LIGHT_GRAY,
    BORDER_GRAY,
    LAVENDER_BG,
    CREAM_BG,
    AMBER_DARK,
    EMERALD_DARK,
    EMERALD_BG,
    ROSE_DARK,
    ROSE_BG
  } = PDF_PALETTE;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageH = pdf.internal.pageSize.getHeight();  // 297 mm
  const marginX = 21;
  const blockW = pageW - marginX * 2;               // 168 mm strict content block
  const topSafeY = 26;
  const footerSafeY = pageH - 22;

  const isExtensive = motion.motionKind === 'MOCION_EXTENSIVA';
  const kindTitle = isExtensive
    ? 'Moción Extensiva (Aditiva / Modificatoria)'
    : 'Moción Supresiva (Eliminación Total)';
  const quorumText = isExtensive
    ? 'Mayoría Simple (50% + 1)'
    : 'Quórum Calificado (2/3)';

  // Resolve chapter context if available (prefer exact paragraph ID to avoid cross-chapter § number collisions)
  const allChapters = options?.synthesisChapters || [];
  const matchingChapter =
    (motion.targetParagraphId
      ? allChapters.find((ch) => (ch.paragraphs || []).some((p) => p.id === motion.targetParagraphId))
      : undefined) ||
    allChapters.find((ch) => (ch.paragraphs || []).some((p) => p.number === motion.targetParagraphNumber));

  const matchingParagraph =
    (motion.targetParagraphId
      ? matchingChapter?.paragraphs.find((p) => p.id === motion.targetParagraphId)
      : undefined) ||
    matchingChapter?.paragraphs.find((p) => p.number === motion.targetParagraphNumber);

  const materiaLabel = matchingChapter
    ? `Capítulo ${matchingChapter.number}: ${matchingChapter.title} · Párrafo § ${motion.targetParagraphNumber || matchingParagraph?.number || '-'}`
    : `Párrafo § ${motion.targetParagraphNumber || '-'}`;

  const createdDateStr = new Date(motion.createdAt || Date.now()).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const statusMeta = getMotionStatusLabel(motion);
  const folio = computeVerificationFolio(motion);

  let y = 76;

  const startNewInteriorPage = () => {
    pdf.addPage();
    drawInstitutionalInteriorHeader(pdf, logos, 'C E R T I F I C A D O   D E   M O C I Ó N', marginX, pageW);
    y = topSafeY;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > footerSafeY && y > topSafeY + 0.5) {
      startNewInteriorPage();
    }
  };

  // --- 1. PAGE 1 INSTITUTIONAL HERO HEADER (matching Texto Final cover identity) ---
  const heroH = 66;
  pdf.setFillColor(PLUM[0], PLUM[1], PLUM[2]);
  pdf.rect(0, 0, pageW, heroH, 'F');

  // Subtle concentric decorative arcs matching Texto Final cover
  pdf.setDrawColor(62, 33, 104);
  pdf.setLineWidth(0.32);
  [26, 40, 56].forEach((r) => {
    pdf.circle(28, 22, r, 'S');
  });

  // Subtle right watermark emblem inside hero banner
  if (logos.watermarkDataUrl) {
    pdf.addImage(logos.watermarkDataUrl, 'PNG', 142, -6, 68, 68);
  }

  // Full-height golden-amber vertical stripe on page 1
  pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  pdf.rect(0, 0, 3.8, pageH, 'F');

  // Top row: Emblem + Institutional wordmark + Motion Code badge
  if (logos.whiteDataUrl) {
    pdf.addImage(logos.whiteDataUrl, 'PNG', marginX, 11, 13, 13);
  } else {
    drawVectorEmblemFallback(pdf, marginX + 6.5, 17.5, 6.5, [255, 255, 255]);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('F R E N T E   E S T U D I A N T I L', marginX + 17, 16.2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.4);
  pdf.setTextColor(186, 173, 214);
  pdf.text('F R E N T E   A M P L I O', marginX + 17, 20.8);

  // Code badge top-right inside hero
  const codeLabel = sanitizePdfText(motion.code || 'MOC-000');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  const codeBadgeW = Math.max(26, pdf.getTextWidth(codeLabel) + 8);
  pdf.setFillColor(64, 34, 110);
  pdf.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(pageW - marginX - codeBadgeW, 12, codeBadgeW, 7.5, 1.5, 1.5, 'FD');
  pdf.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  pdf.text(codeLabel, pageW - marginX - codeBadgeW / 2, 17.0, { align: 'center' });

  // Certificate Eyebrow & Title
  const heroEyebrow = measureTextBlock(
    pdf,
    'C E R T I F I C A D O   O F I C I A L   D E   I N I C I A T I V A   P A R L A M E N T A R I A',
    blockW,
    'bold',
    7.6
  );
  pdf.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  drawTextBlockLines(pdf, heroEyebrow, marginX, 34, 3.8);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Certificado de Moción Presentada', marginX, 45.5);

  pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  pdf.rect(marginX, 50, 14, 1.2, 'F');

  const heroSubLines = measureTextBlock(
    pdf,
    `${kindTitle}  ·  ${quorumText}`,
    blockW,
    'normal',
    9.5
  );
  pdf.setTextColor(210, 200, 232);
  drawTextBlockLines(pdf, heroSubLines, marginX, 58, 4.2);

  // --- 2. ATTESTATION STATEMENT ---
  const attestLines = measureTextBlock(
    pdf,
    'La Plataforma Digital del Plenario Nacional de Juventudes del Frente Estudiantil (Frente Amplio) certifica que la/el delegada/o acreditada/o individualizada/o a continuación presentó formalmente la siguiente iniciativa parlamentaria dentro del marco reglamentario vigente:',
    blockW,
    'normal',
    9.2
  );
  const attestStep = 4.35;
  ensureSpace(attestLines.length * attestStep + 5);
  pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
  drawTextBlockLines(pdf, attestLines, marginX, y, attestStep);
  y += attestLines.length * attestStep + 5.5;

  // --- 3. ACCREDITATION & METADATA CARD ---
  const cardPadX = 4.5;
  const innerW = blockW - cardPadX * 2;
  const labelColW = 42;
  const valueColW = innerW - labelColW - 2;

  const metaRows: Array<{ label: string; value: string; highlight?: 'PLUM' | 'EMERALD' | 'ROSE' | 'AMBER' }> = [
    {
      label: 'Presentada por',
      value: `${motion.proposedBy}${options?.delegateOrganization ? ` · ${options.delegateOrganization}` : ''}`
    },
    { label: 'Tipo de Moción', value: kindTitle },
    { label: 'Código y Quórum', value: `${motion.code} · ${quorumText}` },
    { label: 'Materia / Artículo', value: materiaLabel },
    { label: 'Fecha de Ingreso', value: `${createdDateStr} hrs` },
    { label: 'Estado Actual', value: statusMeta.label, highlight: statusMeta.tone }
  ];

  if (motion.resultSummary) {
    const r = motion.resultSummary;
    metaRows.push({
      label: 'Resultado en Sala',
      value: `A favor: ${r.aFavor ?? 0} (${r.percentageFavor ?? 0}%)  ·  En contra: ${r.enContra ?? 0}  ·  Abstención: ${r.abstencion ?? 0}  ·  Quórum: ${r.quorumMet ? 'Cumplido' : 'No cumplido'}`
    });
  }

  const measuredRows = metaRows.map((row) => {
    const lines = measureTextBlock(pdf, row.value, valueColW, 'bold', 8.8);
    const step = 4.1;
    const rowH = Math.max(6.2, lines.length * step + 2.4);
    return { ...row, lines, step, rowH };
  });

  const metaHeaderH = 9.0;
  const metaBodyH = measuredRows.reduce((sum, r) => sum + r.rowH, 0) + 3.0;
  const totalMetaCardH = metaHeaderH + metaBodyH;

  ensureSpace(totalMetaCardH + 4);
  const metaTop = y;

  pdf.setFillColor(LAVENDER_BG[0], LAVENDER_BG[1], LAVENDER_BG[2]);
  pdf.rect(marginX, metaTop, blockW, metaHeaderH, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.6);
  pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
  pdf.text('ACREDITACIÓN Y REGISTRO PARLAMENTARIO', marginX + cardPadX, metaTop + 5.8);

  pdf.setFillColor(255, 255, 255);
  pdf.rect(marginX, metaTop + metaHeaderH, blockW, metaBodyH, 'F');
  pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
  pdf.setLineWidth(0.2);
  pdf.line(marginX, metaTop + metaHeaderH, marginX + blockW, metaTop + metaHeaderH);

  let rowY = metaTop + metaHeaderH + 5.2;
  measuredRows.forEach((r, idx) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
    pdf.text(r.label.toUpperCase(), marginX + cardPadX, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.8);
    if (r.highlight === 'EMERALD') {
      pdf.setTextColor(EMERALD_DARK[0], EMERALD_DARK[1], EMERALD_DARK[2]);
    } else if (r.highlight === 'ROSE') {
      pdf.setTextColor(ROSE_DARK[0], ROSE_DARK[1], ROSE_DARK[2]);
    } else if (r.highlight === 'AMBER') {
      pdf.setTextColor(AMBER_DARK[0], AMBER_DARK[1], AMBER_DARK[2]);
    } else {
      pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
    }
    drawTextBlockLines(pdf, r.lines, marginX + cardPadX + labelColW, rowY, r.step);

    if (idx < measuredRows.length - 1) {
      pdf.setDrawColor(238, 240, 244);
      pdf.setLineWidth(0.18);
      pdf.line(marginX + cardPadX, rowY + r.rowH - 4.0, marginX + blockW - cardPadX, rowY + r.rowH - 4.0);
    }
    rowY += r.rowH;
  });

  pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
  pdf.setLineWidth(0.32);
  pdf.roundedRect(marginX, metaTop, blockW, totalMetaCardH, 2.2, 2.2, 'S');
  y = metaTop + totalMetaCardH + 6.5;

  // --- 4. CONTENIDO DE LA MOCIÓN ---
  const drawSectionHeading = (eyebrow: string, title: string) => {
    const titleLines = measureTextBlock(pdf, title, blockW, 'bold', 12.5);
    const titleStep = 5.4;
    ensureSpace(8 + titleLines.length * titleStep + 6);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.4);
    pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
    pdf.text(eyebrow, marginX, y);
    y += 5.2;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.5);
    pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
    drawTextBlockLines(pdf, titleLines, marginX, y, titleStep);
    y += titleLines.length * titleStep - 0.5;

    pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    pdf.rect(marginX, y, blockW, 0.9, 'F');
    y += 5.5;
  };

  drawSectionHeading('C O N T E N I D O   D E   L A   M O C I Ó N', motion.title || kindTitle);

  if (motion.description) {
    const descLines = measureTextBlock(pdf, motion.description, blockW, 'normal', 9.0);
    const descStep = 4.25;
    ensureSpace(descLines.length * descStep + 4);
    pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
    drawTextBlockLines(pdf, descLines, marginX, y, descStep);
    y += descLines.length * descStep + 4.5;
  }

  // Helper to render framed prose cards safely across pages if long
  const drawFramedProseCard = (
    stripTitle: string,
    bodyText: string,
    stripBg: [number, number, number],
    stripFg: [number, number, number],
    bodyBg: [number, number, number] = [255, 255, 255]
  ) => {
    const stripLines = measureTextBlock(pdf, stripTitle, innerW, 'bold', 7.5);
    const stripStep = 3.7;
    const stripH = Math.max(7.8, stripLines.length * stripStep + 4.0);

    const bodyLines = measureTextBlock(pdf, bodyText || '(Sin texto registrado)', innerW, 'normal', 9.3);
    const bodyStep = 4.45;
    const padTop = 5.4;
    const padBot = 3.2;
    const fullBodyH = padTop + Math.max(1, bodyLines.length) * bodyStep + padBot;
    const totalH = stripH + fullBodyH;

    if (y + totalH <= footerSafeY || totalH <= footerSafeY - topSafeY - 2) {
      ensureSpace(totalH + 2);
      const top = y;

      pdf.setFillColor(stripBg[0], stripBg[1], stripBg[2]);
      pdf.rect(marginX, top, blockW, stripH, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(stripFg[0], stripFg[1], stripFg[2]);
      drawTextBlockLines(pdf, stripLines, marginX + cardPadX, top + 5.0, stripStep);

      const bTop = top + stripH;
      pdf.setFillColor(bodyBg[0], bodyBg[1], bodyBg[2]);
      pdf.rect(marginX, bTop, blockW, fullBodyH, 'F');
      pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
      pdf.setLineWidth(0.2);
      pdf.line(marginX, bTop, marginX + blockW, bTop);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.3);
      pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
      drawTextBlockLines(pdf, bodyLines, marginX + cardPadX, bTop + padTop, bodyStep);

      pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(marginX, top, blockW, totalH, 2.0, 2.0, 'S');
      y = top + totalH + 5.0;
    } else {
      // Multi-page chunked framed block for exceptionally long paragraphs
      ensureSpace(stripH + 20);
      let lineIdx = 0;
      let firstChunk = true;

      while (lineIdx < bodyLines.length) {
        const segTop = y;
        let bTop = segTop;
        if (firstChunk) {
          pdf.setFillColor(stripBg[0], stripBg[1], stripBg[2]);
          pdf.rect(marginX, segTop, blockW, stripH, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(stripFg[0], stripFg[1], stripFg[2]);
          drawTextBlockLines(pdf, stripLines, marginX + cardPadX, segTop + 5.0, stripStep);
          bTop = segTop + stripH;
        }

        const avail = footerSafeY - (bTop + padTop + padBot);
        const maxLinesHere = Math.max(1, Math.floor(avail / bodyStep));
        const chunk = bodyLines.slice(lineIdx, lineIdx + maxLinesHere);
        const chunkH = padTop + chunk.length * bodyStep + padBot;
        const segH = (bTop - segTop) + chunkH;

        pdf.setFillColor(bodyBg[0], bodyBg[1], bodyBg[2]);
        pdf.rect(marginX, bTop, blockW, chunkH, 'F');
        if (firstChunk) {
          pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
          pdf.setLineWidth(0.2);
          pdf.line(marginX, bTop, marginX + blockW, bTop);
        }

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.3);
        pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
        drawTextBlockLines(pdf, chunk, marginX + cardPadX, bTop + padTop, bodyStep);

        pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(marginX, segTop, blockW, segH, 2.0, 2.0, 'S');

        lineIdx += chunk.length;
        firstChunk = false;

        if (lineIdx < bodyLines.length) {
          startNewInteriorPage();
        } else {
          y = segTop + segH + 5.0;
        }
      }
    }
  };

  // 4A. Original Base Paragraph Card
  const originalText = motion.originalParagraphText || matchingParagraph?.originalText || '';
  if (originalText) {
    drawFramedProseCard(
      `TEXTO BASE ORIGINAL DEL PÁRRAFO § ${motion.targetParagraphNumber || matchingParagraph?.number || '-'}`,
      originalText,
      [241, 245, 249],
      BODY_GRAY
    );
  }

  // 4B. Motion-Specific Content Card
  if (isExtensive) {
    const proposedText = motion.proposedEditedText || motion.proposedExtensionText || '';
    drawFramedProseCard(
      `REDACCIÓN PROPUESTA EN LA MOCIÓN EXTENSIVA / ADITIVA (${motion.code})`,
      proposedText,
      LAVENDER_BG,
      PLUM
    );
  } else {
    drawFramedProseCard(
      `EFECTO SOLICITADO EN LA MOCIÓN SUPRESIVA (${motion.code})`,
      `Se solicita formalmente al Plenario Nacional la supresión total e íntegra del Párrafo § ${
        motion.targetParagraphNumber || matchingParagraph?.number || '-'
      } del documento definitivo de Síntesis Nacional. Su aprobación exige Quórum Calificado de Dos Tercios (2/3) de los votos válidamente emitidos.`,
      ROSE_BG,
      ROSE_DARK,
      [255, 252, 252]
    );
  }

  // --- 5. DIGITAL SEAL & VERIFICATION FOLIO ---
  const sealLines = measureTextBlock(
    pdf,
    `Folio de verificación: ${folio}  ·  Emitido por Secretaría Técnica Nacional FE-FA · Frente Amplio.`,
    innerW,
    'normal',
    7.8
  );
  const sealStep = 3.8;
  const sealBoxH = 12 + sealLines.length * sealStep;
  ensureSpace(sealBoxH + 4);

  const sealTop = y + 1;
  pdf.setFillColor(CREAM_BG[0], CREAM_BG[1], CREAM_BG[2]);
  pdf.setDrawColor(245, 198, 120);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(marginX, sealTop, blockW, sealBoxH, 2.0, 2.0, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.0);
  pdf.setTextColor(AMBER_DARK[0], AMBER_DARK[1], AMBER_DARK[2]);
  pdf.text('CERTIFICACIÓN DIGITAL Y FE PÚBLICA DEL PLENARIO', marginX + cardPadX, sealTop + 6.0);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
  drawTextBlockLines(pdf, sealLines, marginX + cardPadX, sealTop + 10.8, sealStep);

  // --- 6. FOOTERS ACROSS ALL PAGES ---
  const totalPages = pdf.getNumberOfPages();
  for (let pNum = 1; pNum <= totalPages; pNum++) {
    pdf.setPage(pNum);
    pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    pdf.setLineWidth(0.25);
    pdf.line(marginX, pageH - 17, pageW - marginX, pageH - 17);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.6);
    pdf.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
    pdf.text(
      `Certificado de moción ${sanitizePdfText(motion.code)} · documento compartible del Plenario Nacional FE-FA`,
      marginX,
      pageH - 11.5
    );

    if (totalPages > 1) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);
      pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
      pdf.text(`${pNum} / ${totalPages}`, pageW - marginX, pageH - 11.5, { align: 'right' });
    }
  }

  const safeCode = sanitizePdfText(motion.code || 'MOCION').replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`Certificado_${safeCode}_FE-FA.pdf`);
};
