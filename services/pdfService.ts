
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

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

export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    
    const img = new Image();
    img.src = images[i];
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const imgWidth = img.width;
    const imgHeight = img.height;
    const ratio = imgWidth / imgHeight;

    let finalW = pageWidth;
    let finalH = pageWidth / ratio;

    if (finalH > pageHeight) {
      finalH = pageHeight;
      finalW = pageHeight * ratio;
    }

    const x = (pageWidth - finalW) / 2;
    const y = (pageHeight - finalH) / 2;

    // Use 0.75 quality to balance size and clarity from the start
    doc.addImage(images[i], 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
  }
  
  return doc.output('blob');
};

export const generatePdfFromText = async (text: string): Promise<Blob> => {
  const doc = new jsPDF({
    compress: true
  });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
  
  doc.setFontSize(11);
  doc.text(splitText, margin, margin);
  return doc.output('blob');
};

/**
 * Advanced Compression Logic
 * 1. Performs structural compression (removes metadata, packs objects).
 * 2. If file is still large (>500KB) and structural reduction < 20%, 
 *    it performs high-quality rasterization to achieve the 75% target.
 */
export const compressPdf = async (pdfBuffer: ArrayBuffer): Promise<Blob> => {
  // --- Stage 1: Structural Compression (Keeps text intact) ---
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const structuralBytes = await pdfDoc.save({ 
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false
  });

  const originalSize = pdfBuffer.byteLength;
  const structuralSize = structuralBytes.length;

  // If structural compression already hit a good mark (at least 30% reduction) 
  // or the file is small, return it to keep text selectable.
  if (structuralSize < originalSize * 0.7 || originalSize < 1024 * 500) {
    return new Blob([structuralBytes], { type: 'application/pdf' });
  }

  // --- Stage 2: High-Quality Rasterization (For image-heavy PDFs) ---
  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (pageNum > 1) doc.addPage();
    
    const page = await pdf.getPage(pageNum);
    // Use scale 1.5 for crisp results that look "the same" while allowing 75% size reduction
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    // JPEG quality 0.5 is the "sweet spot" for 75% reduction on most scans
    const imgData = canvas.toDataURL('image/jpeg', 0.5);
    
    const ratio = viewport.width / viewport.height;
    let finalW = pageWidth;
    let finalH = pageWidth / ratio;

    if (finalH > pageHeight) {
      finalH = pageHeight;
      finalW = pageHeight * ratio;
    }

    const x = (pageWidth - finalW) / 2;
    const y = (pageHeight - finalH) / 2;

    doc.addImage(imgData, 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
  }

  const rasterizedBlob = doc.output('blob');
  
  // Return the smaller of the two versions
  return rasterizedBlob.size < structuralSize ? rasterizedBlob : new Blob([structuralBytes], { type: 'application/pdf' });
};

/**
 * Pre-processes an image for OCR by converting to high-contrast grayscale.
 * Significantly improves Tesseract's recognition accuracy for photos.
 */
export const preprocessForOcr = async (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // High-contrast conversion: more weight to green for brightness
        const grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        // Sharpen text by setting a firm threshold
        const val = grayscale > 130 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
  });
};

export interface ProcessOptions {
  filter?: string;
  flipH?: boolean;
  flipV?: boolean;
  rotate?: number;
  crop?: { x: number; y: number; width: number; height: number };
}

export const processImage = async (
  base64: string, 
  options: ProcessOptions
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      const angle = (options.rotate || 0) % 360;
      let targetW = img.width;
      let targetH = img.height;
      
      if (angle === 90 || angle === 270) {
        targetW = img.height;
        targetH = img.width;
      }

      if (options.crop) {
        canvas.width = options.crop.width;
        canvas.height = options.crop.height;
      } else {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      
      const drawCanvas = document.createElement('canvas');
      const dctx = drawCanvas.getContext('2d')!;
      drawCanvas.width = targetW;
      drawCanvas.height = targetH;
      
      dctx.save();
      dctx.translate(targetW / 2, targetH / 2);
      dctx.rotate((angle * Math.PI) / 180);
      dctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
      dctx.drawImage(img, -img.width / 2, -img.height / 2);
      dctx.restore();

      if (options.crop) {
        ctx.drawImage(drawCanvas, -options.crop.x, -options.crop.y);
      } else {
        ctx.drawImage(drawCanvas, 0, 0);
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      if (options.filter && options.filter !== 'none') {
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
            const threshold = 128;
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const val = avg > threshold ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      ctx.restore();
      // Use 0.8 quality for standard edited images to maintain sharp look
      resolve(canvas.toDataURL('image/jpeg', 0.8)); 
    };
  });
};
