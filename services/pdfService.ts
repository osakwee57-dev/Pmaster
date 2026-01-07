
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

// Fix: Export downloadBlob for utility usage
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

// Fix: Export shareBlob for mobile sharing
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

// Fix: Export extractTextFromPdf for conversion tools
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

// Fix: Export extractTextFromDocx for doc parser
export const extractTextFromDocx = async (buffer: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
};

// Fix: Export generateDocxFromText for export functionality
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

// Fix: Implement mergeHybridPdf to support PDF merging tool
export const mergeHybridPdf = async (pageSpecs: any[]): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();
  for (const spec of pageSpecs) {
    if (spec.type === 'original') {
      const srcDoc = await PDFDocument.load(spec.buffer);
      const [copiedPage] = await mergedPdf.copyPages(srcDoc, [spec.pageIndex]);
      mergedPdf.addPage(copiedPage);
    }
  }
  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes], { type: 'application/pdf' });
};

// Fix: Implement generatePdfFromImages for the scanner tool
export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  const doc = new jsPDF();
  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    const img = images[i];
    const props = doc.getImageProperties(img);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (props.height * pdfWidth) / props.width;
    doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  }
  return doc.output('blob');
};

// Fix: Implement generatePdfFromMixedContent for Doc Builder tool
export const generatePdfFromMixedContent = async (blocks: any[]): Promise<Blob> => {
  const doc = new jsPDF();
  let cursorY = 10;
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 2 * margin;

  for (const block of blocks) {
    if (cursorY > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      cursorY = 10;
    }

    if (block.type === 'text') {
      const lines = doc.splitTextToSize(block.value || '', usableWidth);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 7 + 5;
    } else if (block.type === 'image') {
      const props = doc.getImageProperties(block.value);
      const imgWidth = usableWidth * ((block.widthPercent || 100) / 100);
      const imgHeight = (props.height * imgWidth) / props.width;
      
      if (cursorY + imgHeight > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        cursorY = 10;
      }
      
      doc.addImage(block.value, 'JPEG', margin, cursorY, imgWidth, imgHeight);
      cursorY += imgHeight + 5;
    } else if (block.type === 'table') {
      const rows = block.data;
      const colWidth = usableWidth / block.cols;
      doc.setFontSize(8);
      for (const row of rows) {
        let maxRowHeight = 5;
        let currentX = margin;
        for (const cell of row) {
          if (cell.mergedInto) continue;
          const cellWidth = colWidth * (cell.colSpan || 1);
          const lines = doc.splitTextToSize(cell.content || '', cellWidth - 2);
          doc.rect(currentX, cursorY, cellWidth, lines.length * 4 + 2);
          doc.text(lines, currentX + 1, cursorY + 3);
          maxRowHeight = Math.max(maxRowHeight, lines.length * 4 + 2);
          currentX += cellWidth;
        }
        cursorY += maxRowHeight;
        if (cursorY > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          cursorY = 10;
        }
      }
    }
  }
  return doc.output('blob');
};

// Fix: Define AdvancedPdfOptions interface for ImageToPdfTool
export interface AdvancedPdfOptions {
  pageSize: 'a4' | 'letter' | 'legal';
  orientation: 'p' | 'l';
  margin: number;
  spacing: number;
  quality: 'low' | 'medium' | 'high';
  ocrEnabled: boolean;
  onProgress?: (progress: number, status: string) => void;
}

// Fix: Implement generateAdvancedPdfFromImages for the Photo Engine Pro tool
export const generateAdvancedPdfFromImages = async (images: string[], options: AdvancedPdfOptions): Promise<{ blob: Blob, recognizedText: string }> => {
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.pageSize
  });

  let recognizedText = "";
  const total = images.length;

  for (let i = 0; i < total; i++) {
    const status = `Processing page ${i + 1} of ${total}...`;
    options.onProgress?.(Math.round((i / total) * 100), status);

    if (i > 0) doc.addPage();
    const img = images[i];

    if (options.ocrEnabled) {
      try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(img);
        recognizedText += `--- Page ${i+1} ---\n${ret.data.text}\n\n`;
        await worker.terminate();
      } catch (e) {
        console.error("OCR failed for page", i, e);
      }
    }

    const props = doc.getImageProperties(img);
    const pdfWidth = doc.internal.pageSize.getWidth() - 2 * options.margin;
    const pdfHeight = (props.height * pdfWidth) / props.width;
    doc.addImage(img, 'JPEG', options.margin, options.margin, pdfWidth, pdfHeight);
  }

  options.onProgress?.(100, "Finalizing...");
  return { blob: doc.output('blob'), recognizedText };
};

// Fix: Implement compressPdf for compression and shrinking tools
export const compressPdf = async (buffer: ArrayBuffer, preset?: string, onProgress?: (msg: string) => void): Promise<Blob> => {
  onProgress?.("Analyzing PDF structure...");
  const pdfDoc = await PDFDocument.load(buffer);
  onProgress?.("Optimizing object streams...");
  // Basic optimization by re-saving with pdf-lib which cleans up dead objects
  const compressedBytes = await pdfDoc.save();
  return new Blob([compressedBytes], { type: 'application/pdf' });
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

// Fix: Completed the processImage function which was cut off in the previous version
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
              r = g = b = lum;
              break;
            }
            case 'color-scan': {
              r = Math.min(255, r * 1.1);
              g = Math.min(255, g * 1.1);
              b = Math.min(255, b * 1.1);
              break;
            }
            case 'soft-scan': {
              r = r * 0.9 + 20;
              g = g * 0.9 + 20;
              b = b * 0.9 + 20;
              break;
            }
            case 'auto-enhance': {
              r = r * 1.05; g = g * 1.05; b = b * 1.05;
              break;
            }
            case 'color-boost': {
               r = r * 1.2; g = g * 1.2; b = b * 1.2;
               break;
            }
          }
        }
        data[i] = Math.max(0, Math.min(255, r));
        data[i+1] = Math.max(0, Math.min(255, g));
        data[i+2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
  });
};
