import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CARDSIGHT_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const incomingFormData = await req.formData();
    const frontFile = incomingFormData.get('front') as Blob | null;
    const backFile = incomingFormData.get('back') as Blob | null;

    if (!frontFile) {
      return NextResponse.json({ error: 'No front image provided.' }, { status: 400 });
    }

    // 1. Query CardSight API
    let cardSightData = null;
    if (apiKey) {
      try {
        const outgoingFormData = new FormData();
        outgoingFormData.append('image', frontFile, 'card.jpg');

        const cardSightRes = await fetch('https://api.cardsight.ai/v1/identify/card', {
          method: 'POST',
          headers: { 'X-API-Key': apiKey },
          body: outgoingFormData,
        });
        cardSightData = await cardSightRes.json().catch(() => null);
      } catch (err) {
        console.warn('CardSight API Error:', err);
      }
    }

    let ebayPreFill = null;

    // 2. Query Gemini Vision API (if GEMINI_API_KEY is configured)
    if (geminiKey) {
      const parts: any[] = [];

      const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: frontBuffer.toString('base64'),
        },
      });

      if (backFile) {
        const backBuffer = Buffer.from(await backFile.arrayBuffer());
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: backBuffer.toString('base64'),
          },
        });
      }

      const prompt = `
You are an expert trading card evaluator and eBay listing specialist.
Examine the attached card image(s) (Front and Back).

CRITICAL TASK:
- Read all readable text directly off the front and back of the card images.
- Identify the exact Player/Athlete Name, Team Name, Sport, Year/Season, Brand/Manufacturer, Set Name, Card Number, and Autograph status.

Generate a JSON object with two keys:
1. "title": An optimized eBay title targeted as CLOSE to 80 characters as possible (max 80).
   Format: [Year] [Manufacturer/Brand] [Set Name] [Player Name] [Card #] [Team] [Auto/RC/Parallel if applicable] [Sport/Trading Card]
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

Respond ONLY with valid raw JSON. No markdown codeblocks (\`\`\`json) and no conversational text.
`;

      parts.unshift({ text: prompt });

      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] }),
          }
        );

        const aiData = await aiRes.json();
        const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          ebayPreFill = JSON.parse(cleanedJson);
        }
      } catch (aiErr) {
        console.warn('Gemini Vision API error:', aiErr);
      }
    }

    return NextResponse.json({
      detections: cardSightData?.detections || [],
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
  return NextResponse.json({ message: 'Card identification endpoint active.' }, { status: 200 });
}