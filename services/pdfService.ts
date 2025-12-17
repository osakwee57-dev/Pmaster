
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
    alert('Sharing is not supported on this browser.');
  }
};

export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    
    const img = new Image();
    img.src = images[i];
    
    // Wait for image to load to get dimensions
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
  
  return doc.output('blob');
};

export const generatePdfFromText = async (text: string): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
  
  doc.setFontSize(11);
  doc.text(splitText, margin, margin);
  return doc.output('blob');
};

export const compressPdf = async (pdfBuffer: ArrayBuffer): Promise<Blob> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  // pdf-lib's save method applies basic flate compression
  const compressedBytes = await pdfDoc.save({ 
    useObjectStreams: true,
    addDefaultPage: false 
  });
  return new Blob([compressedBytes], { type: 'application/pdf' });
};
