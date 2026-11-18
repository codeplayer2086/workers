import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, FileImage, FileText } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import {
  dataUrlToBlob,
  fetchAuthenticatedDataUrl,
  triggerBlobDownload,
} from '../../lib/private-file';
import type { CvLang } from '../../lib/cv-dictionary';

export function CVExportToolbar({
  workerId,
  workerCode,
  companyId,
  language,
  onLanguageChange,
  cvRef,
}: {
  workerId: string;
  workerCode: string;
  companyId?: string;
  language: CvLang;
  onLanguageChange: (lang: CvLang) => void;
  cvRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [exporting, setExporting] = useState<'PNG' | 'PDF' | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const recordLog = async (format: 'PDF' | 'PNG') => {
    try {
      await apiFetch('/api/cv/log', {
        method: 'POST',
        body: JSON.stringify({ workerId, language, format, companyId }),
      });
    } catch {
      // Non-blocking log
    }
  };

  const renderCvToPngDataUrl = async (node: HTMLElement): Promise<string> => {
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
              // Keep existing src if inline fetch fails
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
        // Retry without embedding external webfonts if browser/CSP blocks stylesheet cssRules
        return await toPng(node, { ...baseOptions, skipFonts: true });
      }
    } finally {
      for (const item of originalSrcs) {
        item.img.setAttribute('src', item.src);
      }
    }
  };

  const handleDownloadPng = async () => {
    const node = cvRef.current;
    if (!node) return;
    setExporting('PNG');
    setStatusNote(null);
    setExportError(null);
    try {
      const dataUrl = await renderCvToPngDataUrl(node);
      const blob = dataUrlToBlob(dataUrl);
      const filename = `${workerCode}_CV_${language}.png`;
      triggerBlobDownload(blob, filename);
      await recordLog('PNG');
      setStatusNote(`Downloaded ${filename}`);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message
          ? `PNG export failed: ${err.message}`
          : 'PNG export failed. Please reload and try again.'
      );
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPdf = async () => {
    const node = cvRef.current;
    if (!node) return;
    setExporting('PDF');
    setStatusNote(null);
    setExportError(null);
    try {
      const dataUrl = await renderCvToPngDataUrl(node);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      const filename = `${workerCode}_CV_${language}.pdf`;
      const pdfBlob = pdf.output('blob');
      triggerBlobDownload(pdfBlob, filename);
      await recordLog('PDF');
      setStatusNote(`Downloaded ${filename}`);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message
          ? `PDF export failed: ${err.message}`
          : 'PDF export failed. Please reload and try again.'
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
      {/* Strict EN / AR Segmented Language Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">CV Language</span>
        <div
          role="group"
          aria-label="CV Language Switcher"
          className="inline-flex rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => onLanguageChange('EN')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              language === 'EN'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English CV
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('AR')}
            className={`font-arabic rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              language === 'AR'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            السيرة الذاتية بالعربية
          </button>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        {exportError && (
          <span role="alert" className="text-xs font-medium text-red-600">
            {exportError}
          </span>
        )}
        {!exportError && statusNote && (
          <span className="text-xs font-medium text-emerald-700">{statusNote}</span>
        )}
        <button
          type="button"
          disabled={exporting !== null}
          onClick={handleDownloadPng}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <FileImage className="h-4 w-4 text-sky-600" />
          <span>{exporting === 'PNG' ? 'Rendering PNG...' : 'Download PNG'}</span>
        </button>

        <button
          type="button"
          disabled={exporting !== null}
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {exporting === 'PDF' ? (
            <Download className="h-4 w-4 animate-bounce" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span>{exporting === 'PDF' ? 'Generating PDF...' : 'Download PDF'}</span>
        </button>
      </div>
    </div>
  );
}
