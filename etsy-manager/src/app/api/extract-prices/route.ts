import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import dns from 'dns';

// Force IPv4 to avoid IPv6 connection reset issues
dns.setDefaultResultOrder('ipv4first');

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Missing imageBase64 or mediaType' }, { status: 400 });
    }

    console.log(`[extract-prices] Calling Claude API with ${(imageBase64.length / 1024).toFixed(0)}KB image (${mediaType})`);

    const requestBody = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Extract the pricing data from this supplier pricing table image. Return ONLY a JSON array with objects containing "country", "price" (number), and "shipping_time" (string). Use standard country codes: US, UK/GB, DE, CA, AU, CH, SE, BE, NL, FR, IT, ES, etc. Example format:
[{"country":"US","price":33.13,"shipping_time":"6-12 days"},{"country":"UK/GB","price":29.11,"shipping_time":"6-10 days"}]
Return ONLY the JSON array, no other text.`,
          },
        ],
      }],
    });

    // Use Node.js https module with IPv4 to avoid IPv6 connection issues
    const responseText = await new Promise<string>((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        family: 4, // Force IPv4
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Claude API returned ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    const claudeData = JSON.parse(responseText);
    const text = claudeData.content?.[0]?.text || '';
    console.log(`[extract-prices] Claude response: ${text}`);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse prices from image', raw: text }, { status: 422 });
    }

    const prices = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ prices });
  } catch (error: any) {
    console.error('[extract-prices] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to extract prices', details: error?.message || String(error) }, { status: 500 });
  }
}
