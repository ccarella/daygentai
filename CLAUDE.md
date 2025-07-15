# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm run dev` - Start development server with Turbopack on http://localhost:3000
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run type-check` - Run TypeScript type checking

**Git Hooks (automated):**
- Pre-commit: Runs ESLint on staged files and type checking
- Pre-push: Runs full type check and build to ensure CI will pass

## Architecture Overview

This is a Next.js 15 application with App Router that implements a multi-tenant SaaS product management tool called "Daygent" for working with software developer agents.

### Tech Stack
- **Framework**: Next.js 15.4.1 with App Router and Turbopack
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **Authentication**: Supabase Auth with magic link authentication
- **Database**: Supabase (PostgreSQL)
- **Type Safety**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS with CSS variables, class-variance-authority for component variants

### Key Architecture Patterns

1. **Authentication Flow**:
   - Magic link authentication via Supabase OTP
   - Middleware-based route protection in `middleware.ts`
   - Server/client Supabase client separation (`lib/supabase/`)
   - Auth callback route at `/auth/callback`

2. **User Onboarding Flow**:
   - `/` - Landing page with email login
   - `/CreateUser` - Profile creation (requires auth)
   - `/CreateWorkspace` - Workspace setup (requires profile)
   - `/success` - Onboarding complete (requires profile + workspace)
   - `/[slug]` - Dynamic workspace routes

3. **Middleware Protection**:
   - Enforces authentication for protected routes
   - Manages progressive onboarding flow
   - Checks user profile and workspace existence
   - Redirects based on user's progress in onboarding

4. **Component Organization**:
   - `/components/auth/` - Authentication components
   - `/components/layout/` - Layout and navigation components
   - `/components/ui/` - shadcn/ui components (when installed)
   - Uses `@/` path alias for imports

5. **Environment Configuration**:
   - Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Environment variables stored in `.env.local`

### Database Schema (inferred from middleware):
- `users` table with profile data
- `workspaces` table with `owner_id` foreign key to users

### Important Notes
- The app uses Supabase SSR for server-side authentication
- All workspace routes are dynamic and protected
- The middleware handles all authentication and routing logic
- Components use the new-york style from shadcn/ui

### TypeScript Configuration
The project uses strict TypeScript settings for production-level type safety:
- All strict mode checks enabled
- No unused locals or parameters allowed
- All code paths must return values
- No switch statement fallthrough
- Array/object access requires undefined checks
- Override keyword required for inheritance
- Environment variables accessed with bracket notation