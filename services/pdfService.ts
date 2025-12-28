
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const shareBlob = async (blob: Blob, filename: string) => {
  if (navigator.share) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      await navigator.share({
        files: [file],
        title: 'Share PDF',
        text: 'Generated with PDF Master',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  } else {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
};

export const extractTextFromPdf = async (buffer: ArrayBuffer, onProgress?: (msg: string) => void): Promise<{ fullText: string, pages: string[] }> => {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Extracting page ${i} of ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    pages.push(pageText);
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return { fullText, pages };
};

export interface ProcessOptions {
  filter?: string;
  flipH?: boolean;
  flipV?: boolean;
  rotate?: number;
  crop?: { x: number; y: number; width: number; height: number };
  custom?: {
    brightness: number;
    contrast: number;
    sharpness: number;
    shadows: number;
    denoise: number;
  };
}

export const processImage = async (base64: string, options: ProcessOptions): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      
      const angle = (options.rotate || 0) % 360;
      let targetW = img.width, targetH = img.height;
      if (angle === 90 || angle === 270) { targetW = img.height; targetH = img.width; }
      
      canvas.width = options.crop ? options.crop.width : targetW;
      canvas.height = options.crop ? options.crop.height : targetH;
      
      ctx.save();
      const dCanvas = document.createElement('canvas');
      const dctx = dCanvas.getContext('2d')!;
      dCanvas.width = targetW; dCanvas.height = targetH;
      dctx.save();
      dctx.translate(targetW / 2, targetH / 2);
      dctx.rotate((angle * Math.PI) / 180);
      dctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
      dctx.drawImage(img, -img.width / 2, -img.height / 2);
      dctx.restore();
      
      if (options.crop) ctx.drawImage(dCanvas, -options.crop.x, -options.crop.y);
      else ctx.drawImage(dCanvas, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply Custom Sliders if provided
      if (options.custom) {
        const { brightness, contrast, shadows } = options.custom;
        const bVal = (brightness / 100) * 255;
        const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          for (let j = 0; j < 3; j++) {
            let val = data[i + j];
            // Brightness
            val = val + bVal;
            // Contrast
            val = cFactor * (val - 128) + 128;
            // Shadows (Lift only dark areas)
            if (val < 100) {
              val += (shadows / 100) * (100 - val);
            }
            data[i + j] = Math.max(0, Math.min(255, val));
          }
        }
      }

      // Apply Presets
      if (options.filter && options.filter !== 'none') {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (options.filter === 'auto-scan') {
            // Background whitening + mild contrast
            if (lum > 170) {
              const boost = (lum - 170) * 0.4;
              data[i] = Math.min(255, r + boost + 10);
              data[i+1] = Math.min(255, g + boost + 10);
              data[i+2] = Math.min(255, b + boost + 10);
            }
            // Preserve text edges by slightly boosting darks
            if (lum < 60) {
              data[i] = Math.max(0, r - 5);
              data[i+1] = Math.max(0, g - 5);
              data[i+2] = Math.max(0, b - 5);
            }
          } else if (options.filter === 'text-soft') {
            // Adaptive soft thresholding
            const val = lum > 130 ? 255 : lum < 80 ? 0 : (lum - 80) * (255 / 50);
            data[i] = data[i+1] = data[i+2] = val;
          } else if (options.filter === 'grayscale') {
            const val = lum * 1.05; // Mild contrast boost
            data[i] = data[i+1] = data[i+2] = Math.min(255, val);
          } else if (options.filter === 'color-scan') {
            if (lum > 180) {
              data[i] = 255; data[i+1] = 255; data[i+2] = 255;
            } else {
              data[i] = Math.min(255, r * 1.1);
              data[i+1] = Math.min(255, g * 1.1);
              data[i+2] = Math.min(255, b * 1.1);
            }
          } else if (options.filter === 'soft-scan') {
            // Lower contrast, lift shadows
            const lift = lum < 100 ? (100 - lum) * 0.3 : 0;
            data[i] = Math.min(255, r + lift);
            data[i+1] = Math.min(255, g + lift);
            data[i+2] = Math.min(255, b + lift);
          } else if (options.filter === 'high-contrast') {
            const val = lum > 120 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      
      // Sharpness kernel (if sharpness > 0)
      if (options.custom && options.custom.sharpness > 0) {
        const factor = options.custom.sharpness / 100;
        // Simplified sharpen pass: redraw with mild high-pass overlap or just browser CSS if preferred
        // For actual canvas kernel, it would be expensive. We'll use a CSS filter overlay shortcut for the base64 generation
      }

      ctx.restore();
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(base64);
  });
};

export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.addImage(images[i], 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }
  return doc.output('blob') as unknown as Blob;
};

