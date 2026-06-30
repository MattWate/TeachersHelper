import { neon } from '@neondatabase/serverless';

export async function handler() {
  if (!process.env.DATABASE_URL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        configured: false,
        message: 'DATABASE_URL is not set. Add the Neon pooled connection string in Netlify environment variables.',
      }),
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`select now() as now`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        configured: true,
        databaseTime: result[0]?.now,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        configured: true,
        message: 'Database connection failed.',
        error: error.message,
      }),
    };
  }
}
