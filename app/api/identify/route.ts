import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const apiKey = process.env.CARDSIGHT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'CardSight API key missing from environment variables' },
        { status: 500 }
      );
    }

    // Forward the payload to CardSight API
    const cardSightData = new FormData();
    
    // Extract front image
    const frontImage = formData.get('front') || formData.get('file') || formData.get('image');
    if (frontImage && frontImage instanceof Blob) {
      const buffer = Buffer.from(await frontImage.arrayBuffer());
      cardSightData.append('front', buffer, { filename: 'front.jpg' });
    }

    // Extract back image if present
    const backImage = formData.get('back');
    if (backImage && backImage instanceof Blob) {
      const buffer = Buffer.from(await backImage.arrayBuffer());
      cardSightData.append('back', buffer, { filename: 'back.jpg' });
    }

    // Make the request to CardSight API
    const response = await axios.post('https://api.cardsight.ai/v1/identify', cardSightData, {
      headers: {
        ...cardSightData.getHeaders(),
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('CardSight API error:', error?.response?.data || error?.message || error);
    
    return NextResponse.json(
      { 
        error: 'Error scanning card', 
        details: error?.response?.data || error?.message 
      },
      { status: error?.response?.status || 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Card identification endpoint is active. Use POST to upload images.' },
    { status: 200 }
  );
}