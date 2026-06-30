# Teacher's Little Helper

A classroom observation and report-writing assistant for teachers.

This POC tests the core product loop:

1. Select a learner
2. Capture a typed or voice-style observation
3. Auto-tag the observation
4. Build a learner memory over time
5. Generate report-style draft sections from stored observations

## Current POC status

This is a web POC built with:

- React
- Vite
- Netlify Functions
- Neon Postgres schema prepared in `db/schema.sql`

The POC currently uses browser localStorage for demo data so the workflow can be tested before connecting live auth and database writes.

## Local setup

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Netlify setup

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```

Functions directory:

```bash
netlify/functions
```

## Environment variables

Create these in Netlify when needed:

```bash
DATABASE_URL=your_neon_pooled_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

Do not expose these in the frontend or mobile app.

## Neon setup

Run `db/schema.sql` in the Neon SQL editor to create the initial tables.

## POC caveats

- Voice notes are currently mocked with pasted transcript text.
- Real voice recording belongs in the Expo mobile app.
- AI tagging is currently rule-based for POC speed.
- Report generation is mocked locally to validate UX before adding Gemini.
- Authentication is not wired into the UI yet.

## Product constraints being tested

- R89/month single plan
- 1 active class
- 40 learners
- 100 voice observations per week
- 20 seconds per voice observation
- Unlimited typed observations
