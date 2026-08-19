// Backend API origin. Set VITE_API_URL in the frontend's environment (e.g. a
// Vercel/Netlify project setting) to point at the deployed backend. Falls
// back to the local dev server so nothing changes for local development.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:2001';
