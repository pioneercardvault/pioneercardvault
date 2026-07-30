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
        console.warn('CardSight API error:', err);
      }
    }

    const cardMatch = cardSightData?.detections?.[0]?.card;
    let ebayPreFill = null;

    // 2. Perform Gemini OCR Vision Analysis for both indexed and unindexed cards
    if (geminiKey) {
      const parts: any[] = [];

      // Convert Front Image to Base64
      const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: frontBuffer.toString('base64'),
        },
      });

      // Convert Back Image to Base64 if available
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
You are an expert sports card evaluator and eBay listing specialist.
Examine the attached card image(s) (Front and Back).

CONTEXT FROM DATABASE SCAN:
${JSON.stringify(cardMatch || 'No exact database match found.')}

CRITICAL TASK:
- Read all visible text directly from the card image(s) (Front & Back).
- If the database scan provided accurate info, refine and expand it.
- IF THE DATABASE SCAN WAS WRONG OR UNINDEXED, OVERRIDE IT by extracting details directly off the card image:
  1. Player/Athlete Name (e.g. Maason Smith)
  2. Team/College (e.g. LSU Tigers)
  3. Sport (e.g. Football, Baseball, Basketball)
  4. Season/Year (e.g. 2022)
  5. Manufacturer/Brand (e.g. Bowman, Topps, Panini)
  6. Set Name (e.g. Bowman University Best Football)
  7. Card Number (e.g. #BA-MS)
  8. Autograph status (check for signature or "Certified Autograph Issue" text).

Generate an optimal eBay listing JSON object with TWO keys:
1. "title": An eBay title targeted CLOSE to 80 characters (max 80).
   Format: [Year] [Brand/Manufacturer] [Set] [Player Name] [Card #] [Team] [Auto/RC/Parallel] [Sport/Trading Card]
2. "itemSpecifics": An object containing accurate values for these eBay fields:
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
        console.warn('Gemini API Error:', aiErr);
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