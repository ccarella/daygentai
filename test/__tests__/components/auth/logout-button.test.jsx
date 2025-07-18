import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogoutButton } from '@/components/auth/logout-button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
// Type the mocked functions
vi.mock('@/lib/supabase/client');
vi.mock('next/navigation');
describe('LogoutButton', () => {
    const mockPush = vi.fn();
    const mockRefresh = vi.fn();
    const mockSignOut = vi.fn();
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        useRouter.mockReturnValue({
            push: mockPush,
            refresh: mockRefresh,
        });
        createClient.mockReturnValue({
            auth: {
                signOut: mockSignOut,
            },
        });
    });
    it('renders logout button with correct text', () => {
        render(<LogoutButton />);
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Logout');
        expect(button).not.toBeDisabled();
    });
    it('shows loading state when clicked', async () => {
        // Make signOut return a promise that we control
        mockSignOut.mockReturnValue(new Promise(() => { }));
        render(<LogoutButton />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        // Check loading state
        expect(button).toHaveTextContent('Logging out...');
        expect(button).toBeDisabled();
    });
    it('calls logout and redirects on success', async () => {
        mockSignOut.mockResolvedValue({ error: null });
        render(<LogoutButton />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalledTimes(1);
            expect(mockPush).toHaveBeenCalledWith('/');
            expect(mockRefresh).toHaveBeenCalledTimes(1);
        });
        // Button should return to normal state
        expect(button).toHaveTextContent('Logout');
        expect(button).not.toBeDisabled();
    });
    it('handles logout error gracefully', async () => {
        const mockError = new Error('Logout failed');
        mockSignOut.mockResolvedValue({ error: mockError });
        render(<LogoutButton />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalledTimes(1);
            // Should not redirect on error
            expect(mockPush).not.toHaveBeenCalled();
            expect(mockRefresh).not.toHaveBeenCalled();
        });
        // Button should return to normal state
        expect(button).toHaveTextContent('Logout');
        expect(button).not.toBeDisabled();
    });
});
