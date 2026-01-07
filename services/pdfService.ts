
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

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

export const extractTextFromDocx = async (buffer: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
};

export const generateDocxFromText = async (text: string): Promise<Blob> => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n').map(line => new Paragraph({
        children: [new TextRun(line)],
      })),
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
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
      
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (options.custom) {
          const { brightness, contrast, shadows } = options.custom;
          const bVal = (brightness / 100) * 255;
          r += bVal; g += bVal; b += bVal;
          if (lum < 100) {
            const shadowBoost = (shadows / 100) * (100 - lum);
            r += shadowBoost; g += shadowBoost; b += shadowBoost;
          }
          const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          r = cFactor * (r - 128) + 128;
          g = cFactor * (g - 128) + 128;
          b = cFactor * (b - 128) + 128;
        }

        if (options.filter && options.filter !== 'none') {
          switch (options.filter) {
            case 'auto-scan': {
              if (lum > 160) {
                const w = (lum - 160) / 95;
                r += 40 * w; g += 40 * w; b += 40 * w;
              }
              const factor = 1.2;
              r = factor * (r - 128) + 128;
              g = factor * (g - 128) + 128;
              b = factor * (b - 128) + 128;
              break;
            }
            case 'text-soft': {
              let v = lum;
              if (v > 135) v = 255;
              else if (v < 85) v = 20;
              else v = (v - 85) * (235 / 50) + 20;
              r = g = b = v;
              break;
            }
            case 'grayscale': {
              const avg = lum * 1.05; 
              r = g = b = avg;
              break;
            }
            case 'color-scan': {
              if (lum > 185) {
                r = Math.min(255, r + 30);
                g = Math.min(255, g + 30);
                b = Math.min(255, b + 30);
              }
              r *= 1.1; g *= 1.1; b *= 1.1;
              break;
            }
            case 'soft-scan': {
              if (lum < 110) {
                const lift = (110 - lum) * 0.4;
                r += lift; g += lift; b += lift;
              }
              break;
            }
            case 'high-contrast': {
              const val = lum > 120 ? 255 : 0;
              r = g = b = val;
              break;
            }
            case 'auto-enhance': {
              r *= 1.05; g *= 1.05; b *= 1.05;
              const factor = 1.1;
              r = factor * (r - 128) + 128;
              g = factor * (g - 128) + 128;
              b = factor * (b - 128) + 128;
              break;
            }
            case 'color-boost': {
              r *= 1.2; g *= 1.1; b *= 1.25;
              break;
            }
          }
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i+1] = Math.max(0, Math.min(255, g));
        data[i+2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      
      if (options.custom && options.custom.sharpness > 0) {
        ctx.filter = `contrast(1.1) brightness(1.02) saturate(1.05)`; 
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const bottomMargin = 20;
  const usableWidth = pageWidth - (margin * 2);
  const usableHeight = pageHeight - margin - bottomMargin;
  
  let cursorY = margin;

  for (const block of content) {
    if (block.type === 'text' && block.value) {
      const lines: string[] = doc.splitTextToSize(block.value, usableWidth);
      const lineHeight = 7;
      for (const line of lines) {
        if (cursorY + lineHeight > pageHeight - bottomMargin) {
          doc.addPage();
          cursorY = margin;
        }
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
      }
      cursorY += 5;
    } else if (block.type === 'image' && block.value) {
      const widthPercent = block.widthPercent || 100;
      let displayWidth = usableWidth * (widthPercent / 100);
      const imgProps = doc.getImageProperties(block.value);
      const aspectRatio = imgProps.height / imgProps.width;
      let displayHeight = displayWidth * aspectRatio;
      if (displayHeight > usableHeight) {
        const scale = usableHeight / displayHeight;
        displayWidth *= scale;
        displayHeight *= scale;
      }
      if (cursorY + displayHeight > pageHeight - bottomMargin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.addImage(block.value, 'JPEG', margin, cursorY, displayWidth, displayHeight);
      cursorY += displayHeight + 10;
    } else if (block.type === 'table' && block.rows && block.cols && block.data) {
      const tableWidth = usableWidth * ((block.widthPercent || 100) / 100);
      const baseCellWidth = tableWidth / block.cols;
      const baseCellHeight = 8;
      const cellPadding = 2;
      
      doc.setFontSize(10);
      
      // We process row by row
      for (let r = 0; r < block.rows; r++) {
        // First pass: Calculate max height for this row based on all cells (including merged ones)
        let maxRowHeight = baseCellHeight;
        const rowData = block.data[r];
        
        rowData.forEach((cell: any, c: number) => {
          if (!cell || cell.mergedInto) return;
          const colSpan = cell.colSpan || 1;
          const currentCellWidth = baseCellWidth * colSpan;
          const wrappedLines = doc.splitTextToSize(cell.content || '', currentCellWidth - (cellPadding * 2));
          const h = (wrappedLines.length * 5) + (cellPadding * 2);
          if (h > maxRowHeight) maxRowHeight = h;
        });

        // Pagination check
        if (cursorY + maxRowHeight > pageHeight - bottomMargin) {
          doc.addPage();
          cursorY = margin;
        }

        // Second pass: Draw the row
        rowData.forEach((cell: any, c: number) => {
          if (!cell || cell.mergedInto) return;
          
          const colSpan = cell.colSpan || 1;
          const currentCellWidth = baseCellWidth * colSpan;
          const x = margin + (c * baseCellWidth);
          
          // Draw Border
          doc.rect(x, cursorY, currentCellWidth, maxRowHeight);
          
          // Draw Text
          const wrappedLines = doc.splitTextToSize(cell.content || '', currentCellWidth - (cellPadding * 2));
          doc.text(wrappedLines, x + cellPadding, cursorY + cellPadding + 4);
        });
        
        cursorY += maxRowHeight;
      }
      cursorY += 10;
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
