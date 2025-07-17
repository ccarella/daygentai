import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Add any providers here that your app needs
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Custom render method that includes all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Helper to create mock Supabase responses
export const mockSupabaseUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const mockSupabaseSession = (overrides = {}) => ({
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  user: mockSupabaseUser(),
  ...overrides,
})