import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set in Vercel Environment Variables.' },
        { status: 500 }
      );
    }

    const incomingFormData = await req.formData();
    const frontFile = incomingFormData.get('front') as Blob | null;
    const backFile = incomingFormData.get('back') as Blob | null;

    if (!frontFile) {
      return NextResponse.json({ error: 'No front image provided.' }, { status: 400 });
    }

    // 1. Convert Images to Base64
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

    // 2. Vision OCR Prompt
    const prompt = `
You are an expert sports trading card evaluator and eBay listing specialist.
Examine the attached card image(s) (Front and Back).

CRITICAL INSTRUCTION:
- Perform direct Optical Character Recognition (OCR) on the images.
- Read player names, team name, set name, card number, year, brand, and autograph status directly off the card images.

Generate a JSON object with TWO keys:
1. "title": An eBay title targeted CLOSE to 80 characters as possible (max 80).
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

Respond ONLY with valid raw JSON, no markdown codeblocks or prose.
`;

    parts.unshift({ text: prompt });

    // 3. Call Gemini REST API using current model name (gemini-2.5-flash)
    let aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    );

    // Fallback model check if 2.5 endpoint isn't active on your project
    if (!aiRes.ok) {
      aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );
    }

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      console.error('Gemini API Error:', aiData);
      return NextResponse.json(
        { 
          error: `Gemini API returned status ${aiRes.status}`, 
          details: aiData?.error?.message || JSON.stringify(aiData) 
        },
        { status: aiRes.status }
      );
    }

    const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: 'Gemini Vision could not read card image text.', details: JSON.stringify(aiData) },
        { status: 500 }
      );
    }

    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const ebayPreFill = JSON.parse(cleanedJson);

    return NextResponse.json({
      ebayPreFill,
      status: 'success'
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