import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocument, PDFPage } from '@/lib/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parsePDF(arrayBuffer: ArrayBuffer): Promise<PDFDocument> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: PDFPage[] = [];
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push({ pageNumber: i, content: pageText });
    fullText += pageText + '\n\n';
  }

  return {
    title: '',
    pageCount: pdf.numPages,
    pages,
  };
}
