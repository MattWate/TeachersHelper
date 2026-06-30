# Teacher's Little Helper

## Product summary

Teacher's Little Helper is a mobile-first classroom observation and report-writing assistant for teachers.

The product helps teachers capture quick learner observations throughout the term, then uses those observations, uploaded marks, report structures, and optional previous report examples to draft thoughtful, personalised learner reports.

This is not positioned as a generic AI report generator. It is a classroom memory tool that helps teachers remember meaningful learner moments and turn them into better reports.

## Core product promise

Capture small classroom moments as they happen, then turn them into thoughtful, personalised report drafts when report season arrives.

## Target user

The initial target user is an individual primary or junior school teacher managing one active class of up to 40 learners.

Future users may include subject teachers, tutor centres, phase heads, and schools.

## Launch pricing assumption

Single simple plan:

- R89/month
- 1 active class
- Up to 40 learners
- 100 voice observations per week
- 20 seconds maximum per voice observation
- Unlimited typed observations
- AI tagging and summaries
- Marks upload
- Report drafting and refinements
- Word export

## Core MVP workflows

### 1. Class setup

Teachers can:

- create an account
- create one active class
- add learners manually
- later upload class lists from CSV/XLSX

Each learner should have:

- full name
- preferred name
- class reference
- optional pronoun/gender field for report wording
- observation history
- report draft history

### 2. Observation capture

Teachers can capture learner observations as typed notes or voice notes.

The fastest mobile flow should be:

Open app → select class → select learner → record or type observation → save.

Voice note rules:

- 20-second maximum duration
- 100 voice notes per week
- transcript is generated after recording
- raw audio should not be stored long term unless explicitly required
- transcript, cleaned text, tags and summary should be stored

Observation records should include:

- learner ID
- class ID
- teacher/user ID
- date/time
- observation type: typed or voice
- original text or transcript
- cleaned text
- AI summary
- category
- subject/learning area
- sentiment/type
- importance
- used in report: true/false

Suggested categories:

- Reading
- Writing
- Spelling
- Maths
- Number concepts
- Problem-solving
- Confidence
- Participation
- Independence
- Behaviour
- Focus
- Effort
- Social development
- Friendship
- Leadership
- Improvement
- Concern
- Parent follow-up

### 3. Report generation

At report time, teachers can:

- upload marks
- confirm extracted learner/marks data
- define report structure
- optionally upload previous reports for style guidance
- generate editable report drafts
- refine drafts
- export to Word

Report structure fields:

- number of sections
- section names
- minimum length per section
- maximum length per section
- tone
- person/voice
- include next steps: yes/no
- include marks directly: yes/no
- include pastoral/social comments: yes/no

The system should use:

- uploaded marks
- stored learner observations
- teacher-provided personal details
- report structure
- style guide
- safe wording rules

The teacher must always review and approve final reports.

## AI behaviour principles

The AI should:

- sound human, warm and professional
- avoid generic AI-style phrasing
- avoid unsupported claims
- avoid diagnosis language
- use observations as evidence
- vary wording across learners
- flag sensitive wording
- ask for more personal detail when useful
- keep the teacher in control

Avoid overusing phrases like:

- continues to demonstrate
- commendable progress
- it is evident that
- furthermore
- plays a vital role
- pleasing progress, if repeated too often

If a teacher writes something sensitive, such as "I think Sarah has ADHD", the tool should not include that directly in a report. It should suggest safer wording, such as:

"Sarah sometimes finds it difficult to maintain focus during longer tasks and benefits from gentle reminders to stay on track."

## Technical direction

The preferred architecture is:

- Expo / React Native for the mobile app
- React + Vite + Tailwind for the web dashboard
- Netlify for hosting and serverless functions
- Neon Postgres for the database
- Neon Auth if enabled for authentication
- pgvector support later for semantic retrieval
- Cloudflare R2 or similar for file/audio storage if needed
- Gemini API for AI processing
- Google Speech-to-Text or Gemini audio for transcription

No secret API keys should ever be exposed in the mobile app or frontend browser code.

All AI, transcription, embedding and database write operations that require secrets should go through server-side functions.

## Database direction

Use Postgres-friendly relational modelling.

Likely core tables:

- users/profiles
- schools
- classes
- learners
- observations
- observation_embeddings
- voice_usage
- mark_uploads
- report_structures
- style_guides
- report_drafts
- report_sections
- subscriptions

Vector support may be added later using pgvector for:

- retrieving relevant observations for report sections
- style matching from old reports
- repetition detection
- semantic learner history search
- parent update drafting

## Privacy and safety principles

This product stores learner data, so privacy matters from day one.

Rules:

- teacher data must be isolated by user/account
- learner data must never be public
- raw audio should be deleted after transcription unless explicitly retained
- generated reports must not be sent directly to parents in the MVP
- the teacher must approve all final wording
- all uploaded files should be private
- users should be able to delete learner data
- avoid storing unnecessary sensitive data

## Development style

Build in small, working increments.

Prioritise:

1. Working auth
2. Class and learner setup
3. Fast observation capture
4. Voice note capture and transcription
5. Observation tagging and storage
6. Report setup
7. Report draft generation
8. Export

Do not overbuild integrations at the start.

Initial MVP should avoid deep Google Classroom or LMS integrations. Start with manual setup and CSV/XLSX upload. Add integrations only when they reduce friction or support paid school deals.

## Naming

Working product name:

Teacher's Little Helper

Repo name suggestion:

teachers-little-helper

Alternative shorter internal name:

teachers-helper
