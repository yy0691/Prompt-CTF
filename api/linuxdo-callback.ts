import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string;
  const { LINUX_DO_CLIENT_ID, LINUX_DO_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET } = process.env;
  
  const REDIRECT_URI = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:1234'}/api/linuxdo-callback`;
  const APP_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:1234';

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // 1. Exchange Code for Access Token
    const tokenRes = await axios.post('https://connect.linux.do/oauth2/token', {
      client_id: LINUX_DO_CLIENT_ID,
      client_secret: LINUX_DO_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const accessToken = tokenRes.data.access_token;

    // 2. Fetch User Info from Linux.do
    const userRes = await axios.get('https://connect.linux.do/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const linuxUser = userRes.data; // Assuming structure { id, username, avatar_url, email ... }

    // 3. Sync with Supabase
    // We use the SERVICE_KEY to bypass RLS and strictly write to our 'users' table
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Upsert into our custom public 'users' table
    const userId = `linuxdo_${linuxUser.id}`;
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        name: linuxUser.name || linuxUser.username || 'Linux.do User',
        email: linuxUser.email, // Note: Linux.do might not always expose email depending on scope
        avatar: linuxUser.avatar_url,
        provider: 'linuxdo',
        last_flag_at: Date.now() // Update activity
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase Upsert Error:', upsertError);
      throw new Error('Failed to sync user');
    }

    // 4. Create a Custom JWT for the Frontend
    // This allows the frontend to assume the identity of this user securely
    // We sign it with Supabase's JWT Secret so Supabase RLS policies (if any) could strictly verify it,
    // OR we just verify it in our App logic.
    const payload = {
      sub: userId,
      name: linuxUser.name || linuxUser.username,
      avatar: linuxUser.avatar_url,
      provider: 'linuxdo',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
    };

    // Use SUPABASE_JWT_SECRET (from Supabase Project Settings -> API) to sign
    // If unavailable, use a random secret for local dev, but RLS won't work on DB side.
    const secret = SUPABASE_JWT_SECRET || 'fallback-dev-secret'; 
    const sessionToken = jwt.sign(payload, secret);

    // 5. Redirect back to App with Token
    res.redirect(`${APP_URL}?token=${sessionToken}`);

  } catch (error: any) {
    console.error('Linux.do Auth Error:', error.response?.data || error.message);
    res.redirect(`${APP_URL}?error=auth_failed`);
  }
}