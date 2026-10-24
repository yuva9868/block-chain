import { NextRequest, NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { authorizeRecord, findRecord } from '@/lib/server/access';
import { appendAudit } from '@/lib/server/audit';
import { loadDecryptedFile } from '@/lib/server/store';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = assertRole(await getSession(), ['patient', 'doctor']);
    const { id } = await context.params;
    const record = await findRecord(id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    await authorizeRecord(session, record, { requireFile: true });
    const bytes = await loadDecryptedFile(record.id);
    await appendAudit({
      action: 'authorized_record_access',
      actor: session.address,
      recordId: record.id,
      source: 'off-chain',
      details: 'file_download',
    });
    return new NextResponse(Uint8Array.from(bytes), {
      headers: {
        'Content-Type': record.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${record.filename.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const { status, message } = jsonError(error, 401);
    return NextResponse.json({ error: message }, { status });
  }
}
