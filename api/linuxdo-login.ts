
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Force Node.js runtime (prevents Edge Runtime confusion)
export const config = {
  runtime: 'nodejs',
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const CLIENT_ID = process.env.LINUX_DO_CLIENT_ID;
    
    // Determine Base URL safely
    const host = process.env.VERCEL_URL || 'localhost:1234';
    const protocol = process.env.VERCEL_URL ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    if (!CLIENT_ID) {
      console.error("Configuration Error: LINUX_DO_CLIENT_ID is missing in process.env");
      // Redirect to frontend with error message
      return res.redirect(`${baseUrl}?error=${encodeURIComponent('Missing Server Config: LINUX_DO_CLIENT_ID')}`);
    }

    const REDIRECT_URI = `${baseUrl}/api/linuxdo-callback`;
    const authUrl = `https://connect.linux.do/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read`;

    res.redirect(authUrl);
  } catch (error: any) {
    console.error("Login Function Crash:", error);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}
