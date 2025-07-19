import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'
import React, { useState, useEffect, useRef } from 'react'

// Mock component to demonstrate timeout cleanup pattern
const MockComponentWithTimeout = ({ onTimeout }: { onTimeout?: () => void }) => {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleClick = () => {
    setMessage('Loading...')
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setMessage('Complete!')
      onTimeout?.()
      timeoutRef.current = null
    }, 1000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div>
      <button onClick={handleClick}>Trigger Action</button>
      <div data-testid="message">{message}</div>
    </div>
  )
}

// Example test patterns for timeout cleanup
describe('Timeout Cleanup Test Patterns', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Basic Timeout Cleanup', () => {
    it('should clean up timeout when component unmounts', () => {
      const mockCallback = vi.fn()
      const { unmount } = render(<MockComponentWithTimeout onTimeout={mockCallback} />)
      
      // Trigger timeout
      act(() => {
        screen.getByText('Trigger Action').click()
      })
      
      // Verify loading state
      expect(screen.getByTestId('message')).toHaveTextContent('Loading...')
      
      // Unmount before timeout completes
      unmount()
      
      // Advance timers - callback should not be called
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      // Verify timeout callback was not called after unmount
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should handle multiple rapid actions correctly', () => {
      const mockCallback = vi.fn()
      render(<MockComponentWithTimeout onTimeout={mockCallback} />)
      
      // Trigger action multiple times rapidly
      for (let i = 0; i < 5; i++) {
        act(() => {
          screen.getByText('Trigger Action').click()
        })
        
        // Advance time partially
        act(() => {
          vi.advanceTimersByTime(500)
        })
      }
      
      // Complete the final timeout
      act(() => {
        vi.advanceTimersByTime(500)
      })
      
      // Only the last action should complete
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('message')).toHaveTextContent('Complete!')
    })
  })

  describe('Memory Leak Detection Pattern', () => {
    it('should properly clear timeouts on rapid mount/unmount', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const iterations = 5
      
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(<MockComponentWithTimeout />)
        
        // Trigger action that creates timeout
        act(() => {
          screen.getByText('Trigger Action').click()
        })
        
        // Unmount immediately
        unmount()
      }
      
      // Verify setTimeout and clearTimeout were called appropriately
      expect(setTimeoutSpy).toHaveBeenCalledTimes(iterations)
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(iterations)
    })
  })
})

// Helper function for testing memory leaks in real components
export const testForMemoryLeaks = (Component: React.ComponentType<any>, props: any = {}, actionTrigger?: () => Promise<void>) => {
  return async () => {
    const iterations = 10
    
    for (let i = 0; i < iterations; i++) {
      const { unmount } = render(<Component {...props} />)
      
      // Trigger the action that creates timeout if provided
      if (actionTrigger) {
        await actionTrigger()
      }
      
      // Unmount immediately
      unmount()
      
      // Small delay to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    // In a real test, you would check memory usage here
    // For unit tests, we just verify no errors occurred
    expect(console.error).not.toHaveBeenCalled()
  }
}