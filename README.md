# Chat Organizer — Setup Checklist

You don't need to write or edit any code. Just follow these steps in order.

## 1. Set up Supabase (your database)
1. Go to supabase.com, create a new project (or use an existing one you want to dedicate to this).
2. Once it's ready, open the **SQL Editor** in the left sidebar.
3. Open the file `supabase/schema.sql` from this project, copy everything in it, paste it into the SQL Editor, and click **Run**.
4. Go to **Settings > API**. Copy the **Project URL** and the **service_role** key (not the anon key). You'll need both.

## 2. Get your API keys
- **Anthropic API key**: console.anthropic.com > API Keys. You likely already have one from your EnablementOS work.
- **Voyage AI key**: voyageai.com > sign up (free tier covers this easily) > API Keys.

## 3. Push this project to GitHub
1. Create a new repository on github.com (empty, no README).
2. Upload this whole `chat-organizer` folder to it. Easiest way: on the new repo's page, click "uploading an existing file" and drag the folder contents in, or ask me and I'll give you the exact git commands to paste into a terminal.

## 4. Connect to Netlify
1. In Netlify, click **Add new site > Import an existing project**.
2. Pick the GitHub repo you just created.
3. Netlify will auto-detect Next.js (thanks to the included `netlify.toml`). Leave build settings as-is.
4. Before deploying, go to **Site settings > Environment variables** and add all four values from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `VOYAGE_API_KEY`
5. Click **Deploy**.

## 5. Use it
1. Open your new Netlify site.
2. Click **Get started**, upload your Claude export `.json` file.
3. Wait a few minutes while it summarizes and groups your chats (100 chats = roughly 5-10 minutes).
4. Browse your themes, each with a synthesis of the unified idea and a suggested next step.

## What's not built yet (phase 2, once this works for you)
- Consolidating duplicate conversations into a single merged one
- A "search across all chats" bar
- Multi-user accounts + Stripe billing, for when this becomes a justaia.com product
