
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

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

    doc.addImage(images[i], 'JPEG', x, y, finalW, finalH, undefined, 'FAST');
  }
  
  return doc.output('blob') as unknown as Blob;
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
  return doc.output('blob') as unknown as Blob;
};

export const compressPdf = async (pdfBuffer: ArrayBuffer): Promise<Blob> => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const compressedBytes = await pdfDoc.save({ 
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerStream: 50
    });

    return new Blob([compressedBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error("Compression error:", error);
    return new Blob([pdfBuffer], { type: 'application/pdf' });
  }
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
      resolve(canvas.toDataURL('image/jpeg', 0.8)); 
    };
  });
};
