import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const storeId = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/admin/stores?gmail_error=${error}`, req.nextUrl.origin));
  }

  if (!code || !storeId) {
    return NextResponse.redirect(new URL('/admin/stores?gmail_error=missing_params', req.nextUrl.origin));
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/gmail/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return NextResponse.redirect(
        new URL(`/admin/stores?gmail_error=${tokens.error}`, req.nextUrl.origin)
      );
    }

    // Get the user's email address
    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // Store tokens in Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: upsertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        store_id: storeId,
        email: profile.emailAddress,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }, { onConflict: 'store_id' });

    if (upsertError) {
      console.error('Error storing Gmail tokens:', upsertError);
      return NextResponse.redirect(
        new URL(`/admin/stores?gmail_error=db_error`, req.nextUrl.origin)
      );
    }

    return NextResponse.redirect(
      new URL(`/admin/stores?gmail_connected=true&gmail_email=${profile.emailAddress}`, req.nextUrl.origin)
    );
  } catch (err) {
    console.error('Gmail OAuth error:', err);
    return NextResponse.redirect(
      new URL(`/admin/stores?gmail_error=exchange_failed`, req.nextUrl.origin)
    );
  }
}
