
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Force Node.js runtime
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Determine Base URL safely
  const host = process.env.VERCEL_URL || 'localhost:1234';
  const protocol = process.env.VERCEL_URL ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  try {
    const code = req.query.code as string;
    const { 
      LINUX_DO_CLIENT_ID, 
      LINUX_DO_CLIENT_SECRET, 
      SUPABASE_URL, 
      SUPABASE_SERVICE_KEY, 
      SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET
    } = process.env;

    // 1. Resolve Service Key
    const serviceKey = SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_ROLE_KEY;

    // 2. Strict Env Check
    const missingVars = [];
    if (!LINUX_DO_CLIENT_ID) missingVars.push('LINUX_DO_CLIENT_ID');
    if (!LINUX_DO_CLIENT_SECRET) missingVars.push('LINUX_DO_CLIENT_SECRET');
    if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!serviceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingVars.length > 0) {
      throw new Error(`Server Config Error: Missing ${missingVars.join(', ')}`);
    }

    if (!code) {
      throw new Error('No authorization code provided from Linux.do');
    }

    const REDIRECT_URI = `${baseUrl}/api/linuxdo-callback`;

    // 3. Exchange Code for Access Token using native fetch (No Axios)
    console.log(`[Linux.do Auth] Exchanging code...`);
    const tokenParams = new URLSearchParams({
      client_id: LINUX_DO_CLIENT_ID!,
      client_secret: LINUX_DO_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const tokenRes = await fetch('https://connect.linux.do/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Linux.do Token Error]', errText);
      throw new Error(`Token Exchange Failed: ${tokenRes.status} ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("No access token received.");

    // 4. Fetch User Info
    console.log(`[Linux.do Auth] Fetching user info...`);
    const userRes = await fetch('https://connect.linux.do/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userRes.ok) {
      throw new Error(`User Info Fetch Failed: ${userRes.status}`);
    }

    const linuxUser = await userRes.json();
    if (!linuxUser || !linuxUser.id) {
        throw new Error("Invalid user data received.");
    }

    // 5. Sync with Supabase (Use Service Key to bypass RLS)
    const supabaseAdmin = createClient(SUPABASE_URL!, serviceKey!);
    const userId = `linuxdo_${linuxUser.id}`;
    
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        name: linuxUser.name || linuxUser.username || `User ${linuxUser.id}`,
        email: linuxUser.email, 
        avatar: linuxUser.avatar_url,
        provider: 'linuxdo',
        last_flag_at: Date.now() 
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase Upsert Error:', upsertError);
      throw new Error(`Database Sync Failed: ${upsertError.message}`);
    }

    // 6. Create Frontend JWT
    const payload = {
      sub: userId,
      name: linuxUser.name || linuxUser.username || `User ${linuxUser.id}`,
      avatar: linuxUser.avatar_url,
      provider: 'linuxdo',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
    };

    const secret = SUPABASE_JWT_SECRET || 'default-fallback-secret'; 
    const sessionToken = jwt.sign(payload, secret);

    // 7. Redirect back to App
    res.redirect(`${baseUrl}?token=${sessionToken}`);

  } catch (error: any) {
    console.error('[Linux.do Callback Crash]', error);
    const errorMsg = error.message || "Unknown Server Error";
    // Redirect to frontend with error
    res.redirect(`${baseUrl}?error=${encodeURIComponent(errorMsg)}`);
  }
}
