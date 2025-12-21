
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';

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

export interface AdvancedPdfOptions {
  pageSize: 'a4' | 'letter' | 'legal';
  orientation: 'p' | 'l';
  margin: number;
  spacing: number;
  quality: 'low' | 'medium' | 'high';
  ocrEnabled: boolean;
  onProgress?: (progress: number, status: string) => void;
}

const reencodeImage = async (base64: string, quality: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
  });
};

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
  
  const qualityLevels = { low: 0.3, medium: 0.6, high: 0.95 };
  const targetQuality = qualityLevels[quality];

  let fullRecognizedText = "";

  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    
    onProgress?.((i / images.length) * 100, `Preparing page ${i + 1}...`);

    let currentImg = images[i];
    
    if (quality !== 'high') {
      onProgress?.(((i + 0.2) / images.length) * 100, `Optimizing page ${i + 1}...`);
      currentImg = await reencodeImage(images[i], targetQuality);
    }

    if (ocrEnabled) {
      onProgress?.(((i + 0.5) / images.length) * 100, `Running OCR on page ${i + 1}...`);
      try {
        const result = await Tesseract.recognize(currentImg, 'eng');
        fullRecognizedText += `--- Page ${i + 1} ---\n${result.data.text}\n\n`;
        doc.setGState(new (doc as any).GState({ opacity: 0 }));
        doc.setFontSize(1);
        doc.text(result.data.text.substring(0, 1000), margin, pageHeight - margin);
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      } catch (ocrErr) {
        console.warn("OCR failed for page", i, ocrErr);
      }
    }

    const img = new Image();
    img.src = currentImg;
    await new Promise((resolve) => { 
      img.onload = resolve; 
      img.onerror = resolve; 
    });

    const ratio = img.width / img.height;
    let finalW = contentWidth;
    let finalH = contentWidth / ratio;

    if (finalH > contentHeight) {
      finalH = contentHeight;
      finalW = contentHeight * ratio;
    }

    const x = margin + (contentWidth - finalW) / 2;
    const y = margin + (contentHeight - finalH) / 2;

    doc.addImage(currentImg, 'JPEG', x, y, finalW, finalH, undefined, quality === 'low' ? 'FAST' : 'SLOW', 0);
  }

  onProgress?.(100, "Finalizing...");
  const blob = doc.output('blob') as unknown as Blob;
  return { blob, recognizedText: fullRecognizedText };
};

export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
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

/**
 * Robust Mixed Content Engine (10mm Margin)
 */
export const generatePdfFromMixedContent = async (content: { type: 'text' | 'image', value: string, widthPercent?: number }[]): Promise<Blob> => {
  const doc = new jsPDF({ 
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true 
  });

  const margin = 10;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const bottomMargin = margin;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  let cursorY = margin;
  const lineHeight = 6;
  const blockSpacing = 8;

  for (const block of content) {
    if (block.type === 'text') {
      const lines: string[] = doc.splitTextToSize(block.value, contentWidth);
      for (const line of lines) {
        if (cursorY + lineHeight > pageHeight - bottomMargin) {
          doc.addPage();
          cursorY = margin;
        }
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
      }
      cursorY += blockSpacing / 2;
    } else if (block.type === 'image') {
      const img = new Image();
      img.src = block.value;
      await new Promise((resolve) => { 
        img.onload = resolve; 
        img.onerror = resolve; 
      });

      const ratio = img.width / img.height;
      const widthFactor = (block.widthPercent || 100) / 100;
      const imgW = contentWidth * widthFactor;
      const imgH = imgW / ratio;

      const maxAvailableH = pageHeight - margin - bottomMargin;
      let finalW = imgW;
      let finalH = imgH;
      
      if (finalH > maxAvailableH) {
        finalH = maxAvailableH;
        finalW = finalH * ratio;
      }

      if (cursorY + finalH > pageHeight - bottomMargin) {
        doc.addPage();
        cursorY = margin;
      }

      doc.addImage(block.value, 'JPEG', margin + (contentWidth - finalW) / 2, cursorY, finalW, finalH);
      cursorY += finalH + blockSpacing;
    }
  }

  return doc.output('blob') as unknown as Blob;
};

/**
 * Advanced Hybrid Merger
 * Intelligently combines raw PDF pages with newly generated text pages.
 */
export const mergeHybridPdf = async (pages: Array<
  { type: 'original', buffer: ArrayBuffer, pageIndex: number } | 
  { type: 'text', value: string }
>): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();
  const bufferMap = new Map<ArrayBuffer, PDFDocument>();

  for (const p of pages) {
    if (p.type === 'original') {
      let sourcePdf = bufferMap.get(p.buffer);
      if (!sourcePdf) {
        sourcePdf = await PDFDocument.load(p.buffer);
        bufferMap.set(p.buffer, sourcePdf);
      }
      const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [p.pageIndex]);
      mergedPdf.addPage(copiedPage);
    } else {
      // Create a temporary PDF for the text and extract its pages
      const textBlob = await generatePdfFromText(p.value);
      const textBuffer = await textBlob.arrayBuffer();
      const textPdf = await PDFDocument.load(textBuffer);
      const indices = Array.from({ length: textPdf.getPageCount() }, (_, i) => i);
      const copiedPages = await mergedPdf.copyPages(textPdf, indices);
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
  }
  
  const bytes = await mergedPdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
};

export const mergePdfsByPages = async (pages: { buffer: ArrayBuffer, pageIndex: number }[]): Promise<Blob> => {
  return mergeHybridPdf(pages.map(p => ({ type: 'original', buffer: p.buffer, pageIndex: p.pageIndex })));
};

export const generatePdfFromText = async (text: string): Promise<Blob> => {
  return generatePdfFromMixedContent([{ type: 'text', value: text }]);
};

export const compressPdf = async (
  buffer: ArrayBuffer, 
  preset: 'screen' | 'ebook' | 'printer' = 'screen',
  onProgress?: (msg: string) => void
): Promise<Blob> => {
  try {
    onProgress?.("Loading document...");
    const pdfDoc = await PDFDocument.load(buffer);
    const newPdf = await PDFDocument.create();
    
    onProgress?.("Optimizing pages...");
    const indices = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
    const copiedPages = await newPdf.copyPages(pdfDoc, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    
    onProgress?.(`Applying ${preset} optimization...`);
    const compressedBytes = await newPdf.save({ 
      useObjectStreams: true,
      addDefaultPage: false
    });
    
    return new Blob([compressedBytes], { type: 'application/pdf' });
  } catch (err) {
    console.error("Compression error:", err);
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
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(base64);
  });
};
