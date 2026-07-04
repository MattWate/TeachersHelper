import { neon } from '@neondatabase/serverless';
import { neon } from '@neondatabase/serverless';
import { GoogleGenAI, Type } from '@google/genai';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

function requireDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. Add your Neon pooled connection string in Netlify.');
  }

  return neon(process.env.DATABASE_URL);
}

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getWeekStartDate(date = new Date()) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

async function classifyObservation(text = '') {
  try {
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING },
        sentiment: { type: Type.STRING },
        aiSummary: { type: Type.STRING }
      },
      required: ["category", "sentiment", "aiSummary"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this classroom observation and extract the core category, sentiment (Observation/Improvement/Development area/Positive/Concern), and a short summary (under 180 chars). Observation: "${text}"`,
      config: { responseMimeType: 'application/json', responseSchema }
    });

    const data = JSON.parse(response.text);
    return {
      category: data.category || 'General',
      sentiment: data.sentiment || 'Observation',
      summary: data.aiSummary || text.slice(0, 180)
    };
  } catch (err) {
    console.error('Gemini classification failed, falling back to defaults', err);
    return { category: 'General', sentiment: 'Observation', summary: text.slice(0, 180) };
  }
}

function generateLearnerReport({ learner, observations, reportStructure }) {
  const learnerNotes = observations.filter((observation) => observation.learner_id === learner.id || observation.learnerId === learner.id);
  const notesText = learnerNotes.map((observation) => observation.cleaned_text || observation.original_text || observation.text || '').join(' ');

  const hasReading = /read|reading|book|fluency/i.test(notesText);
  const hasMaths = /math|number|times table|calculation|multiply|multiplication/i.test(notesText);
  const hasSocial = /friend|helped|kind|group|settle/i.test(notesText);
  const hasFocus = /focus|concentration|distract/i.test(notesText);

  const preferredName = learner.preferred_name || learner.preferredName || learner.full_name || learner.fullName;
  const sections = reportStructure.sections || reportStructure.sections_json || [];

  const sectionDrafts = sections.map((section) => {
    const sectionName = String(section.name || '').toLowerCase();

    if (sectionName.includes('english') || sectionName.includes('reading') || sectionName.includes('language')) {
      return {
        sectionName: section.name,
        text: hasReading
          ? `${preferredName} has shown encouraging progress in reading this term. The classroom observations point to growing confidence and a greater willingness to engage with texts, especially when reading aloud. Continued regular reading practice will help ${preferredName} build fluency and strengthen comprehension further.`
          : `${preferredName} is continuing to develop important language skills. A few more specific observations about reading, writing, spelling or comprehension would help make this section warmer and more personal.`,
      };
    }

    if (sectionName.includes('math')) {
      return {
        sectionName: section.name,
        text: hasMaths
          ? `${preferredName} is developing confidence in Maths and benefits from regular practice with key number facts. The observations highlight an area to keep strengthening, especially around multiplication recall and accuracy. Short, consistent practice will support quicker and more confident work.`
          : `${preferredName} is working steadily in Maths. Adding observations about number work, calculations or problem-solving would help produce a more specific and balanced comment.`,
      };
    }

    const strengths = [];
    if (hasSocial) strengths.push('positive social awareness');
    if (hasFocus) strengths.push('a need for gentle support with focus during longer tasks');
    if (learnerNotes.length > 0 && strengths.length === 0) strengths.push('steady classroom engagement');

    return {
      sectionName: section.name,
      text: `${preferredName} is a valued member of the class. ${strengths.length ? `The observations from this term point to ${strengths.join(' and ')}.` : 'A few personal observations would help make this general comment warmer and more specific.'} With continued encouragement, ${preferredName} can keep building confidence and independence next term.`,
    };
  });

  const questions = [];
  if (learnerNotes.length < 2) questions.push(`What is one thing you want to highlight about ${preferredName} this term?`);
  if (!hasSocial) questions.push(`Is there anything worth mentioning about ${preferredName}'s friendships, confidence or classroom contribution?`);
  if (!hasMaths) questions.push(`Is there a specific Maths goal ${preferredName} should focus on next term?`);

  return {
    learnerId: learner.id,
    learnerName: learner.full_name || learner.fullName,
    sections: sectionDrafts,
    questions: questions.slice(0, 3),
  };
}

async function getProfile(sql, email, fullName) {
  const cleanEmail = normaliseEmail(email);

  if (!cleanEmail) {
    throw new Error('Email is required.');
  }

  const rows = await sql`
    insert into profiles (email, full_name, subscription_status)
    values (${cleanEmail}, ${fullName || cleanEmail}, 'tester')
    on conflict (email)
    do update set
      full_name = coalesce(nullif(${fullName || ''}, ''), profiles.full_name),
      updated_at = now()
    returning *
  `;

  return rows[0];
}

async function loadDashboard(sql, profileId) {
  const weekStart = getWeekStartDate();

  const [classes, learners, observations, reportStructures, usageRows] = await Promise.all([
    sql`select * from classes where profile_id = ${profileId} order by created_at asc`,
    sql`
      select learners.*
      from learners
      join classes on classes.id = learners.class_id
      where classes.profile_id = ${profileId}
      order by learners.full_name asc
    `,
    sql`select * from observations where profile_id = ${profileId} order by created_at desc limit 500`,
    sql`select * from report_structures where profile_id = ${profileId} order by created_at desc`,
    sql`select * from voice_usage where profile_id = ${profileId} and week_start_date = ${weekStart}`,
  ]);

  const usage = usageRows[0] || {
    week_start_date: weekStart,
    voice_note_count: 0,
    seconds_used: 0,
  };

  return {
    classes,
    learners,
    observations,
    reportStructures,
    usage,
  };
}

