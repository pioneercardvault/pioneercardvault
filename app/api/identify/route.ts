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
    const backFile = incomingFormData.get('back') as Blob | null;

    if (!frontFile) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    // 1. Query CardSight API
    const outgoingFormData = new FormData();
    outgoingFormData.append('image', frontFile, 'card.jpg');

    const cardSightRes = await fetch('https://api.cardsight.ai/v1/identify/card', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: outgoingFormData,
    });

    const cardSightData = await cardSightRes.json().catch(() => null);
    let ebayPreFill = null;

    // 2. Prepare Base64 Image Parts for Gemini Vision
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const parts: any[] = [];

      // Add Front Image
      const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: frontBuffer.toString('base64')
        }
      });

      // Add Back Image if present
      if (backFile) {
        const backBuffer = Buffer.from(await backFile.arrayBuffer());
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: backBuffer.toString('base64')
          }
        });
      }

      const prompt = `
You are an expert sports card evaluator and eBay listing specialist.
Analyze the provided card image(s) (Front and Back).

CRITICAL INSTRUCTIONS:
- IGNORE any previous erroneous automated scans. Perform your own direct OCR and visual inspection of the images.
- Read player names, brand, set name, year, card number, team name, and attributes directly off the card images.
- Check if the card is autographed (e.g. signature on front, "Autograph Card" on back).

Generate an optimal eBay listing JSON object with two keys:
1. "title": An eBay listing title, targeting as CLOSE to 80 characters as possible without exceeding 80 characters. Format: [Year] [Manufacturer/Brand] [Set/Release] [Player Name] [Card #] [Team] [Auto/Parallel/RC if applicable] [Sport/Trading Card].
2. "itemSpecifics": An object containing accurate values for these specific eBay fields:
   - "Sport"
   - "Player/Athlete"
   - "Card Name"
   - "Manufacturer"
   - "Season"
   - "Set"
   - "Team"
   - "League"
   - "Card Number"
   - "Parallel/Variety"
   - "Insert Set"
   - "Features"
   - "Type"
   - "Original/Licensed Reprint"
   - "Vintage"
   - "Autographed"
   - "Card Thickness"
   - "Country/Region of Manufacture"
   - "Language"
   - "Customized"
   - "Condition Type"
   - "Card Condition"

Respond ONLY with raw JSON, no markdown codeblocks or extra prose.
`;

      // Prompt goes first
      parts.unshift({ text: prompt });

      try {
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }]
          })
        });

        const aiData = await aiRes.json();
        const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          ebayPreFill = JSON.parse(cleanedJson);
        }
      } catch (aiErr) {
        console.warn('Gemini Vision API Error:', aiErr);
      }
    }

    return NextResponse.json({
      ...cardSightData,
      ebayPreFill,
    });
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