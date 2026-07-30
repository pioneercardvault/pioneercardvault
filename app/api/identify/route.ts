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
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    // 1. Send front image to CardSight
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
        console.warn('CardSight API error:', err);
      }
    }

    let ebayPreFill = null;

    // 2. Perform direct Gemini Vision OCR on Front & Back images
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

      // Add Back Image
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
Examine the attached card images (Front and Back).

CRITICAL TASK:
- Read all readable text directly from the card image (Front & Back).
- Extract: Player/Athlete Name, Team/College, Sport, Year/Season, Brand/Manufacturer (e.g. Bowman, Topps, Panini), Set Name (e.g. Bowman University Best Football), Card Number (e.g. #BA-MS), Autograph status (look for signature and "Autograph Card" or "Certified Autograph Issue" text).

Generate an optimal eBay listing JSON object with TWO keys:
1. "title": An eBay title targeted CLOSE to 80 characters (max 80).
   Format: [Year] [Manufacturer/Brand] [Set Name] [Player Name] [Card #] [Team] [Auto/Parallel if applicable] [Sport/Trading Card]
2. "itemSpecifics": An object containing key-value pairs for these eBay specifics:
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

Respond ONLY with valid raw JSON, no markdown codeblocks or prose.
`;

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
        console.warn('Gemini API Error:', aiErr);
      }
    }

    // Standardized payload format
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
  return NextResponse.json(
    { message: 'Card identification endpoint active.' },
    { status: 200 }
  );
}