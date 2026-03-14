import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) return null;
  return data;
}

function decodeBase64Url(str: string): string {
  // Gmail uses URL-safe base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function htmlToText(html: string): string {
  let text = html;
  // Convert block-level elements to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|tr|li|h[1-6]|blockquote)>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' ');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&#\d+;/g, '');
  // Clean up whitespace: collapse spaces within lines, but preserve newlines
  text = text.replace(/[^\S\n]+/g, ' ');
  // Clean up multiple blank lines
  text = text.replace(/\n\s*\n/g, '\n');
  // Trim each line
  text = text.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
  return text;
}

function extractPlainText(payload: any): string {
  // If the payload itself is text/plain
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Search through parts recursively
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const nested = extractPlainText(part);
        if (nested) return nested;
      }
    }
    // Fallback to text/html - convert preserving line structure
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        return htmlToText(html);
      }
    }
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { store_id, max_results = 10, days = 7 } = await req.json();

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get stored tokens for this store
    const { data: tokenRows, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('store_id', store_id);

    const tokenData = tokenRows?.[0];
    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Gmail not connected for this store' }, { status: 404 });
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(tokenData.expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      if (!refreshed) {
        return NextResponse.json({ error: 'Failed to refresh token. Please reconnect Gmail.' }, { status: 401 });
      }

      accessToken = refreshed.access_token;

      // Update stored token
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('store_id', store_id);
    }

    // Search for Etsy order notification emails within time window
    const afterDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`;
    const query = `(subject:"You made a sale on Etsy" OR subject:"Congratulations on your Etsy sale") after:${afterStr}`;
    const listUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${max_results}`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listData = await listRes.json();

    if (listData.error) {
      return NextResponse.json({ error: listData.error.message }, { status: 500 });
    }

    if (!listData.messages || listData.messages.length === 0) {
      return NextResponse.json({ emails: [], message: 'No Etsy order emails found' });
    }

    // Fetch each email's content
    const emails: { id: string; date: string; subject: string; body: string }[] = [];

    for (const msg of listData.messages) {
      const msgRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();

      const headers = msgData.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      const body = extractPlainText(msgData.payload);

      if (body) {
        emails.push({
          id: msg.id,
          date,
          subject,
          body,
        });
      }
    }

    return NextResponse.json({ emails, total: listData.resultSizeEstimate || emails.length });
  } catch (err) {
    console.error('Gmail fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
