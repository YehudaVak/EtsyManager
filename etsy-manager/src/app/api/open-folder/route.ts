import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Sanitize: only allow local filesystem paths, block command injection
    const normalized = path.replace(/\//g, '\\');
    if (/[;&|`$]/.test(normalized)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!existsSync(normalized)) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Open folder in Windows Explorer
    exec(`explorer.exe "${normalized}"`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to open folder' }, { status: 500 });
  }
}
