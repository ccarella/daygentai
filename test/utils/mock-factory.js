import { vi } from 'vitest';
import { createMockUser } from '../fixtures/users';
export const createMockSupabaseClient = (overrides = {}) => {
    const mockAuth = Object.assign({ signInWithOtp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null
        }), signOut: vi.fn().mockResolvedValue({ error: null }), getUser: vi.fn().mockResolvedValue({
            data: { user: createMockUser() },
            error: null
        }), getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null
        }), onAuthStateChange: vi.fn() }, overrides.auth);
    const mockFrom = vi.fn((table) => {
        const mockQuery = Object.assign({ select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), like: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), contains: vi.fn().mockReturnThis(), containedBy: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), overlaps: vi.fn().mockReturnThis(), match: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), filter: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), limit: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }, (overrides[table] || {}));
        return mockQuery;
    });
    return Object.assign({ auth: mockAuth, from: mockFrom }, overrides);
};
export const createMockRouter = () => {
    const state = {
        pathname: '/',
        query: {},
        asPath: '/',
    };
    return {
        push: vi.fn((url) => {
            state.pathname = url;
            state.asPath = url;
            return Promise.resolve(true);
        }),
        replace: vi.fn((url) => {
            state.pathname = url;
            state.asPath = url;
            return Promise.resolve(true);
        }),
        prefetch: vi.fn().mockResolvedValue(undefined),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        pathname: state.pathname,
        query: state.query,
        asPath: state.asPath,
        // Helper for tests to check current state
        get currentPath() {
            return state.pathname;
        },
    };
};
export const mockLocalStorage = () => {
    const store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach(key => delete store[key]);
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((index) => {
            return Object.keys(store)[index] || null;
        }),
    };
};
