# Casil Shots

This repository builds two separate websites:

- Public photography portfolio: `casil-shots/`
- Private owner portal: `owner/`

The owner portal uses Supabase Auth, a one-time owner invitation, verified-email password recovery, and private photo/video storage.

## Local development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and enter the Supabase project URL, publishable/anon key, and owner signup function URL.
3. Run `npm run dev` and open `http://localhost:5173/owner.html#/login-demo?mode=create` for the owner portal.

The publishable/anon key is intended for browser use. Never put a Supabase service-role or secret key in a `VITE_*` variable, the frontend, or Git.

## Configure authentication and private media

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the owner registry, media table, private storage bucket, and row-level security rules.
3. Install the Supabase CLI, sign in, and link this repository to the project.
4. Generate a random setup key with at least 32 random bytes. Store it only as the Edge Function secret `OWNER_SETUP_KEY`; do not commit it. Supabase supplies the project URL and server secret to deployed functions.
5. Deploy `supabase/functions/owner-signup` using [`supabase/config.toml`](supabase/config.toml). The function sends the owner invitation and closes enrollment once the owner is registered.
6. In Supabase Auth URL Configuration, add both callback URLs to the redirect allow list:

   ```text
   https://jeffdavila01.github.io/NEURA/owner/?flow=invite#/login-demo
   https://jeffdavila01.github.io/NEURA/owner/?flow=reset#/login-demo
   ```

7. Put the three public `VITE_*` settings in `.env.local`, then build both sites:

   ```powershell
   npm run build
   npm run build:owner
   ```

   Publish `dist` to the repository's `casil-shots/` folder and `dist-owner` to its `owner/` folder. The publishable key is public client configuration; the private bucket and RLS policies enforce access.
8. Open the owner portal, choose **Set up the owner account**, enter the owner email and one-time setup key, then use the email invitation to set the password. The owner can then sign in to upload and delete photos and videos. Password recovery uses the verified owner email.

The owner setup key only authorizes the first invitation. The owner role is stored in a server-managed table; website visitors cannot assign themselves owner access. Private previews use expiring signed URLs.

## Separate owner portal

- Local: `http://localhost:5173/owner.html#/login-demo?mode=create`
- Published: [Casil Shots Owner Portal](https://jeffdavila01.github.io/NEURA/owner/)
- Direct create-account view: [Set up owner account](https://jeffdavila01.github.io/NEURA/owner/#/login-demo?mode=create)

Supabase must be configured before sign-up, sign-in, or media uploads can work. Client-gallery and saved-photo pages remain demonstrations and are not connected to this owner library.
