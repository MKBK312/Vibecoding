import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { parsePDF, parseMarkdown, chunkPDFText, chunkMarkdownSections } from '@/lib/parser';
import { addDocument, addChunks, getAllDocuments } from '@/lib/db/collections';
import { generateEmbedding } from '@/lib/embedding/encoder';
import { getOrCreateCollection } from '@/lib/db/chroma';
import { COLLECTION_NAMES, SUPPORTED_FILE_TYPES } from '@/lib/constants';
import type { DocumentMeta, DocumentChunk } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_FILE_TYPES.includes(ext)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash('md5').update(buffer).digest('hex');

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, `${hash}_${file.name}`);
    await writeFile(filePath, buffer);

    const documentId = uuidv4();
    let title = file.name.replace(/\.(pdf|md|markdown)$/i, '');
    let chunks: DocumentChunk[] = [];
    let metadata: Record<string, unknown> = {};

    if (ext === 'pdf') {
      const pdfDoc = await parsePDF(buffer);
      title = pdfDoc.title || title;
      metadata = { pageCount: pdfDoc.pageCount };
      chunks = chunkPDFText(pdfDoc.pages, documentId);
    } else {
      const content = buffer.toString('utf-8');
      const mdDoc = parseMarkdown(content, file.name);
      title = mdDoc.title || title;
      metadata = { frontMatter: mdDoc.frontMatter };
      chunks = chunkMarkdownSections(mdDoc.sections, documentId);
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No content extracted' }, { status: 400 });
    }

    const docMeta: DocumentMeta = {
      id: documentId,
      title,
      source_type: ext === 'pdf' ? 'pdf' : 'markdown',
      file_path: filePath,
      file_hash: hash,
      metadata,
      chunk_count: chunks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await addDocument(docMeta);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      const chunksCollection = await getOrCreateCollection(COLLECTION_NAMES.CHUNKS);
      await chunksCollection.add({
        ids: [chunk.id],
        metadatas: [chunk.metadata],
        documents: [chunk.content],
        embeddings: [embedding],
      });
    }

    return NextResponse.json({
      id: documentId,
      title,
      chunk_count: chunks.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const documents = await getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
