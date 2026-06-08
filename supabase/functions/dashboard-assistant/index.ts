// @ts-nocheck
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { question, context } = body;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not found' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    const systemPrompt = `You are Leuro Assistant, an AI productivity assistant built specifically for South African teachers (Grade 1–12). You help teachers with lesson planning, classroom management, parent communication, CAPS curriculum questions, professional development, and daily teaching challenges. Keep responses concise, practical, and relevant to the South African school context. Reference CAPS, terms, SBA, DBE, or South African school realities where relevant.${context ? ` Teacher context: ${JSON.stringify(context)}` : ''}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: question }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'AI error', debug: data }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    const text = data?.content?.[0]?.text;

    if (!text) {
      return new Response(JSON.stringify({ error: 'No response from AI', debug: data }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ response: text }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected error', debug: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }
});
