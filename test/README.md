# Testing Guide

This project uses Vitest for testing React components and utilities.

## Quick Start

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
test/
├── __tests__/          # Test files organized by feature
│   └── components/
│       └── auth/
│           └── logout-button.test.tsx
├── __mocks__/          # Mock files for modules
├── utils/              # Test utilities and helpers
│   └── test-utils.tsx
├── setup.ts            # Global test setup
└── README.md           # This file
```

## Writing Tests

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Using Test Utils

Import from our custom test-utils for pre-configured render:

```typescript
import { render } from '@/test/utils/test-utils'
```

## Mocking

### Supabase Client
Already mocked in `test/setup.ts`. Use like:

```typescript
const mockSignOut = vi.fn()
;(createClient as any).mockReturnValue({
  auth: { signOut: mockSignOut }
})
```

### Next.js Navigation
Router, pathname, and search params are pre-mocked in setup.

## Best Practices

1. **Test behavior, not implementation**: Focus on what users see/experience
2. **Use Testing Library queries**: Prefer `getByRole`, `getByLabelText` over test IDs
3. **Keep tests isolated**: Each test should be independent
4. **Mock external dependencies**: Database calls, API requests, etc.
5. **Write descriptive test names**: Should explain what is being tested

## Common Commands

- `npm test` - Start Vitest in watch mode
- `npm run test:ui` - Open Vitest UI in browser
- `npm run test:coverage` - Generate coverage report
- `vitest related` - Run tests related to changed files

## VSCode Integration

The Vitest extension is configured. You can:
- Run/debug individual tests from the editor
- See test status in the test explorer
- Get inline coverage indicators

## Troubleshooting

### "Cannot find module" errors
Check that path aliases in `vitest.config.ts` match `tsconfig.json`

### Tests timing out
Increase timeout in specific tests:
```typescript
it('slow test', async () => {
  // test code
}, { timeout: 10000 })
```

### Component not rendering
Check if you need to mock additional dependencies or providers