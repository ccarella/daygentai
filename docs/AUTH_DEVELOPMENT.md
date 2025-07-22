# Authentication in Development

This document explains how to handle authentication during local development, particularly when dealing with Supabase's Site URL limitations.

## The Issue

Supabase requires a Site URL to be configured, which is used for magic link redirects. When this is set to production (e.g., `https://daygent.ai`), local development authentication becomes challenging.

## Solutions

### Option 1: Manual Verification (Quick Fix)

For immediate local development needs:

1. Start your local dev server: `npm run dev`
2. Go to `http://localhost:3000` and enter your email
3. Check your email and click the magic link
4. You'll be redirected to production and see an error
5. Copy the ENTIRE URL from your browser
6. Navigate to `http://localhost:3000/auth/manual-verify`
7. Paste the URL and click "Verify Magic Link"

### Option 2: Environment Variables

Set `NEXT_PUBLIC_SITE_URL` in your `.env.local`:
```bash
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

This helps with the redirect URL generation but doesn't solve the Supabase Site URL issue.

### Option 3: Separate Supabase Projects (Recommended)

Create separate Supabase projects for each environment:

1. **Development Project**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`

2. **Staging Project**
   - Site URL: `https://staging.daygent.ai`
   - Redirect URLs: `https://staging.daygent.ai/**`

3. **Production Project**
   - Site URL: `https://daygent.ai`
   - Redirect URLs: `https://daygent.ai/**`, `https://*.vercel.app/**`

Then use environment-specific variables:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=<dev-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-project-key>

# .env.production
NEXT_PUBLIC_SUPABASE_URL=<prod-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-project-key>
```

## Auth Flow Architecture

### Routes

1. **`/auth/callback/route.ts`**: Handles OAuth code exchange
2. **`/auth/verify/route.ts`**: Handles magic link token verification
3. **`/auth/manual-verify/page.tsx`**: UI for manual token extraction

### How It Works

1. User enters email on login page
2. `signInWithMagicLink` sends email with redirect URL
3. Supabase sends email with link to their auth endpoint
4. Their endpoint redirects to your callback with token/code
5. Callback verifies and establishes session

## Troubleshooting

### "Auth Failed" Error
- Check browser console for specific error messages
- Verify Supabase URL is in allowed redirect URLs
- Ensure environment variables are loaded correctly

### Token Expired
- Magic links expire after a set time (default 1 hour)
- Request a new magic link if expired

### Multiple Environments
- Ensure you're using the correct Supabase project for your environment
- Check that redirect URLs are properly configured in Supabase dashboard