async function bootstrap(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);
  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function createClass(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);
  const rows = await sql`
    insert into classes (profile_id, name, grade, academic_year, term)
    values (${profile.id}, ${payload.name}, ${payload.grade || null}, ${payload.academicYear || new Date().getFullYear().toString()}, ${payload.term || null})
    returning *
  `;

  await sql`
    insert into report_structures (profile_id, class_id, name, tone, sections_json)
    values (
      ${profile.id},
      ${rows[0].id},
      'Default report structure',
      'Warm, specific and professional',
      ${JSON.stringify([
        { id: 'english', name: 'English', minWords: 60, maxWords: 90 },
        { id: 'maths', name: 'Maths', minWords: 60, maxWords: 90 },
        { id: 'general', name: 'General Comment', minWords: 80, maxWords: 120 },
      ])}::jsonb
    )
  `;

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function createLearner(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.classId || !payload.learnerName) {
    throw new Error('classId and learnerName are required.');
  }

  const classRows = await sql`select * from classes where id = ${payload.classId} and profile_id = ${profile.id}`;
  if (!classRows[0]) throw new Error('Class not found for this teacher.');

  await sql`
    insert into learners (class_id, full_name, preferred_name, pronouns)
    values (${payload.classId}, ${payload.learnerName}, ${payload.preferredName || payload.learnerName}, ${payload.pronouns || null})
  `;

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function addObservation(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  if (!payload.classId || !payload.learnerId || !payload.text) {
    throw new Error('classId, learnerId and text are required.');
  }

  const observationType = payload.observationType === 'voice' ? 'voice' : 'typed';
  const weekStart = getWeekStartDate();

  if (observationType === 'voice') {
    const usageRows = await sql`
      insert into voice_usage (profile_id, week_start_date, voice_note_count, seconds_used)
      values (${profile.id}, ${weekStart}, 0, 0)
      on conflict (profile_id, week_start_date)
      do update set profile_id = excluded.profile_id
      returning *
    `;

    if ((usageRows[0]?.voice_note_count || 0) >= 100) {
      throw new Error('Weekly voice observation limit reached. Typed notes are still unlimited.');
    }
  }

  const classification = await classifyObservation(payload.text);

  await sql`
    insert into observations (
      profile_id,
      class_id,
      learner_id,
      observation_type,
      original_text,
      cleaned_text,
      ai_summary,
      category,
      subject,
      sentiment,
      importance
    ) values (
      ${profile.id},
      ${payload.classId},
      ${payload.learnerId},
      ${observationType},
      ${payload.text},
      ${payload.text.trim()},
      ${classification.summary},
      ${classification.category},
      ${payload.subject || classification.category},
      ${classification.sentiment},
      ${payload.importance || 'normal'}
    )
  `;

  if (observationType === 'voice') {
    await sql`
      update voice_usage
      set voice_note_count = voice_note_count + 1,
          seconds_used = seconds_used + ${Math.min(Number(payload.durationSeconds || 20), 20)}
      where profile_id = ${profile.id} and week_start_date = ${weekStart}
    `;
  }

  const dashboard = await loadDashboard(sql, profile.id);
  return { profile, ...dashboard };
}

async function generateReport(sql, payload) {
  const profile = await getProfile(sql, payload.email, payload.fullName);

  const learnerRows = await sql`
    select learners.*
    from learners
    join classes on classes.id = learners.class_id
    where learners.id = ${payload.learnerId} and classes.profile_id = ${profile.id}
  `;

  if (!learnerRows[0]) throw new Error('Learner not found for this teacher.');

  const observationRows = await sql`
    select * from observations
    where profile_id = ${profile.id} and learner_id = ${payload.learnerId}
    order by created_at desc
  `;

  const structureRows = await sql`
    select * from report_structures
    where profile_id = ${profile.id} and (class_id = ${learnerRows[0].class_id} or class_id is null)
    order by class_id nulls last, created_at desc
    limit 1
  `;

  const reportStructure = structureRows[0]
    ? { sections: structureRows[0].sections_json, tone: structureRows[0].tone }
    : {
        tone: 'Warm, specific and professional',
        sections: [
          { id: 'english', name: 'English', minWords: 60, maxWords: 90 },
          { id: 'maths', name: 'Maths', minWords: 60, maxWords: 90 },
          { id: 'general', name: 'General Comment', minWords: 80, maxWords: 120 },
        ],
      };

  const draft = generateLearnerReport({
    learner: learnerRows[0],
    observations: observationRows,
    reportStructure,
  });

  await sql`
    insert into report_drafts (profile_id, class_id, learner_id, report_structure_id, draft_json, final_text, status)
    values (
      ${profile.id},
      ${learnerRows[0].class_id},
      ${learnerRows[0].id},
      ${structureRows[0]?.id || null},
      ${JSON.stringify(draft)}::jsonb,
      ${draft.sections.map((section) => `${section.sectionName}\n${section.text}`).join('\n\n')},
      'draft'
    )
  `;

  return { draft };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const sql = requireDatabase();
    const payload = JSON.parse(event.body || '{}');
    const action = payload.action;

    if (action === 'bootstrap') return json(200, await bootstrap(sql, payload));
    if (action === 'createClass') return json(200, await createClass(sql, payload));
    if (action === 'createLearner') return json(200, await createLearner(sql, payload));
    if (action === 'addObservation') return json(200, await addObservation(sql, payload));
    if (action === 'generateReport') return json(200, await generateReport(sql, payload));

    return json(400, { error: `Unknown action: ${action}` });
  } catch (error) {
    return json(500, { error: error.message });
  }
}
