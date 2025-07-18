import { describe, it, expect, vi, beforeAll } from 'vitest';
// Unmock the client module before importing
vi.unmock('@/lib/supabase/client');
// Mock the SSR module before client imports it
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(),
            getSession: vi.fn(),
            signInWithOtp: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(),
        },
        from: vi.fn(),
    })),
    createServerClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(),
            getSession: vi.fn(),
            signInWithOtp: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(),
        },
        from: vi.fn(),
    })),
}));
// Mock Next.js headers for server tests
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({
        getAll: vi.fn(() => []),
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    })),
}));
describe('Supabase Client Creation', () => {
    beforeAll(() => {
        // Set environment variables
        process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co';
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
    });
    describe('Browser Client', () => {
        it('creates a browser client with correct parameters', async () => {
            const { createBrowserClient } = await import('@supabase/ssr');
            const { createClient } = await import('@/lib/supabase/client');
            const client = createClient();
            expect(createBrowserClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key');
            expect(client).toBeDefined();
            expect(client.auth).toBeDefined();
        });
    });
    describe('Server Client', () => {
        it('creates a server client with correct parameters and cookie handling', async () => {
            const { createServerClient } = await import('@supabase/ssr');
            const { createClient } = await import('@/lib/supabase/server');
            const client = await createClient();
            expect(createServerClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key', expect.objectContaining({
                cookies: expect.any(Object)
            }));
            expect(client).toBeDefined();
            expect(client.auth).toBeDefined();
        });
    });
});
