// @ts-nocheck
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a CAPS curriculum expert for South African schools (Grade 1–12). You generate structured, pedagogically sound lesson plans that are fully aligned to the CAPS (Curriculum and Assessment Policy Statement) document.

Always respond with valid JSON only. No markdown, no explanation, no preamble. Just the JSON object.`;

function buildUserMessage(body: any): string {
  const {
    grade, subject, term, week, duration, topic, language, additionalNotes,
  } = body;

  return `Generate a CAPS-aligned lesson plan for the following:

Grade: ${grade}
Subject: ${subject}
Term: ${term}
Week: ${week}
Duration: ${duration} minutes
Topic / CAPS Section: ${topic}
Language of instruction: ${language}
Additional notes: ${additionalNotes || 'None'}

Return a JSON object with exactly these fields:
{
  "sub_topic": "string — the specific sub-topic within the topic",
  "caps_reference": "string — the exact CAPS document reference e.g. 'NS&T Grade 6 Term 2 — Matter & Materials: Mixtures (CAPS p. 42)'",
  "learning_objectives": "string — numbered list of 3 learning objectives, each on a new line starting with 1. 2. 3.",
  "prior_knowledge": "string — what learners should already know before this lesson",
  "resources_materials": "string — comma-separated list of required resources and materials",
  "teacher_activities": "string — numbered list of timed teacher activities that add up to ${duration} minutes, format: '1. Introduction (X min): description'",
  "learner_activities": "string — numbered list of learner activities aligned to teacher activities, format: '1. description'",
  "differentiation_support": "string — support strategies for struggling learners AND extension for advanced learners AND EAL support if applicable",
  "assessment": "string — describe informal and/or formal assessment strategy for this lesson"
}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server is not configured with an API key.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: buildUserMessage(body) },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: 'AI request failed.', details: errText }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData?.content?.[0]?.text ?? '';

    let lessonPlan;
    try {
      lessonPlan = JSON.parse(rawText);
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'AI response could not be parsed.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(lessonPlan), {
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected server error.', details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }
});
