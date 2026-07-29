import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CARDSIGHT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'CardSight API key missing from environment variables' },
        { status: 500 }
      );
    }

    const incomingFormData = await req.formData();
    const frontFile = incomingFormData.get('front') as Blob | null;
    const backFile = incomingFormData.get('back') as Blob | null;

    if (!frontFile) {
      return NextResponse.json({ error: 'No front image provided' }, { status: 400 });
    }

    const outgoingFormData = new FormData();
    outgoingFormData.append('front', frontFile, 'front.jpg');

    if (backFile) {
      outgoingFormData.append('back', backFile, 'back.jpg');
    }

    const response = await fetch('https://api.cardsight.ai/v1/identify', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
      body: outgoingFormData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'CardSight API request failed', details: responseData },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || error },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Card identification endpoint is active. Use POST to upload images.' },
    { status: 200 }
  );
}