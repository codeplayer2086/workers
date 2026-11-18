import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { fetchAuthenticatedDataUrl } from './private-file';
import type { CvLang } from './cv-dictionary';

export async function renderCvElementToPngDataUrl(node: HTMLElement): Promise<string> {
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // Proceed even if font readiness rejects
  }

  const imgs = Array.from(node.querySelectorAll('img'));
  const originalSrcs: Array<{ img: HTMLImageElement; src: string }> = [];

  try {
    await Promise.all(
      imgs.map(async (img) => {
        const currentSrc = img.getAttribute('src') || img.src;
        if (!currentSrc) return;
        if (!currentSrc.startsWith('data:')) {
          originalSrcs.push({ img, src: currentSrc });
          try {
            const dataUrl = await fetchAuthenticatedDataUrl(currentSrc);
            img.src = dataUrl;
          } catch {
            // Keep original src if inline fetch fails
          }
        }
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => undefined);
        }
      })
    );

    const baseOptions = {
      pixelRatio: 2,
      cacheBust: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1123,
      style: {
        margin: '0',
        transform: 'none',
      },
    };

    try {
      return await toPng(node, baseOptions);
    } catch {
      return await toPng(node, { ...baseOptions, skipFonts: true });
    }
  } finally {
    for (const item of originalSrcs) {
      item.img.setAttribute('src', item.src);
    }
  }
}

export async function generateCvExportPayload(
  node: HTMLElement,
  workerCode: string,
  language: CvLang,
  format: 'PDF' | 'PNG'
): Promise<{
  dataUrl: string;
  base64: string;
  blob: Blob;
  fileName: string;
}> {
  const pngDataUrl = await renderCvElementToPngDataUrl(node);
  const fileName = `${workerCode}_CV_${language}.${format.toLowerCase()}`;

  if (format === 'PNG') {
    const base64 = pngDataUrl.includes(',')
      ? pngDataUrl.slice(pngDataUrl.indexOf(',') + 1)
      : pngDataUrl;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return {
      dataUrl: pngDataUrl,
      base64,
      blob: new Blob([bytes], { type: 'image/png' }),
      fileName,
    };
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  const pdfBlob = pdf.output('blob');
  const pdfDataUrl = pdf.output('datauristring');
  const base64 = pdfDataUrl.includes(',')
    ? pdfDataUrl.slice(pdfDataUrl.indexOf(',') + 1)
    : pdfDataUrl;

  return {
    dataUrl: pdfDataUrl,
    base64,
    blob: pdfBlob,
    fileName,
  };
}
