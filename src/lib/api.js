const SESSION_STORAGE_KEY = 'teachers-helper-session';

export function loadSession() {
  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    console.warn('Could not load saved session', error);
    return null;
  }
}

export function saveSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function apiRequest(action, payload = {}) {
  const response = await fetch('/.netlify/functions/app-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}
