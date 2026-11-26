import { jsPDF } from 'jspdf';
import { Motion, PresynthesisParagraph, SynthesisChapter } from '../types/plenario';
import {
  PDF_PALETTE,
  sanitizePdfText,
  measureTextBlock,
  drawTextBlockLines,
  loadLogoAssets,
  drawVectorEmblemFallback,
  drawInstitutionalInteriorHeader
} from './pdfShared';

export interface ExportTextoFinalPDFParams {
  synthesisChapters: SynthesisChapter[];
  motionsHistory: Motion[];
  isPresynthesisApproved: boolean;
  accreditedDelegatesCount: number;
}

const compareParagraphNumbers = (a: PresynthesisParagraph, b: PresynthesisParagraph): number => {
  const partsA = (a.number || '').split(/[^0-9]+/).filter(Boolean).map(Number);
  const partsB = (b.number || '').split(/[^0-9]+/).filter(Boolean).map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const na = partsA[i] ?? 0;
    const nb = partsB[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return (a.number || '').localeCompare(b.number || '', 'es', { numeric: true });
};

const getMotionKindLabel = (kind?: Motion['motionKind']): string => {
  switch (kind) {
    case 'GENERAL_PRESINTESIS':
      return 'Votación General de Presíntesis';
    case 'DISENSO_PRIMERA_VUELTA':
      return 'Disenso (1ª Vuelta A/B/C)';
    case 'DISENSO_SEGUNDA_VUELTA':
      return 'Disenso (Balotaje 2ª Vuelta)';
    case 'MOCION_EXTENSIVA':
      return 'Moción Extensiva (50%+1)';
    case 'MOCION_SUPRESIVA':
      return 'Moción Supresiva (2/3)';
    case 'GENERAL_SINTESIS_FINAL':
      return 'Ratificación de Síntesis Final';
    case 'MOCION_ORDINARIA':
      return 'Moción General de Sala';
    default:
      return 'Votación Plenaria';
  }
};

const getQuorumLabel = (quorum?: Motion['quorumType']): string => {
  switch (quorum) {
    case 'TWO_THIRDS':
      return 'Quórum 2/3';
    case 'ABSOLUTE_MAJORITY':
      return 'Mayoría Absoluta (>50%)';
    default:
      return 'Mayoría Simple (50%+1)';
  }
};

interface TocItem {
  kind: 'CHAPTER' | 'DISSENSUS' | 'HISTORY';
  prefix: string;
  title: string;
  pageNum: number;
}

export const exportTextoFinalPDF = async ({
  synthesisChapters,
  motionsHistory,
  isPresynthesisApproved,
  accreditedDelegatesCount
}: ExportTextoFinalPDFParams): Promise<void> => {
  const logos = await loadLogoAssets();

  const sortedChapters = [...(synthesisChapters || [])].sort((a, b) => a.number - b.number);

  let globalDissensusCounter = 0;
  const chapterPrepared = sortedChapters.map((ch) => {
    const approvedParagraphs = isPresynthesisApproved
      ? [...(ch.paragraphs || [])]
          .filter((p) => p.status !== 'SUPRIMIDO')
          .sort(compareParagraphNumbers)
      : [];

    const resolvedDissensuses = (ch.dissensusItems || [])
      .filter((d) => d.status === 'RESUELTO')
      .map((d) => {
        globalDissensusCounter += 1;
        return { item: d, indexNumber: globalDissensusCounter };
      });

    return {
      chapter: ch,
      approvedParagraphs,
      resolvedDissensuses
    };
  });

  const concludedMotions = [...(motionsHistory || [])]
    .filter(
      (m) =>
        m.status === 'APPROVED' ||
        m.status === 'REJECTED' ||
        m.status === 'CLOSED' ||
        m.status === 'PASSED_TO_RUNOFF'
    )
    .sort((a, b) => (a.closedAt || a.startedAt || a.createdAt) - (b.closedAt || b.startedAt || b.createdAt));

  const baseTocEntriesCount =
    chapterPrepared.length +
    chapterPrepared.reduce((sum, c) => sum + c.resolvedDissensuses.length, 0) +
    1;

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
    ROSE_DARK
  } = PDF_PALETTE;

  const buildPdfDocument = (tocItemsFromPass1: TocItem[] | null): { pdf: jsPDF; collectedToc: TocItem[] } => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Strict page geometry & bounded content block
    const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297 mm
    const marginX = 21;                               // 21 mm left/right margin
    const blockW = pageW - marginX * 2;               // 168 mm bounded content block
    const topSafeY = 26;                              // below interior header
    const footerSafeY = pageH - 22;                   // 275 mm, above footer line
    const maxBlockH = footerSafeY - topSafeY;         // 249 mm max height per page

    const collectedToc: TocItem[] = [];
    let y = topSafeY;

    const drawCoverPage = () => {
      pdf.setFillColor(PLUM[0], PLUM[1], PLUM[2]);
      pdf.rect(0, 0, pageW, pageH, 'F');

      pdf.setDrawColor(62, 33, 104);
      pdf.setLineWidth(0.35);
      [38, 58, 82].forEach((r) => {
        pdf.circle(31, 31, r, 'S');
      });

      if (logos.watermarkDataUrl) {
        pdf.addImage(logos.watermarkDataUrl, 'PNG', 112, 155, 132, 132);
      }

      pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      pdf.rect(0, 0, 3.8, pageH, 'F');

      if (logos.whiteDataUrl) {
        pdf.addImage(logos.whiteDataUrl, 'PNG', marginX, 22, 19, 19);
      } else {
        drawVectorEmblemFallback(pdf, marginX + 9.5, 31.5, 9.5, [255, 255, 255]);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text('F R E N T E   E S T U D I A N T I L', marginX + 25, 29.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.2);
      pdf.setTextColor(186, 173, 214);
      pdf.text('F R E N T E   A M P L I O', marginX + 25, 35);

      const eyebrowLines = measureTextBlock(
        pdf,
        'D O C U M E N T O   O F I C I A L   D E L   P L E N A R I O   N A C I O N A L',
        blockW,
        'bold',
        8.5
      );
      pdf.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
      drawTextBlockLines(pdf, eyebrowLines, marginX, 118, 4.2);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(40);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Texto Final', marginX, 137);

      pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      pdf.rect(marginX, 147, 15, 1.4, 'F');

      const subtitleLines = measureTextBlock(
        pdf,
        'Articulado aprobado, disensos resueltos e historial de votaciones',
        blockW,
        'normal',
        12
      );
      pdf.setTextColor(200, 190, 225);
      drawTextBlockLines(pdf, subtitleLines, marginX, 160, 5.5);

      const dateStr = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      const coverFootLines = measureTextBlock(
        pdf,
        `Emisión oficial: ${dateStr}  ·  ${accreditedDelegatesCount} delegadas/os acreditados`,
        blockW,
        'normal',
        8.5
      );
      pdf.setTextColor(156, 144, 188);
      drawTextBlockLines(pdf, coverFootLines, marginX, 272, 4);
    };

    const drawInteriorHeader = () => {
      drawInstitutionalInteriorHeader(pdf, logos, 'T E X T O   F I N A L', marginX, pageW);
    };

    const startNewInteriorPage = () => {
      pdf.addPage();
      drawInteriorHeader();
      y = topSafeY;
    };

    const ensureSpace = (neededMm: number) => {
      if (y + neededMm > footerSafeY && y > topSafeY + 0.5) {
        startNewInteriorPage();
      }
    };

    const renderTocPages = (items: TocItem[]) => {
      startNewInteriorPage();

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.8);
      pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
      pdf.text('C O N T E N I D O', marginX, y);
      y += 8.5;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(21);
      pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
      pdf.text('Índice', marginX, y);
      y += 4.5;

      pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      pdf.rect(marginX, y, 13, 1.1, 'F');
      y += 12;

      items.forEach((entry) => {
        const pageStr = String(entry.pageNum);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.2);
        const pageNumReserve = Math.max(10, pdf.getTextWidth(pageStr) + 6);

        if (entry.kind === 'CHAPTER' || entry.kind === 'HISTORY') {
          const prefixColW = 12;
          const titleMaxW = blockW - prefixColW - pageNumReserve;
          const titleLines = measureTextBlock(pdf, entry.title, titleMaxW, 'bold', 9.8);
          const lineStep = 4.5;
          const entryH = Math.max(1, titleLines.length) * lineStep + 3.2;

          if (entry.kind === 'HISTORY' && items.length > 1) {
            y += 2;
          }
          ensureSpace(entryH);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9.5);
          pdf.setTextColor(PLUM_MID[0], PLUM_MID[1], PLUM_MID[2]);
          pdf.text(entry.prefix, marginX, y);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9.8);
          pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
          drawTextBlockLines(pdf, titleLines, marginX + prefixColW, y, lineStep);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9.2);
          pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
          pdf.text(pageStr, pageW - marginX, y, { align: 'right' });

          y += entryH;
        } else {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          const prefixW = Math.max(22, pdf.getTextWidth(entry.prefix) + 4);
          const indentX = marginX + 12;
          const titleMaxW = blockW - 12 - prefixW - pageNumReserve;
          const disLines = measureTextBlock(pdf, entry.title, titleMaxW, 'normal', 8.8);
          const lineStep = 4.1;
          const entryH = Math.max(1, disLines.length) * lineStep + 2.6;

          ensureSpace(entryH);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
          pdf.text(entry.prefix, indentX, y);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.8);
          pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
          drawTextBlockLines(pdf, disLines, indentX + prefixW, y, lineStep);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.8);
          pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
          pdf.text(pageStr, pageW - marginX, y, { align: 'right' });

          y += entryH;
        }
      });
    };

    // 1. Cover page
    drawCoverPage();

    // 2. Index / TOC pages
    const dummyTocItems: TocItem[] = [];
    if (!tocItemsFromPass1) {
      chapterPrepared.forEach((c) => {
        dummyTocItems.push({
          kind: 'CHAPTER',
          prefix: String(c.chapter.number).padStart(2, '0'),
          title: c.chapter.title,
          pageNum: 0
        });
        c.resolvedDissensuses.forEach((d) => {
          dummyTocItems.push({
            kind: 'DISSENSUS',
            prefix: `DISENSO #${d.indexNumber}`,
            title: d.item.title,
            pageNum: 0
          });
        });
      });
      dummyTocItems.push({
        kind: 'HISTORY',
        prefix: String(chapterPrepared.length + 1).padStart(2, '0'),
        title: 'Historial de Votaciones (Resultados)',
        pageNum: 0
      });
    }

    renderTocPages(tocItemsFromPass1 || dummyTocItems);

    if (y > footerSafeY - 45 || baseTocEntriesCount > 14) {
      startNewInteriorPage();
    } else {
      y += 6;
    }

    // 3. Presíntesis Approval Notice (if not yet approved)
    if (!isPresynthesisApproved) {
      const noticeText =
        'Nota: La Presíntesis Regional aún no registra votación general aprobada en sala. Mientras no se apruebe la Presíntesis, los párrafos base no figuran como aprobados en el articulado final.';
      const nLines = measureTextBlock(pdf, noticeText, blockW - 10, 'bold', 8.5);
      const nLineStep = 4.2;
      const boxH = nLines.length * nLineStep + 7.5;
      ensureSpace(boxH + 4);

      pdf.setFillColor(CREAM_BG[0], CREAM_BG[1], CREAM_BG[2]);
      pdf.setDrawColor(245, 198, 120);
      pdf.setLineWidth(0.35);
      pdf.roundedRect(marginX, y, blockW, boxH, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(AMBER_DARK[0], AMBER_DARK[1], AMBER_DARK[2]);
      drawTextBlockLines(pdf, nLines, marginX + 5, y + 5.6, nLineStep);
      y += boxH + 7;
    }

    // 4. Chapters + Approved Paragraphs + Resolved Dissensuses
    if (chapterPrepared.length === 0) {
      const emptyChLines = measureTextBlock(
        pdf,
        'No existen capítulos registrados aún en el Plenario.',
        blockW,
        'italic',
        9.5
      );
      ensureSpace(emptyChLines.length * 4.5 + 6);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9.5);
      pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
      drawTextBlockLines(pdf, emptyChLines, marginX, y, 4.5);
      y += emptyChLines.length * 4.5 + 6;
    } else {
      chapterPrepared.forEach(({ chapter, approvedParagraphs, resolvedDissensuses }, idx) => {
        const chPrefix = String(chapter.number).padStart(2, '0');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        const prefixColW = Math.max(17, pdf.getTextWidth(chPrefix) + 5);

        const titleLines = measureTextBlock(pdf, chapter.title, blockW - prefixColW, 'bold', 15.5);
        const titleStep = 6.6;
        const headerBlockHeight = 6 + Math.max(1, titleLines.length) * titleStep + 7;
        ensureSpace(headerBlockHeight + 16);

        const chapterPage = pdf.getNumberOfPages();
        collectedToc.push({
          kind: 'CHAPTER',
          prefix: chPrefix,
          title: chapter.title,
          pageNum: chapterPage
        });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
        pdf.text('A R T I C U L A D O   A P R O B A D O', marginX + prefixColW, y);

        y += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
        pdf.text(chPrefix, marginX, y + 1);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15.5);
        pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
        drawTextBlockLines(pdf, titleLines, marginX + prefixColW, y, titleStep);

        y += Math.max(1, titleLines.length) * titleStep - 1.5;

        pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
        pdf.rect(marginX, y, blockW, 1.0, 'F');
        y += 6.5;

        // Approved Paragraphs (strictly enclosed inside blockW)
        if (approvedParagraphs.length === 0) {
          const emptyMsg = isPresynthesisApproved
            ? '(Sin párrafos aprobados vigentes en este capítulo.)'
            : '(Párrafos pendientes de votación general de Presíntesis.)';
          const emptyLines = measureTextBlock(pdf, emptyMsg, blockW, 'italic', 9);
          ensureSpace(emptyLines.length * 4.4 + 4);
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9);
          pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
          drawTextBlockLines(pdf, emptyLines, marginX, y, 4.4);
          y += emptyLines.length * 4.4 + 4;
        } else {
          approvedParagraphs.forEach((p) => {
            const isExtended = p.status === 'EXTENDIDO';
            const bodyRaw = isExtended
              ? p.modifiedText || (p.extensionText ? `${p.originalText}\n${p.extensionText}` : p.originalText)
              : p.originalText;

            const headingRaw = `§ ${p.number}${p.title ? ` — ${p.title}` : ''}${
              isExtended ? `  [Ampliado · ${p.appliedMotionCode || '50%+1'}]` : ''
            }`;

            const headingLines = measureTextBlock(pdf, headingRaw, blockW, 'bold', 8.5);
            const headingStep = 4.1;
            const bodyLines = measureTextBlock(pdf, bodyRaw, blockW, 'normal', 9.5);
            const bodyStep = 4.55;

            const headingHeight = Math.max(1, headingLines.length) * headingStep + 0.8;
            const totalParagraphHeight = headingHeight + bodyLines.length * bodyStep + 3.2;

            // Keep short/medium paragraphs as a single atomic block on one page
            if (totalParagraphHeight <= maxBlockH * 0.75) {
              ensureSpace(totalParagraphHeight);
            } else {
              // Very long paragraph: ensure heading + first 3 lines stay together
              const minStartHeight = headingHeight + Math.min(bodyLines.length, 3) * bodyStep + 2;
              ensureSpace(minStartHeight);
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8.5);
            if (isExtended) {
              pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
            } else {
              pdf.setTextColor(PLUM_MID[0], PLUM_MID[1], PLUM_MID[2]);
            }
            drawTextBlockLines(pdf, headingLines, marginX, y, headingStep);
            y += headingHeight;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9.5);
            pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);

            bodyLines.forEach((line) => {
              if (y + bodyStep > footerSafeY) {
                startNewInteriorPage();
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9.5);
                pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
              }
              pdf.text(line, marginX, y);
              y += bodyStep;
            });

            y += 3.2;
          });
        }

        // Resolved Dissensuses in this Chapter (rounded card block strictly bounded inside blockW)
        if (resolvedDissensuses.length > 0) {
          y += 2;
          resolvedDissensuses.forEach(({ item: dis, indexNumber }) => {
            const winObj = dis.winner === 'A' ? dis.optionA : dis.winner === 'B' ? dis.optionB : dis.optionC;
            const winnerLetter = dis.winner || 'A';
            const winnerLabel = sanitizePdfText(winObj?.label || 'Propuesta Aprobada');
            const winnerRegion = sanitizePdfText(winObj?.originRegion || '');
            const winnerText = dis.winner ? winObj?.text || '(Sin redacción registrada)' : '(Sin redacción registrada)';
            const contextClean = sanitizePdfText(dis.context);

            const innerPadX = 4.5;
            const innerW = blockW - innerPadX * 2;

            // Measure header badge & title strictly inside innerW
            const badgeText = `DISENSO #${indexNumber}`;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            const badgeColW = Math.max(22, pdf.getTextWidth(badgeText) + 4.5);

            const headerTitleLines = measureTextBlock(pdf, dis.title, innerW - badgeColW, 'bold', 9.5);
            const headerTitleStep = 4.4;
            const headerH = Math.max(10.5, Math.max(1, headerTitleLines.length) * headerTitleStep + 5.6);

            // Measure optional context row
            const contextLines = contextClean
              ? measureTextBlock(pdf, contextClean, innerW, 'normal', 8.5)
              : [];
            const contextStep = 4.1;
            const contextH = contextLines.length > 0 ? contextLines.length * contextStep + 5 : 0;

            // Measure resolution strip (`RESOLUCIÓN APROBADA...` + optional right-aligned region)
            let regionColW = 0;
            let regionLines: string[] = [];
            if (winnerRegion) {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(7.2);
              regionColW = Math.min(innerW * 0.36, pdf.getTextWidth(winnerRegion) + 4);
              regionLines = measureTextBlock(pdf, winnerRegion, regionColW - 1, 'normal', 7.2);
            }
            const stripLeftLines = measureTextBlock(
              pdf,
              `RESOLUCIÓN APROBADA  ·  OPCIÓN ${winnerLetter}: ${winnerLabel.toUpperCase()}`,
              innerW - (regionColW > 0 ? regionColW + 2 : 0),
              'bold',
              7.4
            );
            const stripStep = 3.7;
            const regionStep = 3.5;
            const stripTextH = Math.max(
              Math.max(1, stripLeftLines.length) * stripStep,
              regionLines.length * regionStep
            );
            const subStripH = Math.max(7.5, stripTextH + 4.2);

            // Measure winning resolution prose
            const winTextLines = measureTextBlock(pdf, winnerText, innerW, 'normal', 9.2);
            const winLineStep = 4.4;
            const bodyPadTop = 5.2;
            const bodyPadBottom = 3.0;
            const fullBodyH = bodyPadTop + Math.max(1, winTextLines.length) * winLineStep + bodyPadBottom;
            const totalBoxH = headerH + contextH + subStripH + fullBodyH;

            const drawDissensusHeaderBlock = (startTop: number): number => {
              pdf.setFillColor(LAVENDER_BG[0], LAVENDER_BG[1], LAVENDER_BG[2]);
              pdf.rect(marginX, startTop, blockW, headerH, 'F');

              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(7.5);
              pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
              pdf.text(badgeText, marginX + innerPadX, startTop + 6.4);

              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9.5);
              pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
              drawTextBlockLines(pdf, headerTitleLines, marginX + innerPadX + badgeColW, startTop + 6.4, headerTitleStep);

              let cursorY = startTop + headerH;

              if (contextLines.length > 0) {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(marginX, cursorY, blockW, contextH, 'F');
                pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
                pdf.setLineWidth(0.2);
                pdf.line(marginX, cursorY, marginX + blockW, cursorY);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8.5);
                pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
                drawTextBlockLines(pdf, contextLines, marginX + innerPadX, cursorY + 4.8, contextStep);
                cursorY += contextH;
              }

              pdf.setFillColor(CREAM_BG[0], CREAM_BG[1], CREAM_BG[2]);
              pdf.rect(marginX, cursorY, blockW, subStripH, 'F');
              pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
              pdf.setLineWidth(0.2);
              pdf.line(marginX, cursorY, marginX + blockW, cursorY);

              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(7.4);
              pdf.setTextColor(AMBER_DARK[0], AMBER_DARK[1], AMBER_DARK[2]);
              drawTextBlockLines(pdf, stripLeftLines, marginX + innerPadX, cursorY + 5, stripStep);

              if (regionLines.length > 0) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7.2);
                pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
                regionLines.forEach((rl, rIdx) => {
                  pdf.text(rl, pageW - marginX - innerPadX, cursorY + 5 + rIdx * regionStep, { align: 'right' });
                });
              }

              cursorY += subStripH;
              return cursorY;
            };

            if (totalBoxH <= maxBlockH - 2) {
              // Standard case: keeps entire dissensus card intact as one atomic block
              ensureSpace(totalBoxH + 4);

              const disPage = pdf.getNumberOfPages();
              collectedToc.push({
                kind: 'DISSENSUS',
                prefix: badgeText,
                title: dis.title,
                pageNum: disPage
              });

              const boxTop = y;
              const bodyStart = drawDissensusHeaderBlock(boxTop);

              pdf.setFillColor(255, 255, 255);
              pdf.rect(marginX, bodyStart, blockW, fullBodyH, 'F');
              pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
              pdf.line(marginX, bodyStart, marginX + blockW, bodyStart);

              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9.2);
              pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
              drawTextBlockLines(pdf, winTextLines, marginX + innerPadX, bodyStart + bodyPadTop, winLineStep);

              pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
              pdf.setLineWidth(0.32);
              pdf.roundedRect(marginX, boxTop, blockW, totalBoxH, 2.2, 2.2, 'S');

              y = boxTop + totalBoxH + 5.5;
            } else {
              // Multi-page fallback for exceptionally long dissensus resolutions: paginate cleanly inside framed blocks
              ensureSpace(headerH + contextH + subStripH + 22);

              const disPage = pdf.getNumberOfPages();
              collectedToc.push({
                kind: 'DISSENSUS',
                prefix: badgeText,
                title: dis.title,
                pageNum: disPage
              });

              let lineIdx = 0;
              let isFirstChunk = true;

              while (lineIdx < winTextLines.length) {
                const segmentTop = y;
                const bodyStart = isFirstChunk
                  ? drawDissensusHeaderBlock(segmentTop)
                  : segmentTop;

                const availForLines = footerSafeY - (bodyStart + bodyPadTop + bodyPadBottom);
                const maxLinesHere = Math.max(1, Math.floor(availForLines / winLineStep));
                const chunk = winTextLines.slice(lineIdx, lineIdx + maxLinesHere);
                const chunkBodyH = bodyPadTop + chunk.length * winLineStep + bodyPadBottom;
                const segmentH = (bodyStart - segmentTop) + chunkBodyH;

                pdf.setFillColor(255, 255, 255);
                pdf.rect(marginX, bodyStart, blockW, chunkBodyH, 'F');
                pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
                pdf.line(marginX, bodyStart, marginX + blockW, bodyStart);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9.2);
                pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
                drawTextBlockLines(pdf, chunk, marginX + innerPadX, bodyStart + bodyPadTop, winLineStep);

                pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
                pdf.setLineWidth(0.32);
                pdf.roundedRect(marginX, segmentTop, blockW, segmentH, 2.2, 2.2, 'S');

                lineIdx += chunk.length;
                isFirstChunk = false;

                if (lineIdx < winTextLines.length) {
                  startNewInteriorPage();
                } else {
                  y = segmentTop + segmentH + 5.5;
                }
              }
            }
          });
        }

        if (idx < chapterPrepared.length - 1) {
          y += 5;
        }
      });
    }

    // 5. Final Section: Historial Completo de Votaciones (SOLO Resultados)
    startNewInteriorPage();
    const historyIndexNum = String(chapterPrepared.length + 1).padStart(2, '0');
    collectedToc.push({
      kind: 'HISTORY',
      prefix: historyIndexNum,
      title: 'Historial de Votaciones (Resultados)',
      pageNum: pdf.getNumberOfPages()
    });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    const historyPrefixColW = Math.max(17, pdf.getTextWidth(historyIndexNum) + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
    pdf.text('E S C R U T I N I O   O F I C I A L   ( R E S U L T A D O S )', marginX + historyPrefixColW, y);

    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
    pdf.text(historyIndexNum, marginX, y + 1);

    const historyTitleLines = measureTextBlock(pdf, 'Historial de Votaciones', blockW - historyPrefixColW, 'bold', 15.5);
    pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
    drawTextBlockLines(pdf, historyTitleLines, marginX + historyPrefixColW, y, 6.6);

    y += Math.max(1, historyTitleLines.length) * 6.6 - 1.5;
    pdf.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    pdf.rect(marginX, y, blockW, 1.0, 'F');
    y += 6;

    const historyIntroLines = measureTextBlock(
      pdf,
      `Registro consolidado de resultados (${concludedMotions.length} votaciones concluidas). No incluye sufragios nominales.`,
      blockW,
      'normal',
      9
    );
    pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
    drawTextBlockLines(pdf, historyIntroLines, marginX, y, 4.3);
    y += historyIntroLines.length * 4.3 + 4;

    if (concludedMotions.length === 0) {
      const emptyHistLines = measureTextBlock(
        pdf,
        'Aún no hay votaciones concluidas registradas en este Plenario.',
        blockW - 10,
        'italic',
        9
      );
      const boxH = Math.max(14, emptyHistLines.length * 4.3 + 8);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
      pdf.roundedRect(marginX, y, blockW, boxH, 2, 2, 'FD');
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
      drawTextBlockLines(pdf, emptyHistLines, marginX + 5, y + 6.5, 4.3);
      y += boxH + 6;
    } else {
      concludedMotions.forEach((m) => {
        const votesArr = Object.values(m.votes || {});
        const totalCast = m.resultSummary?.totalCast ?? votesArr.length;
        const totalEligible = m.resultSummary?.totalEligible ?? Math.max(accreditedDelegatesCount, totalCast);
        const quorumMet =
          m.resultSummary?.quorumMet ??
          (totalEligible > 0 ? totalCast >= Math.ceil(totalEligible * 0.5) : totalCast > 0);
        const isTripartite =
          m.motionKind === 'DISENSO_PRIMERA_VUELTA' || m.motionKind === 'DISENSO_SEGUNDA_VUELTA';

        const aFavor = m.resultSummary?.aFavor ?? votesArr.filter((v) => v.vote === 'A_FAVOR').length;
        const enContra = m.resultSummary?.enContra ?? votesArr.filter((v) => v.vote === 'EN_CONTRA').length;
        const abstencion = m.resultSummary?.abstencion ?? votesArr.filter((v) => v.vote === 'ABSTENCION').length;
        const opcA = m.resultSummary?.opcionA ?? votesArr.filter((v) => v.vote === 'OPCION_A').length;
        const opcB = m.resultSummary?.opcionB ?? votesArr.filter((v) => v.vote === 'OPCION_B').length;
        const opcC = m.resultSummary?.opcionC ?? votesArr.filter((v) => v.vote === 'OPCION_C').length;

        const validBinary = aFavor + enContra;
        const pctFavor =
          m.resultSummary?.percentageFavor ?? (validBinary > 0 ? Math.round((aFavor / validBinary) * 1000) / 10 : 0);
        const directTripartite = opcA + opcB + opcC;
        const pctA =
          m.resultSummary?.percentageA ?? (directTripartite > 0 ? Math.round((opcA / directTripartite) * 1000) / 10 : 0);
        const pctB =
          m.resultSummary?.percentageB ?? (directTripartite > 0 ? Math.round((opcB / directTripartite) * 1000) / 10 : 0);
        const pctC =
          m.resultSummary?.percentageC ?? (directTripartite > 0 ? Math.round((opcC / directTripartite) * 1000) / 10 : 0);

        let outcomeLabel = 'CERRADA';
        let outcomeColor: [number, number, number] = MUTED_GRAY;
        if (m.status === 'APPROVED') {
          if (isTripartite && m.resultSummary?.winner) {
            outcomeLabel = `GANÓ OPCIÓN ${m.resultSummary.winner}`;
          } else {
            outcomeLabel = 'APROBADA';
          }
          outcomeColor = EMERALD_DARK;
        } else if (m.status === 'REJECTED') {
          outcomeLabel = 'RECHAZADA';
          outcomeColor = ROSE_DARK;
        } else if (m.status === 'PASSED_TO_RUNOFF') {
          const rOpts = m.resultSummary?.runoffOptions;
          outcomeLabel = rOpts ? `A BALOTAJE (${rOpts[0]} vs ${rOpts[1]})` : 'A 2ª VUELTA';
          outcomeColor = AMBER_DARK;
        }

        const timeLabel = m.closedAt
          ? new Date(m.closedAt).toLocaleString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '';

        const padX = 4;
        const innerCardW = blockW - padX * 2;
        const codeText = sanitizePdfText(m.code || 'VOT');

        // Header strip inside lavender band: row 1 = [Code (left) ... Outcome (right)], row 2+ = Full-width Title block
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.6);
        const outcomeW = Math.min(innerCardW * 0.52, pdf.getTextWidth(outcomeLabel) + 4);
        const codeLines = measureTextBlock(pdf, codeText, innerCardW - outcomeW - 2, 'bold', 7.6);
        const outcomeLines = measureTextBlock(pdf, outcomeLabel, outcomeW, 'bold', 7.6);
        const metaTopStep = 3.7;
        const metaTopRowH = Math.max(codeLines.length, outcomeLines.length) * metaTopStep + 2.0;

        const titleLines = measureTextBlock(pdf, m.title, innerCardW, 'bold', 8.8);
        const titleStep = 4.2;
        const topRowH = metaTopRowH + Math.max(1, titleLines.length) * titleStep + 3.2;

        const summaryLine = isTripartite
          ? `Opción A: ${opcA} (${pctA}%)   |   Opción B: ${opcB} (${pctB}%)   |   Opción C: ${opcC} (${pctC}%)   |   Abstención: ${abstencion}`
          : `A favor: ${aFavor} (${pctFavor}%)   |   En contra: ${enContra}   |   Abstención: ${abstencion}`;
        const metaLine = `${getMotionKindLabel(m.motionKind)}  ·  ${getQuorumLabel(m.quorumType)}  ·  Participación: ${totalCast}/${totalEligible}  ·  Quórum: ${quorumMet ? 'Cumplido' : 'No cumplido'}${timeLabel ? `  ·  ${timeLabel}` : ''}`;

        const sumLines = measureTextBlock(pdf, summaryLine, innerCardW, 'bold', 8.4);
        const sumStep = 4.2;
        const metaLines = measureTextBlock(pdf, metaLine, innerCardW, 'normal', 7.5);
        const metaStep = 3.8;

        const bodyRowH = 4.8 + sumLines.length * sumStep + 0.8 + metaLines.length * metaStep + 1.8;
        const cardH = topRowH + bodyRowH;

        ensureSpace(cardH + 3.5);

        const cardTop = y;
        pdf.setFillColor(LAVENDER_BG[0], LAVENDER_BG[1], LAVENDER_BG[2]);
        pdf.rect(marginX, cardTop, blockW, topRowH, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.6);
        pdf.setTextColor(LAVENDER_TEXT[0], LAVENDER_TEXT[1], LAVENDER_TEXT[2]);
        drawTextBlockLines(pdf, codeLines, marginX + padX, cardTop + 5.0, metaTopStep);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.6);
        pdf.setTextColor(outcomeColor[0], outcomeColor[1], outcomeColor[2]);
        outcomeLines.forEach((ol, oIdx) => {
          pdf.text(ol, pageW - marginX - padX, cardTop + 5.0 + oIdx * metaTopStep, { align: 'right' });
        });

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.8);
        pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
        drawTextBlockLines(pdf, titleLines, marginX + padX, cardTop + 5.0 + metaTopRowH, titleStep);

        const bodyTop = cardTop + topRowH;
        pdf.setFillColor(255, 255, 255);
        pdf.rect(marginX, bodyTop, blockW, bodyRowH, 'F');
        pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
        pdf.setLineWidth(0.2);
        pdf.line(marginX, bodyTop, marginX + blockW, bodyTop);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.4);
        pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
        drawTextBlockLines(pdf, sumLines, marginX + padX, bodyTop + 4.8, sumStep);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
        drawTextBlockLines(pdf, metaLines, marginX + padX, bodyTop + 4.8 + sumLines.length * sumStep + 0.8, metaStep);

        pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
        pdf.setLineWidth(0.28);
        pdf.roundedRect(marginX, cardTop, blockW, cardH, 1.8, 1.8, 'S');

        y = cardTop + cardH + 3.5;
      });
    }

    // Certification footer note (strictly inside blockW)
    const certLines = measureTextBlock(
      pdf,
      'Documento formalizado por la Secretaría Técnica Nacional del Frente Estudiantil · Frente Amplio.',
      blockW,
      'normal',
      7.8
    );
    ensureSpace(12 + certLines.length * 3.8);
    y += 4;
    pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    pdf.setLineWidth(0.25);
    pdf.line(marginX, y, pageW - marginX, y);
    y += 5.5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    pdf.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
    pdf.text('CERTIFICACIÓN Y FE PÚBLICA', marginX, y);
    y += 4.2;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.8);
    pdf.setTextColor(MUTED_GRAY[0], MUTED_GRAY[1], MUTED_GRAY[2]);
    drawTextBlockLines(pdf, certLines, marginX, y, 3.8);

    // Interior footers on pages 2..N
    const totalPages = pdf.getNumberOfPages();
    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      pdf.setPage(pageNum);
      pdf.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
      pdf.setLineWidth(0.25);
      pdf.line(marginX, pageH - 17, pageW - marginX, pageH - 17);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.8);
      pdf.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
      pdf.text('Texto final · documento oficial del Plenario Nacional', marginX, pageH - 11.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(BODY_GRAY[0], BODY_GRAY[1], BODY_GRAY[2]);
      pdf.text(String(pageNum), pageW - marginX, pageH - 11.5, { align: 'right' });
    }

    return { pdf, collectedToc };
  };

  // Pass 1 collects exact page numbers; Pass 2 writes real TOC page numbers
  const pass1 = buildPdfDocument(null);
  const pass2 = buildPdfDocument(pass1.collectedToc);

  pass2.pdf.save(`Texto_Final_Plenario_FE-FA_${new Date().toISOString().slice(0, 10)}.pdf`);
};
