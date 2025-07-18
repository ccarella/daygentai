import { render } from '@testing-library/react';
// Add any providers here that your app needs
function AllTheProviders({ children }) {
    return <>{children}</>;
}
// Custom render method that includes all providers
const customRender = (ui, options) => render(ui, Object.assign({ wrapper: AllTheProviders }, options));
// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
// Helper to create mock Supabase responses
export const mockSupabaseUser = (overrides = {}) => (Object.assign({ id: '123', email: 'test@example.com', created_at: new Date().toISOString() }, overrides));
export const mockSupabaseSession = (overrides = {}) => (Object.assign({ access_token: 'mock-token', refresh_token: 'mock-refresh', expires_in: 3600, user: mockSupabaseUser() }, overrides));
