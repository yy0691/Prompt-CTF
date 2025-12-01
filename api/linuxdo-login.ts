
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const CLIENT_ID = process.env.LINUX_DO_CLIENT_ID;
  
  // Use VERCEL_URL if available (production), otherwise localhost. 
  // IMPORTANT: VERCEL_URL does not include 'https://' prefix.
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:1234';

  const REDIRECT_URI = `${baseUrl}/api/linuxdo-callback`;
  
  if (!CLIENT_ID) {
    return res.status(500).json({ error: 'Missing Linux.do Client ID configuration' });
  }

  // Linux.do (Connect) OAuth Authorization URL
  const authUrl = `https://connect.linux.do/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read`;

  res.redirect(authUrl);
}
