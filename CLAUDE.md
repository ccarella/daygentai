# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm run dev` - Start development server with Turbopack on http://localhost:3000
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run test suite with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

**Git Hooks (automated):**
- Pre-commit: Runs ESLint on staged files and type checking
- Pre-push: Runs full type check and build to ensure CI will pass

## Architecture Overview

This is a Next.js 15 application with App Router that implements a multi-tenant SaaS product management tool called "Daygent" for working with software developer agents.

### Tech Stack
- **Framework**: Next.js 15.4.1 with App Router and Turbopack
- **UI**: React 19, Tailwind CSS 4 (alpha), shadcn/ui components
- **Authentication**: Supabase Auth with magic link authentication
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Type Safety**: TypeScript with strict mode enabled
- **Testing**: Vitest with React Testing Library
- **Styling**: Tailwind CSS with CSS variables, class-variance-authority for component variants

### Project Structure

```
daygentai/
├── app/                      # Next.js App Router pages
│   ├── [slug]/              # Dynamic workspace routes
│   │   ├── inbox/           # Inbox page for each workspace
│   │   ├── issue/[id]/      # Individual issue pages
│   │   └── page.tsx         # Main workspace page
│   ├── auth/callback/       # Supabase auth callback
│   ├── CreateUser/          # User profile creation
│   ├── CreateWorkspace/     # Workspace setup
│   ├── checkemail/          # Email verification page
│   ├── success/             # Onboarding completion
│   └── workspace/           # Workspace loading page
├── components/              # React components
│   ├── auth/                # Authentication components
│   ├── command-palette/     # Command palette & shortcuts
│   ├── inbox/               # Inbox components
│   ├── issues/              # Issue management components
│   ├── layout/              # Layout components
│   ├── settings/            # Settings components
│   ├── ui/                  # UI primitives (shadcn/ui style)
│   └── workspace/           # Workspace-specific components
├── contexts/                # React contexts
│   └── issue-cache-context  # Issue caching context
├── hooks/                   # Custom React hooks
│   ├── use-arrow-navigation # Arrow key navigation
│   ├── use-column-navigation # Column-based navigation
│   ├── use-command-palette  # Command palette logic
│   └── use-global-shortcuts # Global keyboard shortcuts
├── lib/                     # Utility libraries
│   ├── supabase/           # Supabase client setup
│   ├── markdown-utils      # Markdown processing
│   └── utils               # General utilities
├── test/                    # Test suite
│   ├── __tests__/          # Test files organized by type
│   ├── fixtures/           # Test data
│   ├── utils/              # Test utilities
│   └── setup.js            # Test environment setup
└── public/                  # Static assets
```

### Key Architecture Patterns

1. **Authentication Flow**:
   - Magic link authentication via Supabase OTP
   - Middleware-based route protection in `middleware.ts`
   - Server/client Supabase client separation (`lib/supabase/`)
   - Auth callback route at `/auth/callback`
   - Progressive onboarding flow enforced by middleware

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
   - **Performance Note**: Makes multiple DB queries per request

4. **Component Organization**:
   - `/components/auth/` - Authentication components
   - `/components/layout/` - Layout and navigation components
   - `/components/ui/` - shadcn/ui components
   - `/components/issues/` - Issue management components
   - `/components/command-palette/` - Command palette system
   - Uses `@/` path alias for imports

5. **Environment Configuration**:
   - Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Environment variables stored in `.env.local`
   - **Security Warning**: Service role key should never be exposed client-side

### Database Schema

