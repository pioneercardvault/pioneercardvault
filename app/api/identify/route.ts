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

    if (!cardSightRes.ok) {
      return NextResponse.json(
        { 
          error: `CardSight API returned status ${cardSightRes.status}`, 
          details: cardSightData || 'No response body returned from API.'
        },
        { status: cardSightRes.status }
      );
    }

    const card = cardSightData?.detections?.[0]?.card;
    let ebayPreFill = null;

    // 2. Perform AI Enrichment for full eBay Item Specifics & 80-char Title
    if (card) {
      const prompt = `
You are an expert sports card collector and eBay listing specialist.
Given this identified trading card metadata:
- Player/Card Name: ${card.name}
- Year: ${card.year}
- Manufacturer: ${card.manufacturer}
- Release: ${card.releaseName}
- Set Name: ${card.setName}
- Card Number: ${card.number}
- Attributes: ${JSON.stringify(card.attributes || [])}

Generate an optimal eBay listing JSON object with two keys:
1. "title": An eBay listing title, targeting as CLOSE to 80 characters as possible without going over 80. Include high-value keywords (e.g., Year, Manufacturer, Set, Player, Card Number, Team, RC/Insert/Parallel if applicable, Sport).
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
        // AI enrichment call using standard fetch to an LLM provider or local fallback logic
        const aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + (process.env.GEMINI_API_KEY || process.env.CARDSIGHT_API_KEY), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const aiData = await aiRes.json();
        const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          ebayPreFill = JSON.parse(cleanedJson);
        }
      } catch (aiErr) {
        console.warn('AI Enrichment Fallback:', aiErr);
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