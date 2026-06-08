// @ts-nocheck
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a CAPS curriculum expert for South African schools (Grade 1–12). You generate high-quality, CAPS-aligned worksheets and memoranda for educators.

Always respond with valid JSON only. No markdown, no explanation, no preamble. Just the JSON object.`;

function buildUserMessage(body: any): string {
  const {
    grade, subject, topic, language, questionTypes, numberOfQuestions,
  } = body;

  return `Generate a CAPS-aligned worksheet with memorandum for the following:

Grade: ${grade}
Subject: ${subject}
Topic / CAPS Section: ${topic}
Language of instruction: ${language}
Question types requested: ${questionTypes}
Total number of questions: ${numberOfQuestions}

The questions must be distributed across these sections based on questionTypes:
- If "Mixed": include True/False, Multiple Choice, and Short Answer questions
- If "True/False only": all questions are True/False
- If "Multiple Choice only": all questions are Multiple Choice
- If "Short Answer only": all questions are Short Answer

Return a JSON object with exactly this structure:
{
  "total_marks": number,
  "instructions": "string — one sentence instruction for learners",
  "sections": [
    {
      "title": "string — section title e.g. 'SECTION A — TRUE OR FALSE'",
      "memo_title": "string — memo section title e.g. 'SECTION A — TRUE OR FALSE — ANSWERS'",
      "type": "true_false" | "multiple_choice" | "short_answer",
      "questions": [
        {
          "number": number,
          "question": "string — the question text",
          "marks": number,
          "options": ["string"] | null,
          "answer": "string — the correct answer",
          "answer_note": "string — brief explanation for the memo, or null for short answer questions",
          "lines": number | null
        }
      ]
    }
  ]
}

Rules:
- true_false questions: options is null, answer is "True" or "False", marks is 1
- multiple_choice questions: options is an array of exactly 4 strings prefixed with "A.", "B.", "C.", "D.", answer is the correct option letter and text e.g. "B. Filtration", marks is 1
- short_answer questions: options is null, answer is a full model answer, answer_note is null, lines is the number of answer lines to show (2 for 2-mark, 3-4 for higher mark questions), marks is 2 or more
- Question numbers must be sequential across all sections starting from 1
- Total marks must equal the sum of all question marks.`;
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
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 3000,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
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
    let rawText = anthropicData?.content?.[0]?.text ?? '';

    let worksheet;
    try {
      rawText = rawText.trim();
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      worksheet = JSON.parse(rawText);
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'AI response could not be parsed.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(worksheet), {
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
