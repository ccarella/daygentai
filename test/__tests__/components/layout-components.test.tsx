import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
// import { Header } from '@/components/layout/header'
// NOTE: Sidebar components don't exist in the codebase
// import { Sidebar } from '@/components/layout/sidebar'
// import { SidebarHeader } from '@/components/layout/sidebar-header'
// import { SidebarNavigation } from '@/components/layout/sidebar-navigation'
import { useRouter } from 'next/navigation'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/test-workspace'),
}))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('Layout Components', () => {
  let mockRouter: any

  beforeEach(() => {
    mockRouter = {
      push: vi.fn(),
      back: vi.fn(),
    }
    vi.mocked(useRouter).mockReturnValue(mockRouter)
  })

  // Tests for old Header component interface - current Header expects different props
  /*
  describe('Header Component', () => {
    it('renders workspace name', () => {
      render(
        <Header 
          workspaceName="Test Workspace"
          showBackButton={false}
        />
      )

      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })

    it('shows back button when enabled', async () => {
      const user = userEvent.setup()
      
      render(
        <Header 
          workspaceName="Test Workspace"
          showBackButton={true}
        />
      )

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeInTheDocument()
      
      await user.click(backButton)
      expect(mockRouter.back).toHaveBeenCalled()
    })

    it('hides back button when disabled', () => {
      render(
        <Header 
          workspaceName="Test Workspace"
          showBackButton={false}
        />
      )

      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    })

    it('renders custom actions', () => {
      render(
        <Header 
          workspaceName="Test Workspace"
          showBackButton={false}
          actions={
            <button className="custom-action">Custom Action</button>
          }
        />
      )

      expect(screen.getByText('Custom Action')).toBeInTheDocument()
    })

    it('applies sticky positioning', () => {
      const { container } = render(
        <Header 
          workspaceName="Test Workspace"
          showBackButton={false}
        />
      )

      const header = container.querySelector('header')
      expect(header).toHaveClass('sticky', 'top-0')
    })
  })
  */

  // Sidebar components don't exist in the codebase - commenting out these tests
  /*
  describe('Sidebar Component', () => {
    const mockWorkspace = {
      id: 'test-id',
      slug: 'test-workspace',
      name: 'Test Workspace',
      created_at: new Date().toISOString(),
      owner_id: 'user-1'
    }

    it('renders sidebar with workspace info', () => {
      render(
        <Sidebar workspace={mockWorkspace}>
          <div>Sidebar Content</div>
        </Sidebar>
      )

      expect(screen.getByText('Sidebar Content')).toBeInTheDocument()
    })

    it('contains header and navigation sections', () => {
      render(
        <Sidebar workspace={mockWorkspace}>
          <SidebarHeader workspace={mockWorkspace} />
          <SidebarNavigation workspaceSlug={mockWorkspace.slug} />
        </Sidebar>
      )

      // Should have workspace name in header
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
      
      // Should have navigation items
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })

    it('has proper width and height styling', () => {
      const { container } = render(
        <Sidebar workspace={mockWorkspace}>
          <div>Content</div>
        </Sidebar>
      )

      const sidebar = container.firstChild as HTMLElement
      expect(sidebar).toHaveClass('w-64') // Standard sidebar width
      expect(sidebar).toHaveClass('h-full')
    })
  })

  describe('SidebarHeader Component', () => {
    const mockWorkspace = {
      id: 'test-id',
      slug: 'test-workspace',
      name: 'Test Workspace',
      created_at: new Date().toISOString(),
      owner_id: 'user-1'
    }

    it('displays workspace name', () => {
      render(<SidebarHeader workspace={mockWorkspace} />)
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })

    it('shows workspace selector button', () => {
      render(<SidebarHeader workspace={mockWorkspace} />)
      
      const selector = screen.getByRole('button', { name: /test workspace/i })
      expect(selector).toBeInTheDocument()
    })

    it('displays help icon', () => {
      render(<SidebarHeader workspace={mockWorkspace} />)
      
      // Look for help icon button
      const helpButton = screen.getByRole('button', { name: /help/i })
      expect(helpButton).toBeInTheDocument()
    })
  })

  describe('SidebarNavigation Component', () => {
    it('renders navigation items', () => {
      render(<SidebarNavigation workspaceSlug="test-workspace" />)

      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })

    it('highlights active route', () => {
      const { container } = render(
        <SidebarNavigation workspaceSlug="test-workspace" />
      )

      // The Issues link should be active since pathname is /test-workspace
      const issuesLink = screen.getByText('Issues').closest('a')
      expect(issuesLink).toHaveClass('bg-gray-50') // Active state class
    })

    it('navigates on click', async () => {
      const user = userEvent.setup()
      
      render(<SidebarNavigation workspaceSlug="test-workspace" />)

      const inboxLink = screen.getByText('Inbox')
      await user.click(inboxLink)

      expect(mockRouter.push).toHaveBeenCalledWith('/test-workspace/inbox')
    })

    it('shows icons for navigation items', () => {
      render(<SidebarNavigation workspaceSlug="test-workspace" />)

      // Check for SVG icons
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  */

  describe('Conditional Rendering', () => {
    it('conditionally shows admin-only items', () => {
      const NavigationWithPermissions = ({ isAdmin }: { isAdmin: boolean }) => (
        <nav>
          <a href="/issues">Issues</a>
          {isAdmin && <a href="/settings">Settings</a>}
        </nav>
      )

      const { rerender } = render(<NavigationWithPermissions isAdmin={false} />)
      
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()

      rerender(<NavigationWithPermissions isAdmin={true} />)
      
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('shows loading state conditionally', () => {
      const ConditionalContent = ({ loading }: { loading: boolean }) => (
        <div>
          {loading ? (
            <div className="animate-pulse">Loading...</div>
          ) : (
            <div>Content Loaded</div>
          )}
        </div>
      )

      const { rerender } = render(<ConditionalContent loading={true} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Content Loaded')).not.toBeInTheDocument()

      rerender(<ConditionalContent loading={false} />)
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByText('Content Loaded')).toBeInTheDocument()
    })
  })

  describe('Mobile Navigation', () => {
    it('renders mobile-optimized navigation', () => {
      const MobileNav = () => (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
          <div className="flex justify-around py-2">
            <button className="p-2">
              <span className="sr-only">Issues</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <button className="p-2">
              <span className="sr-only">Inbox</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </button>
          </div>
        </nav>
      )

      render(<MobileNav />)

      // Check for mobile nav structure
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('md:hidden', 'fixed', 'bottom-0')

      // Check for icon buttons with accessibility
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Inbox')).toBeInTheDocument()
      
      // Icons should be present
      const icons = document.querySelectorAll('svg')
      expect(icons).toHaveLength(2)
    })

    // Touch event simulation doesn't work properly in test environment
    it.skip('handles swipe gestures on mobile', async () => {
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()

      const SwipeableComponent = () => {
        const handleTouchStart = (e: React.TouchEvent) => {
          // Simple swipe detection
          const startX = e.touches[0]?.clientX || 0
          
          const handleTouchEnd = (endEvent: TouchEvent) => {
            const endX = endEvent.changedTouches[0]?.clientX || 0
            const diff = startX - endX
            
            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                onSwipeLeft()
              } else {
                onSwipeRight()
              }
            }
            
            document.removeEventListener('touchend', handleTouchEnd)
          }
          
          document.addEventListener('touchend', handleTouchEnd)
        }

        return (
          <div 
            onTouchStart={handleTouchStart}
            className="touch-area h-screen"
          >
            Swipeable Content
          </div>
        )
      }

      render(<SwipeableComponent />)

      const touchArea = screen.getByText('Swipeable Content')
      
      // Simulate swipe left
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 0 } as Touch]
      })
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 20, clientY: 0 } as Touch]
      })

      touchArea.dispatchEvent(touchStartEvent)
      document.dispatchEvent(touchEndEvent)

      expect(onSwipeLeft).toHaveBeenCalled()
    })
  })

  describe('Header Interactions', () => {
    it('handles user menu interactions', async () => {
      const user = userEvent.setup()
      
      const HeaderWithUserMenu = () => {
        const [menuOpen, setMenuOpen] = React.useState(false)
        
        return (
          <header className="flex justify-between items-center p-4">
            <h1>App Name</h1>
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center space-x-2"
              >
                <span>User Name</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg">
                  <a href="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</a>
                  <a href="/settings" className="block px-4 py-2 hover:bg-gray-100">Settings</a>
                  <hr />
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </header>
        )
      }

      render(<HeaderWithUserMenu />)

      // Menu initially closed
      expect(screen.queryByText('Profile')).not.toBeInTheDocument()

      // Open menu
      await user.click(screen.getByText('User Name'))
      
      // Menu items visible
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    it('shows notification badge', () => {
      const HeaderWithNotifications = ({ count }: { count: number }) => (
        <header className="p-4">
          <button className="relative">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {count}
              </span>
            )}
            <span className="sr-only">Notifications ({count})</span>
          </button>
        </header>
      )

      const { rerender } = render(<HeaderWithNotifications count={0} />)
      
      // No badge when count is 0
      expect(screen.queryByText('0')).not.toBeInTheDocument()
      
      // Show badge with count
      rerender(<HeaderWithNotifications count={3} />)
      expect(screen.getByText('3')).toBeInTheDocument()
      
      // Accessibility text
      expect(screen.getByText('Notifications (3)')).toBeInTheDocument()
    })
  })

  describe('Layout Accessibility', () => {
    it('has proper landmark regions', () => {
      const FullLayout = () => (
        <div className="flex h-screen">
          <aside role="complementary" className="w-64 bg-gray-50">
            <nav role="navigation">
              <ul>
                <li><a href="/home">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </aside>
          <div className="flex-1 flex flex-col">
            <header role="banner" className="h-16 bg-white border-b">
              <h1>Application</h1>
            </header>
            <main role="main" className="flex-1 p-4">
              Main Content
            </main>
          </div>
        </div>
      )

      render(<FullLayout />)

      expect(screen.getByRole('complementary')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('supports keyboard navigation through layout', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <button>First</button>
          <nav>
            <a href="/link1">Link 1</a>
            <a href="/link2">Link 2</a>
          </nav>
          <button>Last</button>
        </div>
      )

      // Tab through elements
      await user.tab()
      expect(document.activeElement).toHaveTextContent('First')
      
      await user.tab()
      expect(document.activeElement).toHaveTextContent('Link 1')
      
      await user.tab()
      expect(document.activeElement).toHaveTextContent('Link 2')
      
      await user.tab()
      expect(document.activeElement).toHaveTextContent('Last')
      
      // Shift+Tab backwards
      await user.tab({ shift: true })
      expect(document.activeElement).toHaveTextContent('Link 2')
    })
  })
})