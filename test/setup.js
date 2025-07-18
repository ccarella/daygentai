// Mock ResizeObserver before any imports
if (typeof global !== 'undefined') {
    global.ResizeObserver = class ResizeObserver {
        constructor(callback) {
            this.callback = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll, afterAll } from 'vitest';
// Cleanup after each test
afterEach(() => {
    cleanup();
});
// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: vi.fn(),
            replace: vi.fn(),
            prefetch: vi.fn(),
            back: vi.fn(),
            pathname: '/',
            query: {},
            asPath: '/',
        };
    },
    useSearchParams() {
        return new URLSearchParams();
    },
    usePathname() {
        return '/';
    },
}));
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        auth: {
            signInWithOtp: vi.fn(),
            signOut: vi.fn(),
            getUser: vi.fn(),
            getSession: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
    })),
}));
// Mock prompt generator
vi.mock('@/lib/llm/prompt-generator', () => ({
    generatePromptFromIssue: vi.fn().mockResolvedValue('Generated prompt'),
    updateIssuePrompt: vi.fn().mockResolvedValue({ success: true }),
    getAgentsContent: vi.fn().mockResolvedValue(null),
}));

// Mock issue cache context
vi.mock('@/contexts/issue-cache-context', () => ({
    useIssueCache: vi.fn(() => ({
        getCachedIssue: vi.fn(),
        setCachedIssue: vi.fn(),
        removeCachedIssue: vi.fn(),
        clearCache: vi.fn(),
    })),
}));

// Mock window.matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
    
    // Mock Element.prototype.hasPointerCapture for Radix UI
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = function() { return false; };
    }
    if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = function() {};
    }
    if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = function() {};
    }
    
    // Also mock on HTMLElement for better compatibility
    if (!HTMLElement.prototype.hasPointerCapture) {
        HTMLElement.prototype.hasPointerCapture = function() { return false; };
    }
    if (!HTMLElement.prototype.setPointerCapture) {
        HTMLElement.prototype.setPointerCapture = function() {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
        HTMLElement.prototype.releasePointerCapture = function() {};
    }
}


// Suppress console output during tests but keep functionality
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
    // Create spy functions that still call through to avoid breaking code that depends on console
    console.error = vi.fn((...args) => {
        // Only log actual errors, not expected ones
        if (args[0] && typeof args[0] === 'string' && !args[0].includes('Error fetching workspace')) {
            originalConsoleError(...args);
        }
    });
    console.warn = vi.fn((...args) => originalConsoleWarn(...args));
    console.log = vi.fn(); // Suppress logs completely
});

afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
});
