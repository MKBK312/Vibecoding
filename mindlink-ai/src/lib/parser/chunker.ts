import { v4 as uuidv4 } from 'uuid';
import type { DocumentChunk } from '@/lib/types';
import { CHUNK_MIN_CHARS, CHUNK_MAX_CHARS } from '../constants';

export function chunkPDFText(pages: { pageNumber: number; content: string }[], documentId: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let currentChunk = '';
  let currentPageNumbers: number[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    if (!page.content.trim()) continue;

    if (currentChunk.length + page.content.length > CHUNK_MAX_CHARS) {
      if (currentChunk.length >= CHUNK_MIN_CHARS) {
        chunks.push({
          id: uuidv4(),
          document_id: documentId,
          content: currentChunk.trim(),
          chunk_index: chunkIndex++,
          page_number: currentPageNumbers.length === 1 ? currentPageNumbers[0] : null,
          metadata: {
            document_id: documentId,
            source_file: 'pdf',
            page_range: currentPageNumbers.length === 1 ? `p.${currentPageNumbers[0]}` : `p.${currentPageNumbers[0]}-${currentPageNumbers[currentPageNumbers.length - 1]}`,
          },
        });
        currentChunk = '';
        currentPageNumbers = [];
      }
    }

    if (currentChunk.length + page.content.length <= CHUNK_MAX_CHARS) {
      currentChunk += page.content + '\n\n';
      currentPageNumbers.push(page.pageNumber);
    }

    while (currentChunk.length >= CHUNK_MIN_CHARS) {
      chunks.push({
        id: uuidv4(),
        document_id: documentId,
        content: currentChunk.trim(),
        chunk_index: chunkIndex++,
        page_number: currentPageNumbers[0] || null,
        metadata: {
          document_id: documentId,
          source_file: 'pdf',
          page_range: `p.${currentPageNumbers[0]}`,
        },
      });
      currentChunk = '';
      currentPageNumbers = currentPageNumbers.slice(1);
    }
  }

  if (currentChunk.trim().length >= CHUNK_MIN_CHARS) {
    chunks.push({
      id: uuidv4(),
      document_id: documentId,
      content: currentChunk.trim(),
      chunk_index: chunkIndex,
      page_number: currentPageNumbers[0] || null,
      metadata: {
        document_id: documentId,
        source_file: 'pdf',
        page_range: currentPageNumbers.length === 1 ? `p.${currentPageNumbers[0]}` : `p.${currentPageNumbers[0]}-${currentPageNumbers[currentPageNumbers.length - 1]}`,
      },
    });
  }

  return chunks;
}

export function chunkMarkdownSections(
  sections: { heading: string; content: string }[],
  documentId: string
): DocumentChunk[] {
  return sections.map((section, index) => ({
    id: uuidv4(),
    document_id: documentId,
    content: section.content,
    chunk_index: index,
    page_number: null,
    metadata: {
      document_id: documentId,
      source_file: 'markdown',
      heading: section.heading,
    },
  }));
}
