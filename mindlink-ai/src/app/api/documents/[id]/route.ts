import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, deleteDocument, deleteChunksByDocumentId, getChunksByDocumentId } from '@/lib/db/collections';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  const chunks = await getChunksByDocumentId(id);
  return NextResponse.json({ document: doc, chunks });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteChunksByDocumentId(id);
  await deleteDocument(id);
  return NextResponse.json({ success: true });
}
