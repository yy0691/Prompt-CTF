
# 🚀 Deployment Guide: Prompt CTF

This guide covers how to deploy the **Prompt CTF** application to Vercel and configure the Supabase backend for real authentication and data persistence.

---

## ⚡ Phase 1: Vercel Deployment

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
| `LINUX_DO_CLIENT_ID` | Linux.do Connect Client ID | [Linux.do Connect](https://connect.linux.do/) |
| `LINUX_DO_CLIENT_SECRET` | Linux.do Connect Client Secret | [Linux.do Connect](https://connect.linux.do/) |
| `SUPABASE_SERVICE_KEY` | Service Role Key (for backend syncing) | Supabase -> Settings -> API (Secret!) |
| `SUPABASE_JWT_SECRET` | JWT Secret (for signing tokens) | Supabase -> Settings -> API -> JWT Settings |

**⚠️ CRITICAL:** After adding or changing these variables, you MUST go to the "Deployments" tab and click **Redeploy**. React apps bake these variables in at build time!

### 3. Deploy
1. Click **Deploy**.
2. Vercel will build the project.
3. Once finished, note your **Production Domain** (e.g., `https://prompt-ctf.vercel.app`).

---

## 🛠️ Phase 2: Linux.do Configuration

1. Go to [Linux.do Connect](https://connect.linux.do/).
2. Create a new Application.
3. **Callback URL (Redirect URI):**
   Paste the following URL (replace with your Vercel domain):
   ```
   https://<YOUR_VERCEL_DOMAIN>.vercel.app/api/linuxdo-callback
   ```
   *(Example: `https://prompt-ctf.vercel.app/api/linuxdo-callback`)*

   > **Local Development:** If running locally, add: `http://localhost:1234/api/linuxdo-callback`

---

## 🗄️ Phase 3: Supabase Configuration

### 1. Create a Project
1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose your organization, name the project, and set a database password.

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

### 3. Configure Authentication (Standard Providers)
Go to the **Authentication** tab in the Supabase sidebar.

**A. URL Configuration:**
1. Under **URL Configuration**, set the `Site URL` to your Vercel deployment URL.
2. If testing locally, add `http://localhost:1234` to **Redirect URLs**.

**B. Enable Google/GitHub:**
1. Follow Supabase instructions to get Client IDs from Google Cloud / GitHub Developer Settings.
2. For **Redirect URL** in Google/GitHub, use the URL provided by Supabase (e.g., `https://<project-ref>.supabase.co/auth/v1/callback`).

---

## ✅ Verification
1. Open the deployed app.
2. Click **Connect with Linux.do**.
3. You should be redirected to Linux.do, authorize, and return logged in.
