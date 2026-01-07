
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

// Export downloadBlob for utility usage
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

// Export shareBlob for mobile sharing
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

// Export extractTextFromPdf for conversion tools
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

// Export extractTextFromDocx for doc parser
export const extractTextFromDocx = async (buffer: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
};

// Export generateDocxFromText for export functionality
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

// Implement mergeHybridPdf to support PDF merging tool
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

// FIXED: generatePdfFromImages now creates pages that match image dimensions exactly.
// This removes the white bars/borders caused by aspect ratio mismatch on standard A4 pages.
export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  if (!images.length) return new Blob([], { type: 'application/pdf' });

  // Use the first image to initialize the document settings
  const tempDoc = new jsPDF();
  const firstProps = tempDoc.getImageProperties(images[0]);
  
  const doc = new jsPDF({
    orientation: firstProps.width > firstProps.height ? 'l' : 'p',
    unit: 'px',
    format: [firstProps.width, firstProps.height]
  });

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const props = doc.getImageProperties(img);
    
    if (i > 0) {
      // Add a page with the exact dimensions of the current image
      doc.addPage([props.width, props.height], props.width > props.height ? 'l' : 'p');
    }
    
    doc.addImage(img, 'JPEG', 0, 0, props.width, props.height);
  }
  
  return doc.output('blob');
};

// Implement generatePdfFromMixedContent for Doc Builder tool
export const generatePdfFromMixedContent = async (blocks: any[]): Promise<Blob> => {
  const doc = new jsPDF();
  let cursorY = 10;
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - 2 * margin;

  for (const block of blocks) {
    if (cursorY > pageHeight - 20) {
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
      
      if (cursorY + imgHeight > pageHeight - 10) {
        if (imgHeight > pageHeight - 20) {
           const scale = (pageHeight - 20) / imgHeight;
           const finalW = imgWidth * scale;
           const finalH = imgHeight * scale;
           doc.addPage();
           doc.addImage(block.value, 'JPEG', margin, 10, finalW, finalH);
           cursorY = finalH + 15;
        } else {
           doc.addPage();
           doc.addImage(block.value, 'JPEG', margin, 10, imgWidth, imgHeight);
           cursorY = imgHeight + 15;
        }
      } else {
        doc.addImage(block.value, 'JPEG', margin, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 5;
      }
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
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          cursorY = 10;
        }
      }
    }
  }
  return doc.output('blob');
};

export interface AdvancedPdfOptions {
  pageSize: 'a4' | 'letter' | 'legal' | 'fit';
  orientation: 'p' | 'l';
  margin: number;
  spacing: number;
  quality: 'low' | 'medium' | 'high';
  ocrEnabled: boolean;
  onProgress?: (progress: number, status: string) => void;
}

// Implement generateAdvancedPdfFromImages with better edge-to-edge support
export const generateAdvancedPdfFromImages = async (images: string[], options: AdvancedPdfOptions): Promise<{ blob: Blob, recognizedText: string }> => {
  const isFit = options.pageSize === 'fit';
  
  // Use first image for initial setup if fitting
  let initialFormat: any = options.pageSize;
  if (isFit && images.length > 0) {
    const tempDoc = new jsPDF();
    const p = tempDoc.getImageProperties(images[0]);
    initialFormat = [p.width, p.height];
  }

  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: initialFormat
  });

  let recognizedText = "";
  const total = images.length;

  for (let i = 0; i < total; i++) {
    const status = `Processing page ${i + 1} of ${total}...`;
    options.onProgress?.(Math.round((i / total) * 100), status);

    const img = images[i];
    const props = doc.getImageProperties(img);

    if (i > 0) {
      if (isFit) {
        doc.addPage([props.width, props.height], props.width > props.height ? 'l' : 'p');
      } else {
        doc.addPage(options.pageSize, options.orientation);
      }
    }

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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Calculate usable area
    const m = options.margin;
    const usableWidth = pageWidth - 2 * m;
    const usableHeight = pageHeight - 2 * m;
    
    const widthRatio = usableWidth / props.width;
    const heightRatio = usableHeight / props.height;
    const ratio = Math.min(widthRatio, heightRatio);
    
    const w = props.width * ratio;
    const h = props.height * ratio;
    
    const x = m + (usableWidth - w) / 2;
    const y = m + (usableHeight - h) / 2;
    
    doc.addImage(img, 'JPEG', x, y, w, h);
  }

  options.onProgress?.(100, "Finalizing...");
  return { blob: doc.output('blob'), recognizedText };
};

// Implement compressPdf for compression and shrinking tools
export const compressPdf = async (buffer: ArrayBuffer, preset?: string, onProgress?: (msg: string) => void): Promise<Blob> => {
  onProgress?.("Analyzing PDF structure...");
  const pdfDoc = await PDFDocument.load(buffer);
  onProgress?.("Optimizing object streams...");
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

// The processImage function
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
