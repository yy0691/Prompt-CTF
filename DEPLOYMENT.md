
# 🚀 Deployment Guide: Prompt CTF

This guide covers how to deploy the **Prompt CTF** application to Vercel and configure the Supabase backend for real authentication and data persistence.

---

## 🛠️ Phase 1: Supabase Configuration

### 1. Create a Project
1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose your organization, name the project (e.g., `prompt-ctf`), and set a database password.
4. Select a region close to your users.
5. Wait for the project to provision.

### 2. Setup Database Tables
1. Go to the **SQL Editor** (sidebar icon).
2. Click **New Query**.
3. Paste the following SQL schema to create the necessary tables:

```sql
-- 1. Create Users Table
create table users (
  id text primary key,
  name text,
  email text,
  avatar text,
  provider text,
  total_flags int default 0,
  last_flag_at bigint
);

-- 2. Create Submissions Table
create table submissions (
  id text primary key,
  user_id text references users(id),
  level_id text not null,
  prompt text,
  output text,
  success boolean,
  feedback text,
  duration_ms int,
  timestamp bigint
);

-- 3. Enable RLS (Security)
alter table users enable row level security;
alter table submissions enable row level security;

-- 4. Create Basic Policies (Allow read/write for now)
create policy "Public Access Users" on users for all using (true);
create policy "Public Access Submissions" on submissions for all using (true);
```
4. Click **Run**.

### 3. Configure Authentication
Go to the **Authentication** tab in the Supabase sidebar.

**A. URL Configuration:**
1. Under **URL Configuration**, set the `Site URL` to your Vercel deployment URL (e.g., `https://your-app.vercel.app`).
2. If testing locally, add `http://localhost:5173` (or your local port) to **Redirect URLs**.

**B. Enable Providers:**
1. **Google:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project -> API & Services -> OAuth consent screen (External).
   - Credentials -> Create OAuth Client ID (Web Application).
   - **Authorized Redirect URI:** Paste the `Callback URL` found in Supabase Auth Settings (e.g., `https://<project-ref>.supabase.co/auth/v1/callback`).
   - Copy Client ID and Secret back to Supabase -> Providers -> Google.
   
2. **GitHub:**
   - Go to GitHub -> Settings -> Developer settings -> OAuth Apps.
   - New OAuth App.
   - **Authorization callback URL:** Paste the Supabase Callback URL.
   - Copy Client ID and Secret back to Supabase -> Providers -> GitHub.

3. **Email (Magic Link):**
   - Enabled by default.

4. **Linux.do (Advanced):**
   - Since Supabase does not have a native "Linux.do" provider, you must use **OIDC** if supported, or build a custom proxy.
   - If Linux.do supports standard OIDC, go to Providers -> OpenID Connect and configure the Issuer URL, Client ID, and Secret.

---

## ⚡ Phase 2: Vercel Deployment

### 1. Import Project
1. Go to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository containing this code.

### 2. Environment Variables
In the Vercel Project Settings, add the following Environment Variables:

| Variable Name | Description | Where to find it |
|:---|:---|:---|
| `API_KEY` | Google Gemini API Key | [Google AI Studio](https://aistudio.google.com/) |
| `SUPABASE_URL` | Supabase Project URL | Supabase -> Settings -> API |
| `SUPABASE_KEY` | Supabase Anon / Public Key | Supabase -> Settings -> API |

**Note:** Ensure `SUPABASE_KEY` is the **anon** key, NOT the `service_role` key.

### 3. Deploy
1. Click **Deploy**.
2. Vercel will build the project.
3. Once finished, visit your provided URL.

---

## ✅ Verification
1. Open the deployed app.
2. Click **Sign in with Google/GitHub/Email**.
3. You should be redirected to the provider and back to the app.
4. Solve a challenge.
5. Check the **Leaderboard** to ensure your score is saved.
6. Refresh the page; you should remain logged in.
