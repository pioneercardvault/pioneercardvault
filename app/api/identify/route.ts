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

    const card = cardSightData?.detections?.[0]?.card;
    let ebayPreFill = null;

    // 2. Convert image to base64 for Gemini multimodal verification
    const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
    const base64Image = frontBuffer.toString('base64');

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const prompt = `
You are an expert sports trading card evaluator and eBay listing specialist.
Analyze this card image alongside the initial scan metadata (if available):
- Scanned Data: ${JSON.stringify(card || {})}

IMPORTANT: Carefully read the text on the front and back of the card in the image to verify player name, team, year, card number, sport, set, and whether it is autographed or an insert. Correct any obvious misidentifications from the scanned data.

Generate an optimal eBay listing JSON object with two keys:
1. "title": An optimized eBay listing title, targeting as CLOSE to 80 characters as possible without exceeding 80 characters. Include high-value keywords (e.g. Year, Brand/Set, Player Name, Card Number, Team, Auto/Rookie/Parallel, Sport).
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

Respond with ONLY valid raw JSON, no markdown codeblocks.
`;

      try {
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          })
        });

        const aiData = await aiRes.json();
        const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          ebayPreFill = JSON.parse(cleanedJson);
        }
      } catch (aiErr) {
        console.warn('AI Enrichment Fallback Error:', aiErr);
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