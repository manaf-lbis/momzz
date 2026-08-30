/**
 * Resolves the backend server base URL from environment variables across Vite/Vercel.
 * Supports VITE_SERVER_URL, VITE_API_URL, and VITE_BACKEND_URL.
 */
export const getBaseServerUrl = (): string => {
  const envUrl =
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  // Detect when running on a live domain (like Vercel preview or production) without configured env variable
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    console.warn(
      `[CONFIG WARNING] Backend URL is not configured (VITE_SERVER_URL is missing in Vercel Environment Variables). Requests are falling back to http://localhost:5000.`
    );
  }

  return 'http://localhost:5000';
};
