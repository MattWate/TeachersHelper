import { neon } from '@neondatabase/serverless';

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return reply(500, { error: 'Database is not configured.' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email || !payload.learnerId) return reply(400, { error: 'Email and learnerId are required.' });

    const sql = neon(process.env.DATABASE_URL);
    const profiles = await sql`select id from profiles where email = ${email} limit 1`;
    if (!profiles[0]) return reply(404, { error: 'Profile not found.' });

    await sql`
      update learners
      set active = false, updated_at = now()
      where id = ${payload.learnerId}
      and class_id in (select id from classes where profile_id = ${profiles[0].id})
    `;

    return reply(200, { ok: true });
  } catch (error) {
    return reply(500, { error: error.message });
  }
}
