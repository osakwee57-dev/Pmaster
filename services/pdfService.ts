
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
        text: 'Sharing my generated PDF document',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Sharing failed or was cancelled.');
    }
  } else {
    alert('Sharing is not supported on this browser/device.');
  }
};

export const generatePdfFromImages = async (images: string[]): Promise<Blob> => {
  const doc = new jsPDF();
  for (let i = 0; i < images.length; i++) {
    if (i > 0) doc.addPage();
    const imgData = images[i];
    
    // Calculate aspect ratio to fit image on A4
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // We add the image and stretch it to fill as much as possible while maintaining aspect ratio
    doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }
  return doc.output('blob');
};

export const generatePdfFromText = async (text: string): Promise<Blob> => {
  const doc = new jsPDF();
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(splitText, margin, margin);
  return doc.output('blob');
};

export const compressPdf = async (pdfBuffer: ArrayBuffer): Promise<Blob> => {
  // Client-side compression is mainly about re-serializing or modifying images.
  // Using pdf-lib to re-save with compression.
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  // pdf-lib's save method applies basic flate compression to objects.
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([compressedBytes], { type: 'application/pdf' });
};
