import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'
import React from 'react'

// Test component that uses toast
function TestComponent() {
  const { toast } = useToast()
  
  return (
    <div>
      <button onClick={() => toast({ title: "Test toast", description: "This is a test" })}>
        Show Toast
      </button>
      <button onClick={() => toast({ title: "Error toast", description: "This is an error", variant: "destructive" })}>
        Show Error
      </button>
    </div>
  )
}

describe('Toast', () => {
  it('shows and auto-dismisses toast messages', async () => {
    const user = userEvent.setup()
    
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    )
    
    // Click button to show toast
    await user.click(screen.getByText('Show Toast'))
    
    // Check toast appears
    await waitFor(() => {
      expect(screen.getByText('Test toast')).toBeInTheDocument()
      expect(screen.getByText('This is a test')).toBeInTheDocument()
    })
  })

  it('shows error toast with destructive variant', async () => {
    const user = userEvent.setup()
    
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    )
    
    // Click button to show error toast
    await user.click(screen.getByText('Show Error'))
    
    // Check error toast appears
    await waitFor(() => {
      expect(screen.getByText('Error toast')).toBeInTheDocument()
      expect(screen.getByText('This is an error')).toBeInTheDocument()
    })
  })
})