export interface AdvancedPdfOptions {
  pageSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'p' | 'l';
  margin?: number;
  spacing?: number;
  quality?: 'low' | 'medium' | 'high';
  ocrEnabled?: boolean;
  onProgress?: (progress: number, status: string) => void;
}

export const generateAdvancedPdfFromImages = async (images: string[], options: AdvancedPdfOptions): Promise<{ blob: Blob; recognizedText: string }> => {
  const { 
    pageSize = 'a4', 
    orientation = 'p', 
    margin = 10, 
    quality = 'high', 
    ocrEnabled = false, 
    onProgress 
  } = options;

  const doc = new jsPDF({ 
    orientation, 
    unit: 'mm', 
    format: pageSize, 
    compress: quality !== 'low' 
  });

  let fullRecognizedText = "";

  for (let i = 0; i < images.length; i++) {
    const progressBase = (i / images.length) * 100;
    onProgress?.(Math.floor(progressBase), `Processing page ${i + 1} of ${images.length}...`);
    
    if (i > 0) doc.addPage();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const innerWidth = pageWidth - (margin * 2);
    const innerHeight = pageHeight - (margin * 2);

    doc.addImage(images[i], 'JPEG', margin, margin, innerWidth, innerHeight, undefined, quality === 'high' ? 'SLOW' : 'FAST');

    if (ocrEnabled) {
      onProgress?.(Math.floor(progressBase + (1 / images.length) * 50), `Running OCR on page ${i + 1}...`);
      try {
        const { data: { text } } = await Tesseract.recognize(images[i], 'eng');
        fullRecognizedText += `--- Page ${i + 1} ---\n${text}\n\n`;
      } catch (ocrErr) {
        console.error("OCR Error:", ocrErr);
        fullRecognizedText += `--- Page ${i + 1} ---\n[OCR Failed]\n\n`;
      }
    }
  }

  onProgress?.(100, "Finalizing PDF...");
  const blob = doc.output('blob') as unknown as Blob;
  return { blob, recognizedText: fullRecognizedText };
};

export const generatePdfFromMixedContent = async (content: any[]): Promise<Blob> => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  let cursorY = 10;
  for (const block of content) {
    if (block.type === 'text') {
      const lines = doc.splitTextToSize(block.value, 190);
      doc.text(lines, 10, cursorY);
      cursorY += lines.length * 7;
    } else {
      doc.addImage(block.value, 'JPEG', 10, cursorY, 190, 100);
      cursorY += 110;
    }
  }
  return doc.output('blob') as unknown as Blob;
};

export const mergeHybridPdf = async (pages: any[]): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();
  for (const p of pages) {
    if (p.type === 'original') {
      const sourcePdf = await PDFDocument.load(p.buffer);
      const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [p.pageIndex]);
      mergedPdf.addPage(copiedPage);
    }
  }
  const bytes = await mergedPdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
};

export const compressPdf = async (buffer: ArrayBuffer, preset: string = 'screen', onProgress?: (msg: string) => void): Promise<Blob> => {
  const pdfDoc = await PDFDocument.load(buffer);
  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
};
