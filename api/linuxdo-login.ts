
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Force Node.js runtime (prevents Edge Runtime confusion)
export const config = {
  runtime: 'nodejs',
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const CLIENT_ID = process.env.LINUX_DO_CLIENT_ID;
    
    // Robust Base URL resolution:
    // 1. APP_URL env var (Manual override for production)
    // 2. Request Headers (Automatic detection for Vercel Previews/Localhost)
    let baseUrl = process.env.APP_URL;
    
    if (!baseUrl) {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const h = Array.isArray(host) ? host[0] : host;
        const p = Array.isArray(protocol) ? protocol[0] : protocol;
        baseUrl = `${p}://${h || 'localhost:1234'}`;
    }
    
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');

    if (!CLIENT_ID) {
      console.error("Configuration Error: LINUX_DO_CLIENT_ID is missing in process.env");
      return res.redirect(`${baseUrl}?error=${encodeURIComponent('Missing Server Config: LINUX_DO_CLIENT_ID')}`);
    }

    const REDIRECT_URI = `${baseUrl}/api/linuxdo-callback`;
    const state = Math.random().toString(36).substring(7); // Basic state to prevent some CSRF issues

    // Note: Linux.do (Discourse) supports standard OAuth2. 
    // scope=read is usually default.
    const authUrl = `https://connect.linux.do/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read&state=${state}`;

    res.redirect(authUrl);
  } catch (error: any) {
    console.error("Login Function Crash:", error);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}
