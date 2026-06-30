export async function handler() {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      service: 'teachers-helper',
      timestamp: new Date().toISOString(),
    }),
  };
}
