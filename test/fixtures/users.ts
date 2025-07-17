import { User } from '@supabase/supabase-js'

export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  confirmation_sent_at: '2024-01-01T00:00:00.000Z',
  recovery_sent_at: null,
  email_confirmed_at: '2024-01-01T00:01:00.000Z',
  last_sign_in_at: '2024-01-01T00:02:00.000Z',
  role: 'authenticated',
  updated_at: '2024-01-01T00:02:00.000Z',
}

export const mockUserProfile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  full_name: 'Test User',
  handle: 'testuser',
  created_at: '2024-01-01T00:00:00.000Z',
}

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides,
})