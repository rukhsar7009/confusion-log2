# Confusion Log

Log the things that confused you in class. Come back later and get them explained a completely different way — every single time.

## a. What it does, and the problem it solves

When you're studying, you inevitably hit concepts that don't click the first time. The usual fix — reread your notes, or ask an AI chatbot the same question again — often fails for a simple reason: **you get roughly the same explanation back**, phrased the same way that already didn't work for you. There's also no easy way to track *which* specific things confused you across a whole course, so by exam time half of them are forgotten again.

**Confusion Log** is a personal log for exactly this. You write down a concept and, in your own words, what specifically about it didn't make sense. Each time you come back and hit **"Explain it differently,"** the app's AI tutor is instructed to use a *different explanation style than every style it has already used for that entry* — analogy, plain English, a worked example, a real-world scenario, or Socratic questioning — until one of them clicks. You mark the entry resolved, and it moves out of your "still foggy" list.

**Who it's for:** students (originally built for my own coursework) who want a lightweight, judgment-free place to collect their confusions during a term and grind through them differently instead of re-reading the same explanation that already failed once.

## b. Live URL

🔗 **[REPLACE WITH YOUR DEPLOYED VERCEL URL]**

## c. Features

- Log a confusion: concept name, optional course/subject tag, and your own description of what specifically didn't make sense
- **"Explain it differently"** — AI-generated explanation that deliberately avoids every style already used for that entry
- Full explanation history per entry, newest first, so you can see every angle you've already tried
- Mark an entry **"clicked"** (resolved) or reopen it later if it gets confusing again
- Filter your log by **All / Still foggy / Clicked**, and by course/subject
- Live stats bar (how many are still foggy vs. clicked)
- Delete entries you no longer need
- All data is saved locally in your browser (`localStorage`) — no account, no login, nothing leaves your machine except the specific text you send when you ask for a new explanation
- Fully responsive, keyboard-accessible, and respects `prefers-reduced-motion`

## d. The AI feature

**What it does:** when you click "Explain it differently" on an entry, the app sends the topic, your course tag, your own confusion notes, and the list of explanation styles already used for that entry to a serverless API route (`/api/explain`). That route calls the Google Gemini API with a system prompt that forces the model to:

1. Use exactly one explanation style — the next one in rotation that hasn't been used yet for this entry
2. Respond to the student's *specific* stated confusion, not a generic definition
3. Stay within 120–180 words, plain spoken prose, no headers or markdown
4. Return strictly formatted JSON so the app can render it reliably

**The exact system prompt** (`api/explain.js`), written for this project:

```
You are a warm, patient tutor helping a student get past something that confused them in class. You always explain using exactly ONE approach per response, never mixing styles, and you always take their own words about what confused them seriously — address their specific sticking point, not just the topic in general.

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
6. Output ONLY valid JSON in this exact shape and nothing else, no code fences, no preamble: {"style": "<style name>", "explanation": "<your explanation text>"}
```

The style to use for each request is chosen server-side (`api/explain.js`) by walking through a fixed rotation — Analogy → Plain English → Worked Example → Real-World Scenario → Socratic Questions — and picking the first one not yet used for that entry, so the model is never even given the option to repeat itself.

## e. Tools, services, and models used

- **Frontend:** plain HTML, CSS, and vanilla JavaScript — no framework, no build step
- **Backend:** a single Vercel serverless function (Node.js) at `api/explain.js`
- **AI model:** Google **Gemini 2.5 Flash** via the Gemini API (`generateContent`), called directly with `fetch` — no SDK dependency
- **Storage:** browser `localStorage` (no database)
- **Hosting/deployment:** Vercel
- **Version control:** GitHub
- **Built with help from:** Claude (Anthropic), used as a coding assistant while building and documenting this project

## f. Screenshots

_Add at least 3 screenshots below once your app is running (locally or live). See "How to run" for exactly how to capture them._

1. **The main log view** — `[ADD SCREENSHOT: screenshots/01-log-view.png]`
2. **Adding a new confusion** — `[ADD SCREENSHOT: screenshots/02-add-entry.png]`
3. **An entry with AI explanations, including "Explain it differently" in action** — `[ADD SCREENSHOT: screenshots/03-explanations.png]`

Markdown to embed them once added, e.g.:
```markdown
![Log view](screenshots/01-log-view.png)
```

## g. How to run this project

### Run it locally (no account needed to just look at the UI)

This is a static site with one serverless function, so you don't need Node installed to preview the front end:

1. Download or clone this repo
2. Open `index.html` directly in your browser

The page will load and you can add/browse entries, but the **"Explain it differently"** button won't work yet — it needs the serverless function, which only runs on Vercel (or via the Vercel CLI, below).

### Run it fully, with the AI feature working (via Vercel CLI)

1. Get a free Gemini API key (no credit card required) at **https://aistudio.google.com/apikey**
2. Install the Vercel CLI: `npm install -g vercel`
3. From the project folder, run `vercel dev`
4. When prompted, set the environment variable `GEMINI_API_KEY` to your key (or create a `.env` file locally based on `.env.example`)
5. Open the local URL it gives you (typically `http://localhost:3000`)

### Deploy your own copy

1. Push this repo to your own GitHub account
2. Go to **vercel.com**, sign in with GitHub, and "Import" this repository
3. In the project's **Settings → Environment Variables**, add `GEMINI_API_KEY` with your key from Google AI Studio
4. Deploy — Vercel automatically serves the static files and the `/api/explain` function, no build configuration needed

---

Built as an individual final project. Original idea, code, and AI prompt design by **[YOUR NAME]**.