```sql
-- Users table (managed by Supabase Auth)
users:
  - id (uuid, primary key)
  - email
  - created_at

-- Users table (public schema)
users:
  - id (uuid, primary key, references auth.users)
  - name
  - avatar_url
  - created_at
  - updated_at

-- Workspaces
workspaces:
  - id (uuid, primary key)
  - name
  - slug (unique)
  - avatar_url
  - owner_id (references auth.users)
  - api_key (encrypted)
  - api_provider
  - agents_content
  - created_at
  - updated_at

-- Issues
issues:
  - id (uuid, primary key)
  - workspace_id (references workspaces.id)
  - title
  - description (markdown supported)
  - type (enum: bug, feature, task, epic, spike, chore, design, non-technical)
  - priority (enum: critical, high, medium, low)
  - status (enum: todo, in_progress, in_review, done)
  - created_by (references auth.users)
  - creator_id (references users.id)
  - assignee_id (references auth.users, nullable)
  - generated_prompt (AI-generated prompt)
  - prompt_status (enum: pending, generating, completed, failed)
  - prompt_generated_at
  - created_at
  - updated_at

-- Workspace Members
workspace_members:
  - id (uuid, primary key)
  - workspace_id (references workspaces.id)
  - user_id (references auth.users)
  - role (enum: owner, admin, member, viewer)
  - created_at
  - updated_at
```

### Component Patterns & Conventions

1. **File Naming**:
   - Components: PascalCase (e.g., `CreateUserForm.tsx`)
   - Utilities: kebab-case (e.g., `markdown-utils.ts`)
   - Hooks: use-prefix (e.g., `use-global-shortcuts.tsx`)

2. **Component Structure**:
   - Client components marked with `'use client'`
   - Ref forwarding for imperative APIs
   - Props interfaces defined above components
   - Default exports for pages, named exports for components

3. **State Management**:
   - React Context for issue caching (`IssueCacheContext`)
   - Local state for UI state
   - Supabase for persistent data
   - No external state management library

4. **Keyboard Shortcuts & Command Palette**:
   - Global shortcuts handled by `use-global-shortcuts` hook
   - Sequential shortcuts support (vim-style, e.g., "G then I")
   - Command palette with fuzzy search
   - Help mode showing all shortcuts (triggered by "?")
   - Proper input field detection to avoid conflicts

5. **Issue Management Features**:
   - List and Kanban board views
   - Pagination (50 issues per page)
   - Filtering by status, priority, and type
   - Markdown support with preview stripping
   - Viewport-based preloading using Intersection Observer

### Testing Strategy

- **Framework**: Vitest with React Testing Library
- **Coverage**: Configured with V8 provider
- **Test Organization**:
  - Component tests in `__tests__/components/`
  - Data integrity tests in `__tests__/data-integrity/`
  - User experience tests in `__tests__/user-experience/`
- **Mocking**: Supabase client and Next.js navigation mocked
- **Fixtures**: Test data for users, workspaces, and issues

### Known Issues & TODOs

1. **Duplicate Files**: Both `.jsx` and `.tsx` versions exist for many components - remove `.jsx` files
2. **TypeScript Errors**: Multiple type errors in test files need resolution
3. **Performance**: Middleware makes multiple DB queries - implement caching
4. **Security**: Environment variables in `.env.local` should be secured
5. **Missing Features**:
   - Error boundaries for better error handling
   - Skeleton screens for loading states
   - Redis or in-memory caching for user/workspace data
6. **Test Issues**: Some tests reference non-existent components

### Development Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Implement with TypeScript
   - Write tests for new functionality
   - Ensure `npm run type-check` passes
   - Ensure `npm run lint` passes

2. **Common Tasks**:
   - Adding a new page: Create in `app/` directory
   - Adding a component: Place in appropriate `components/` subdirectory
   - Adding a hook: Create in `hooks/` with `use-` prefix
   - Adding tests: Mirror source structure in `test/__tests__/`

3. **Debugging Tips**:
   - Check browser console for Supabase auth errors
   - Use React Developer Tools for component debugging
   - Check Network tab for failed API calls
   - Middleware logs can help debug routing issues

### Important Notes
- The app uses Supabase SSR for server-side authentication
- All workspace routes are dynamic and protected
- The middleware handles all authentication and routing logic
- Components use the new-york style from shadcn/ui
- Tailwind CSS 4 is in alpha - some features may be unstable
- Always run type checking before committing

### TypeScript Configuration
The project uses strict TypeScript settings for production-level type safety:
- All strict mode checks enabled
- No unused locals or parameters allowed
- All code paths must return values
- No switch statement fallthrough
- Array/object access requires undefined checks
- Override keyword required for inheritance
- Environment variables accessed with bracket notation