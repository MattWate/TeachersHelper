import { createAuthClient } from '@neondatabase/neon-js/auth';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;

if (!authUrl) {
  console.warn('VITE_NEON_AUTH_URL is not configured. Neon Auth will not work until this is added to Netlify.');
}

export const authClient = createAuthClient(authUrl);
