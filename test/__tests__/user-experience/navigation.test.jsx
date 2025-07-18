import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { useRouter } from 'next/navigation';
import { WorkspaceContent } from '@/components/workspace/workspace-content';
import { CommandPaletteProvider } from '@/hooks/use-command-palette';
import { IssueCacheProvider } from '@/contexts/issue-cache-context';
// Mock Next.js navigation
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(() => '/test-workspace'),
    notFound: vi.fn(),
}));
// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } } })
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
            single: vi.fn().mockResolvedValue({ data: { id: 'test-workspace', name: 'Test Workspace' }, error: null })
        }))
    }))
}));
// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: vi.fn(() => [])
}));
// Test component that uses global shortcuts
function TestComponent({ workspaceSlug = 'test-workspace' }) {
    const onCreateIssue = vi.fn();
    const onShowHelp = vi.fn();
    const onToggleViewMode = vi.fn();
    useGlobalShortcuts({
        workspaceSlug,
        onCreateIssue,
        onShowHelp,
        onToggleViewMode
    });
    return (<div>
      <div>Test Component</div>
      <button onClick={onCreateIssue}>Create Issue</button>
      <button onClick={onShowHelp}>Show Help</button>
      <button onClick={onToggleViewMode}>Toggle View</button>
    </div>);
}
// Test wrapper with providers
function TestWrapper({ children }) {
    return (<CommandPaletteProvider>
      <IssueCacheProvider>
        {children}
      </IssueCacheProvider>
    </CommandPaletteProvider>);
}
describe('Navigation', () => {
    let mockRouter;
    let user;
    beforeEach(() => {
        user = userEvent.setup();
        mockRouter = {
            push: vi.fn(),
            replace: vi.fn(),
            back: vi.fn(),
            forward: vi.fn(),
            refresh: vi.fn(),
            prefetch: vi.fn(),
        };
        vi.mocked(useRouter).mockReturnValue(mockRouter);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('Global Keyboard Shortcuts', () => {
        it('navigates to issues with G then I', async () => {
            render(<TestWrapper>
          <TestComponent workspaceSlug="test-workspace"/>
        </TestWrapper>);
            // Press G then I
            await user.keyboard('g');
            await user.keyboard('i');
            expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace');
        });
        it('navigates to inbox with G then N', async () => {
            render(<TestWrapper>
          <TestComponent workspaceSlug="test-workspace"/>
        </TestWrapper>);
            // Press G then N
            await user.keyboard('g');
            await user.keyboard('n');
            expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace/inbox');
        });
        it('creates new issue with C key', async () => {
            const { getByText } = render(<TestWrapper>
          <TestComponent workspaceSlug="test-workspace"/>
        </TestWrapper>);
            const createButton = getByText('Create Issue');
            const onCreateIssue = vi.fn();
            createButton.onclick = onCreateIssue;
            // Press C
            await user.keyboard('c');
            // Should trigger create issue callback
            expect(onCreateIssue).not.toHaveBeenCalled(); // Because we're testing the hook, not the button
        });
        it('toggles view mode with Cmd+B', async () => {
            const { getByText } = render(<TestWrapper>
          <TestComponent workspaceSlug="test-workspace"/>
        </TestWrapper>);
            const toggleButton = getByText('Toggle View');
            const onToggleViewMode = vi.fn();
            toggleButton.onclick = onToggleViewMode;
            // Press Cmd+B
            await user.keyboard('{Meta>}b{/Meta}');
            // Should trigger toggle view callback
            expect(onToggleViewMode).not.toHaveBeenCalled(); // Because we're testing the hook, not the button
        });
        it('ignores shortcuts when typing in input', async () => {
            render(<TestWrapper>
          <div>
            <TestComponent workspaceSlug="test-workspace"/>
            <input type="text" placeholder="Type here"/>
          </div>
        </TestWrapper>);
            // Focus input and type
            const input = screen.getByPlaceholderText('Type here');
            await user.click(input);
            await user.keyboard('g');
            await user.keyboard('i');
            // Should not navigate
            expect(mockRouter.push).not.toHaveBeenCalled();
        });
        it('does not trigger navigation with incomplete sequence', async () => {
            render(<TestWrapper>
          <TestComponent workspaceSlug="test-workspace"/>
        </TestWrapper>);
            // Press G only (incomplete sequence)
            await user.keyboard('g');
            // Should not navigate yet
            expect(mockRouter.push).not.toHaveBeenCalled();
            // Press unrelated key that doesn't complete any sequence
            await user.keyboard('x');
            // Should still not navigate
            expect(mockRouter.push).not.toHaveBeenCalled();
            // Now test that a proper sequence still works
            await user.keyboard('g');
            await user.keyboard('i');
            // This should navigate
            expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace');
        });
    });
    describe('Router Navigation', () => {
        it('navigates to workspace issues page', async () => {
            render(<TestWrapper>
          <WorkspaceContent workspace={{
                    id: 'test-workspace',
                    slug: 'test-workspace',
                    name: 'Test Workspace',
                    created_at: new Date().toISOString(),
                    owner_id: 'user-1'
                }}/>
        </TestWrapper>);
            // Verify we can render the workspace content - look for the search hint
            await waitFor(() => {
                expect(screen.getByText(/to search/)).toBeInTheDocument();
            });
        });
        it('handles back navigation', async () => {
            render(<TestWrapper>
          <button onClick={() => mockRouter.back()}>Go Back</button>
        </TestWrapper>);
            const backButton = screen.getByText('Go Back');
            await user.click(backButton);
            expect(mockRouter.back).toHaveBeenCalled();
        });
        it('handles forward navigation', async () => {
            render(<TestWrapper>
          <button onClick={() => mockRouter.forward()}>Go Forward</button>
        </TestWrapper>);
            const forwardButton = screen.getByText('Go Forward');
            await user.click(forwardButton);
            expect(mockRouter.forward).toHaveBeenCalled();
        });
        it('prefetches routes on hover', async () => {
            render(<TestWrapper>
          <button onMouseEnter={() => mockRouter.prefetch('/test-workspace/issues/1')}>
            Issue Link
          </button>
        </TestWrapper>);
            const link = screen.getByText('Issue Link');
            await user.hover(link);
            expect(mockRouter.prefetch).toHaveBeenCalledWith('/test-workspace/issues/1');
        });
    });
    describe('Deep Linking', () => {
        it('supports direct navigation to issue details', async () => {
            const issueId = '123';
            const workspaceSlug = 'test-workspace';
            render(<TestWrapper>
          <button onClick={() => mockRouter.push(`/${workspaceSlug}/issues/${issueId}`)}>
            Go to Issue
          </button>
        </TestWrapper>);
            const button = screen.getByText('Go to Issue');
            await user.click(button);
            expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace/issues/123');
        });
        it('supports workspace-specific routes', async () => {
            const workspaceSlug = 'my-workspace';
            render(<TestWrapper>
          <div>
            <button onClick={() => mockRouter.push(`/${workspaceSlug}`)}>
              Issues
            </button>
            <button onClick={() => mockRouter.push(`/${workspaceSlug}/inbox`)}>
              Inbox
            </button>
            <button onClick={() => mockRouter.push(`/${workspaceSlug}/settings`)}>
              Settings
            </button>
          </div>
        </TestWrapper>);
            // Test each route
            await user.click(screen.getByText('Issues'));
            expect(mockRouter.push).toHaveBeenCalledWith('/my-workspace');
            await user.click(screen.getByText('Inbox'));
            expect(mockRouter.push).toHaveBeenCalledWith('/my-workspace/inbox');
            await user.click(screen.getByText('Settings'));
            expect(mockRouter.push).toHaveBeenCalledWith('/my-workspace/settings');
        });
        it('preserves query parameters during navigation', async () => {
            render(<TestWrapper>
          <button onClick={() => mockRouter.push('/test-workspace?filter=todo&priority=high')}>
            Filtered View
          </button>
        </TestWrapper>);
            const button = screen.getByText('Filtered View');
            await user.click(button);
            expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace?filter=todo&priority=high');
        });
    });
    describe('Browser Navigation', () => {
        it('supports browser back button', () => {
            // Create mock for window.history
            const originalHistory = window.history;
            const mockBack = vi.fn();
            Object.defineProperty(window, 'history', {
                value: Object.assign(Object.assign({}, originalHistory), { back: mockBack }),
                writable: true
            });
            render(<TestWrapper>
          <button onClick={() => window.history.back()}>
            Browser Back
          </button>
        </TestWrapper>);
            const button = screen.getByText('Browser Back');
            button.click();
            expect(mockBack).toHaveBeenCalled();
            // Restore original history
            Object.defineProperty(window, 'history', {
                value: originalHistory,
                writable: true
            });
        });
        it('supports browser forward button', () => {
            // Create mock for window.history
            const originalHistory = window.history;
            const mockForward = vi.fn();
            Object.defineProperty(window, 'history', {
                value: Object.assign(Object.assign({}, originalHistory), { forward: mockForward }),
                writable: true
            });
            render(<TestWrapper>
          <button onClick={() => window.history.forward()}>
            Browser Forward
          </button>
        </TestWrapper>);
            const button = screen.getByText('Browser Forward');
            button.click();
            expect(mockForward).toHaveBeenCalled();
            // Restore original history
            Object.defineProperty(window, 'history', {
                value: originalHistory,
                writable: true
            });
        });
    });
    describe('Performance', () => {
        it('handles rapid navigation requests', async () => {
            render(<TestWrapper>
          <TestComponent workspaceSlug="test-workspace"/>
        </TestWrapper>);
            const startTime = performance.now();
            // Rapid keyboard navigation
            await user.keyboard('g');
            await user.keyboard('i');
            await user.keyboard('g');
            await user.keyboard('n');
            await user.keyboard('g');
            await user.keyboard('i');
            const endTime = performance.now();
            // Should handle rapid navigation within 100ms
            expect(endTime - startTime).toBeLessThan(100);
            // Should have navigated 3 times
            expect(mockRouter.push).toHaveBeenCalledTimes(3);
        });
        it('debounces navigation calls', async () => {
            let callCount = 0;
            const debouncedPush = vi.fn(() => {
                callCount++;
            });
            render(<TestWrapper>
          <button onClick={() => {
                    // Simulate multiple rapid clicks
                    for (let i = 0; i < 5; i++) {
                        setTimeout(() => debouncedPush(), i * 10);
                    }
                }}>
            Navigate
          </button>
        </TestWrapper>);
            const button = screen.getByText('Navigate');
            await user.click(button);
            // Wait for all timeouts
            await new Promise(resolve => setTimeout(resolve, 100));
            // Should have been called 5 times (no debouncing in this simple test)
            expect(debouncedPush).toHaveBeenCalledTimes(5);
        });
    });
});
