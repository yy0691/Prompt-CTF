
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const { 
    LINUX_DO_CLIENT_ID, 
    LINUX_DO_CLIENT_SECRET, 
    SUPABASE_URL, 
    SUPABASE_SERVICE_KEY, 
    SUPABASE_JWT_SECRET,
    VERCEL_URL 
  } = process.env;

  // 1. Strict Env Check to prevent crashing with generic 500
  const missingVars = [];
  if (!LINUX_DO_CLIENT_ID) missingVars.push('LINUX_DO_CLIENT_ID');
  if (!LINUX_DO_CLIENT_SECRET) missingVars.push('LINUX_DO_CLIENT_SECRET');
  if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');

  if (missingVars.length > 0) {
    console.error(`Missing Environment Variables: ${missingVars.join(', ')}`);
    return res.status(500).json({ 
        error: 'Server Misconfiguration', 
        details: `Missing Environment Variables: ${missingVars.join(', ')}` 
    });
  }
  
  const REDIRECT_URI = `${VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:1234'}/api/linuxdo-callback`;
  const APP_URL = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:1234';

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // 2. Exchange Code for Access Token
    console.log(`Exchanging code for token with Redirect URI: ${REDIRECT_URI}`);
    const tokenRes = await axios.post('https://connect.linux.do/oauth2/token', {
      client_id: LINUX_DO_CLIENT_ID,
      client_secret: LINUX_DO_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new Error("No access token received from Linux.do");

    // 3. Fetch User Info from Linux.do
    const userRes = await axios.get('https://connect.linux.do/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const linuxUser = userRes.data; 

    // 4. Sync with Supabase
    // We use the SERVICE_KEY to bypass RLS and strictly write to our 'users' table
    // Safe assertion as we checked env vars above
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    const userId = `linuxdo_${linuxUser.id}`;
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        name: linuxUser.name || linuxUser.username || 'Linux.do User',
        email: linuxUser.email, 
        avatar: linuxUser.avatar_url,
        provider: 'linuxdo',
        last_flag_at: Date.now() 
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase Upsert Error:', upsertError);
      throw new Error(`Failed to sync user to DB: ${upsertError.message}`);
    }

    // 5. Create a Custom JWT for the Frontend
    const payload = {
      sub: userId,
      name: linuxUser.name || linuxUser.username,
      avatar: linuxUser.avatar_url,
      provider: 'linuxdo',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
    };

    // Use SUPABASE_JWT_SECRET to sign if available, otherwise fallback (Dev only)
    const secret = SUPABASE_JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod'; 
    const sessionToken = jwt.sign(payload, secret);

    // 6. Redirect back to App with Token
    res.redirect(`${APP_URL}?token=${sessionToken}`);

  } catch (error: any) {
    console.error('Linux.do Auth Error:', error.response?.data || error.message);
    // Return a visible error to the user via URL param
    const errorMsg = error.response?.data?.error_description || error.message || 'Unknown Error';
    res.redirect(`${APP_URL}?error=${encodeURIComponent(errorMsg)}`);
  }
}
