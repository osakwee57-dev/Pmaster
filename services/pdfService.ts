
import { jsPDF } from 'jspdf';
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib';
import Tesseract from 'tesseract.js';

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

export interface AdvancedPdfOptions {
  pageSize: 'a4' | 'letter' | 'legal';
  orientation: 'p' | 'l';
  margin: number;
  spacing: number;
  quality: 'low' | 'medium' | 'high';
  ocrEnabled: boolean;
  onProgress?: (progress: number, status: string) => void;
}

/**
 * Advanced PDF Generator from Images
 * Supports layout customization and searchable text via OCR
 */
export const generateAdvancedPdfFromImages = async (
  images: string[], 
  options: AdvancedPdfOptions
): Promise<{ blob: Blob, recognizedText: string }> => {
  const { pageSize, orientation, margin, spacing, quality, ocrEnabled, onProgress } = options;
  
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: pageSize,
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);
  
  const compressionMap = { low: 0.3, medium: 0.7, high: 1.0 };
  const imgQuality = compressionMap[quality];

  let fullRecognizedText = "";

  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    
    onProgress?.((i / images.length) * 100, `Processing page ${i + 1}...`);

    const img = new Image();
    img.src = images[i];
    await new Promise((resolve) => { img.onload = resolve; });

    // Handle OCR if enabled
    if (ocrEnabled) {
      onProgress?.(((i + 0.5) / images.length) * 100, `Running OCR on page ${i + 1}...`);
      const result = await Tesseract.recognize(images[i], 'eng');
      fullRecognizedText += `--- Page ${i + 1} ---\n${result.data.text}\n\n`;

      // Add invisible text layer for searchability
      doc.setTextColor(0, 0, 0);
      doc.setGState(new (doc as any).GState({ opacity: 0 })); // Make text invisible
      result.data.words.forEach(word => {
        // Simple mapping: scale Tesseract coordinates to PDF space
        // This is a rough approximation for searchability
        const scaleX = contentWidth / img.width;
        const scaleY = contentHeight / img.height;
        const tx = margin + (word.bbox.x0 * scaleX);
        const ty = margin + (word.bbox.y0 * scaleY);
        const fontSize = (word.bbox.y1 - word.bbox.y0) * scaleY * 2.83465; // px to pt
        doc.setFontSize(fontSize);
        doc.text(word.text, tx, ty);
      });
      doc.setGState(new (doc as any).GState({ opacity: 1 })); // Reset opacity
    }

    // Add Image
    const ratio = img.width / img.height;
    let finalW = contentWidth;
    let finalH = contentWidth / ratio;

    if (finalH > contentHeight) {
      finalH = contentHeight;
      finalW = contentHeight * ratio;
    }

    const x = margin + (contentWidth - finalW) / 2;
    const y = margin + (contentHeight - finalH) / 2;

    doc.addImage(images[i], 'JPEG', x, y, finalW, finalH, undefined, 'FAST', 0);
  }

  onProgress?.(100, "Finalizing document...");
  const blob = doc.output('blob') as unknown as Blob;
  return { blob, recognizedText: fullRecognizedText };
};

export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  // Legacy support for basic tool
  const result = await generateAdvancedPdfFromImages(images, {
    pageSize: 'a4',
    orientation: 'p',
    margin: 10,
    spacing: 0,
    quality: 'high',
    ocrEnabled: false
  });
  return result.blob;
};

export const generatePdfFromText = async (text: string): Promise<Blob> => {
  const doc = new jsPDF({ compress: true });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.setFontSize(11);
  doc.text(splitText, margin, margin);
  return doc.output('blob') as unknown as Blob;
};

/**
 * Structural PDF Optimization Service
 */
export const compressPdf = async (
  buffer: ArrayBuffer, 
  preset: 'screen' | 'ebook' | 'printer' = 'screen',
  onProgress?: (msg: string) => void
): Promise<Blob> => {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const newPdf = await PDFDocument.create();
    const indices = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
    const copiedPages = await newPdf.copyPages(pdfDoc, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    
    const compressedBytes = await newPdf.save({ 
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false
    });
    
    return new Blob([compressedBytes], { type: 'application/pdf' });
  } catch (err) {
    console.error("Ghostscript-Engine simulation error:", err);
    throw err;
  }
};

export interface ProcessOptions {
  filter?: string;
  flipH?: boolean;
  flipV?: boolean;
  rotate?: number;
  crop?: { x: number; y: number; width: number; height: number };
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
      
      if (options.filter && options.filter !== 'none') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (options.filter === 'grayscale') {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
          } else if (options.filter === 'sepia') {
            const r = data[i], g = data[i+1], b = data[i+2];
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i+1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i+2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          } else if (options.filter === 'high-contrast') {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const val = avg > 128 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      ctx.restore();
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};
