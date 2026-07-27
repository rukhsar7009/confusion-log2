// POST /api/explain
// Body: { topic: string, course?: string, notes: string, triedStyles?: string[] }
// Returns: { style: string, explanation: string }
//
// This function calls the Google Gemini API (gemini-3.5-flash) using a
// system prompt written for this project. It picks the next explanation
// style the student hasn't seen yet for this exact confusion, and asks
// the model to explain their specific sticking point using only that style.

const STYLE_ORDER = ['Analogy', 'Plain English', 'Worked Example', 'Real-World Scenario', 'Socratic Questions'];

const SYSTEM_PROMPT = `You are a warm, patient tutor helping a student get past something that confused them in class. You always explain using exactly ONE approach per response, never mixing styles, and you always take their own words about what confused them seriously — address their specific sticking point, not just the topic in general.

The five explanation styles you can be asked to use are:
- Analogy: compare the concept to something familiar from everyday life that has nothing to do with the subject itself.
- Plain English: explain it as if the student is capable but has never heard any of the jargon; define every technical term the moment you use it.
- Worked Example: walk through one concrete example from start to finish, step by step.
- Real-World Scenario: show a specific situation where this concept actually shows up and matters.
- Socratic Questions: guide the student toward the answer with 3-4 short leading questions, then state the key insight plainly in the last line.

Rules you always follow:
1. Use only the ONE style you are told to use for this response.
2. Speak directly to their stated confusion, not a generic textbook definition.
3. Keep it 120-180 words.
4. Plain, spoken-sounding prose. No headers, no bullet points, no bold text, no markdown.
5. Be encouraging but never patronizing — never say things like "it's simple" or "just".
6. Output ONLY valid JSON in this exact shape and nothing else, no code fences, no preamble: {"style": "<style name>", "explanation": "<your explanation text>"}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { topic, course, notes, triedStyles } = req.body || {};

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    res.status(400).json({ error: 'Missing "topic".' });
    return;
  }
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    res.status(400).json({ error: 'Missing "notes".' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Set it in your Vercel project settings.' });
    return;
  }

  const tried = Array.isArray(triedStyles) ? triedStyles : [];
  const nextStyle = STYLE_ORDER.find(s => !tried.includes(s)) || STYLE_ORDER[tried.length % STYLE_ORDER.length];

  const userPrompt = `Topic: ${topic}
Course: ${course && course.trim() ? course : 'not specified'}
What specifically confuses them (in their own words): ${notes}
Styles already tried for this exact topic (do not reuse their approach): ${tried.length ? tried.join(', ') : 'none yet'}
Style to use for THIS response: ${nextStyle}

Write the explanation now, using only the "${nextStyle}" style, following all the rules. Respond with only this JSON: {"style": "${nextStyle}", "explanation": "..."}`;

  try {
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5 flash lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {  maxOutputTokens: 500 }
        })
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Gemini API error:', upstream.status, errText);
      res.status(502).json({ error: 'The AI service returned an error. Please try again.' });
      return;
    }

    const data = await upstream.json();
    const raw = (data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';

    const cleaned = raw.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      parsed = { style: nextStyle, explanation: cleaned || 'The AI tutor gave an empty response — try again.' };
    }

    if (!parsed.explanation) {
      parsed.explanation = 'The AI tutor gave an empty response — try again.';
    }
    if (!parsed.style) {
      parsed.style = nextStyle;
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Something went wrong talking to the AI service.' });
  }
};
