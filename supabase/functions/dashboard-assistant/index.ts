// @ts-nocheck
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystemPrompt(context: any): string {
  return `You are Leuro Assistant, an AI productivity assistant built specifically for South African teachers (Grade 1–12). You help teachers with lesson planning, classroom management, parent communication, CAPS curriculum questions, professional development, and daily teaching challenges.

Keep responses concise, practical, and relevant to the South African school context. Use plain language. Where relevant, reference CAPS, terms, SBA, DBE, or South African school realities.

${context ? `Teacher context: ${JSON.stringify(context)}` : ''}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { question, context } = body;
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Assistant unavailable. Please try again.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    const systemPrompt = buildSystemPrompt(context);

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt + '\n\nQuestion: ' + question,
          }],
        }],
      }),
    });

    if (!geminiRes.ok) {
      return new Response(JSON.stringify({ error: 'Assistant unavailable. Please try again.' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Assistant unavailable. Please try again.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Assistant unavailable. Please try again.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }
});
