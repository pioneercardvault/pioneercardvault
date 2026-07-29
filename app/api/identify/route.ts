import { NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    // Convert uploaded image file to a Buffer for API transmission
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a form-data object to send to CardSight AI
    const cardsightForm = new FormData();
    cardsightForm.append('image', buffer, {
      filename: file.name || 'card.jpg',
      contentType: file.type || 'image/jpeg',
    });

    // Make request to CardSight AI identification API
    const response = await axios.post(
      'https://api.cardsight.ai/v1/identify/card',
      cardsightForm,
      {
        headers: {
          'X-API-Key': process.env.CARDSIGHT_API_KEY,
          ...cardsightForm.getHeaders(),
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('CardSight API error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to identify card with CardSight AI' },
      { status: 500 }
    );
  }
}