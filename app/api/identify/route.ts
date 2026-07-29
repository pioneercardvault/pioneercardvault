import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CARDSIGHT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'CardSight API key missing from environment variables.' },
        { status: 500 }
      );
    }

    const incomingFormData = await req.formData();
    const frontFile = incomingFormData.get('front') as Blob | null;

    if (!frontFile) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    // Prepare multipart/form-data for CardSight
    const outgoingFormData = new FormData();
    // CardSight expects the form field key to be 'image'
    outgoingFormData.append('image', frontFile, 'card.jpg');

    // Make request to CardSight's card identification endpoint
    const response = await fetch('https://api.cardsight.ai/v1/identify/card', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: outgoingFormData,
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `CardSight API returned status ${response.status}`, 
          details: responseData || 'No response body returned from API.'
        },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
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