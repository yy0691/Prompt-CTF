
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
    SUPABASE_SERVICE_ROLE_KEY, // Matches user's screenshot
    SUPABASE_JWT_SECRET,
    VERCEL_URL 
  } = process.env;

  // 1. Resolve the Service Key (Support both naming conventions)
  const serviceKey = SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_ROLE_KEY;

  // 2. Strict Env Check
  const missingVars = [];
  if (!LINUX_DO_CLIENT_ID) missingVars.push('LINUX_DO_CLIENT_ID');
  if (!LINUX_DO_CLIENT_SECRET) missingVars.push('LINUX_DO_CLIENT_SECRET');
  if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
  if (!serviceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');

  if (missingVars.length > 0) {
    const errorMsg = `Server Misconfiguration: Missing ${missingVars.join(', ')}`;
    console.error(errorMsg);
    // Return JSON error instead of crashing, though Vercel might show 500 page if headers issue
    return res.status(500).json({ error: errorMsg });
  }
  
  // Construct URL consistent with login.ts
  const baseUrl = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:1234';
  const REDIRECT_URI = `${baseUrl}/api/linuxdo-callback`;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    // 3. Exchange Code for Access Token
    console.log(`[Linux.do Auth] Exchanging code...`);
    const tokenRes = await axios.post('https://connect.linux.do/oauth2/token', {
      client_id: LINUX_DO_CLIENT_ID,
      client_secret: LINUX_DO_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new Error("No access token received from Linux.do");

    // 4. Fetch User Info
    console.log(`[Linux.do Auth] Fetching user info...`);
    const userRes = await axios.get('https://connect.linux.do/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const linuxUser = userRes.data; 

    // 5. Sync with Supabase (Use Service Key to bypass RLS)
    const supabaseAdmin = createClient(SUPABASE_URL!, serviceKey!);

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

    // 6. Create Frontend JWT
    const payload = {
      sub: userId,
      name: linuxUser.name || linuxUser.username,
      avatar: linuxUser.avatar_url,
      provider: 'linuxdo',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
    };

    const secret = SUPABASE_JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod'; 
    const sessionToken = jwt.sign(payload, secret);

    // 7. Redirect back to App
    res.redirect(`${baseUrl}?token=${sessionToken}`);

  } catch (error: any) {
    // Enhanced Error Logging for Axios
    if (error.response) {
        console.error('[Linux.do API Error]', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('[Auth Error]', error.message);
    }
    
    const errorMsg = error.response?.data?.error_description || error.message || 'Unknown Auth Error';
    res.redirect(`${baseUrl}?error=${encodeURIComponent(errorMsg)}`);
  }
}
