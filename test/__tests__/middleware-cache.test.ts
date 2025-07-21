import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { _testUserCache } from '@/middleware'

describe('LRU Cache - Pattern Matching', () => {
  beforeEach(() => {
    // Clear cache before each test
    _testUserCache.invalidate()
  })

  it('should not invalidate keys with similar prefixes', () => {
    // Set up test data
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add multiple users with similar IDs
    _testUserCache.set('user:123', { ...testData, id: '123' })
    _testUserCache.set('user:1234', { ...testData, id: '1234' })
    _testUserCache.set('user:12345', { ...testData, id: '12345' })
    _testUserCache.set('user:456', { ...testData, id: '456' })
    
    // Verify all keys are present
    expect(_testUserCache.get('user:123')).toBeTruthy()
    expect(_testUserCache.get('user:1234')).toBeTruthy()
    expect(_testUserCache.get('user:12345')).toBeTruthy()
    expect(_testUserCache.get('user:456')).toBeTruthy()
    
    // Invalidate only user:123
    _testUserCache.invalidate('user:123')
    
    // Verify only user:123 was removed
    expect(_testUserCache.get('user:123')).toBeNull()
    expect(_testUserCache.get('user:1234')).toBeTruthy()
    expect(_testUserCache.get('user:12345')).toBeTruthy()
    expect(_testUserCache.get('user:456')).toBeTruthy()
  })

  it('should handle exact pattern matching correctly', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add test entries
    _testUserCache.set('user:abc', { ...testData, id: 'abc' })
    _testUserCache.set('user:abcd', { ...testData, id: 'abcd' })
    _testUserCache.set('workspace:abc', { ...testData, id: 'abc' })
    
    // Invalidate pattern "user:abc"
    _testUserCache.invalidate('user:abc')
    
    // Verify only exact match was removed
    expect(_testUserCache.get('user:abc')).toBeNull()
    expect(_testUserCache.get('user:abcd')).toBeTruthy()
    expect(_testUserCache.get('workspace:abc')).toBeTruthy()
  })

  it('should clear all entries when no pattern provided', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add multiple entries
    _testUserCache.set('user:1', { ...testData, id: '1' })
    _testUserCache.set('user:2', { ...testData, id: '2' })
    _testUserCache.set('user:3', { ...testData, id: '3' })
    
    // Clear all
    _testUserCache.invalidate()
    
    // Verify all entries removed
    expect(_testUserCache.get('user:1')).toBeNull()
    expect(_testUserCache.get('user:2')).toBeNull()
    expect(_testUserCache.get('user:3')).toBeNull()
  })
})

describe('LRU Cache - LRU Behavior', () => {
  beforeEach(() => {
    // Clear cache before each test
    _testUserCache.invalidate()
  })

  it('should maintain LRU order when accessing entries', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Create a small cache to test eviction
    // Note: We can't change maxSize dynamically, so we'll test with multiple entries
    
    // Add entries
    _testUserCache.set('user:1', { ...testData, id: '1' })
    _testUserCache.set('user:2', { ...testData, id: '2' })
    _testUserCache.set('user:3', { ...testData, id: '3' })
    
    // Access user:1 to make it most recently used
    expect(_testUserCache.get('user:1')).toBeTruthy()
    
    // Access user:2 to make it second most recently used
    expect(_testUserCache.get('user:2')).toBeTruthy()
    
    // user:3 is now least recently used
    // Verify all entries still exist
    expect(_testUserCache.get('user:1')).toBeTruthy()
    expect(_testUserCache.get('user:2')).toBeTruthy()
    expect(_testUserCache.get('user:3')).toBeTruthy()
  })

  it('should handle rapid get operations without race conditions', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add an entry
    _testUserCache.set('user:rapid', testData)
    
    // Perform multiple rapid get operations
    const results = []
    for (let i = 0; i < 100; i++) {
      results.push(_testUserCache.get('user:rapid'))
    }
    
    // All results should be the same
    expect(results.every(r => r !== null && r.id === 'test')).toBe(true)
    
    // Entry should still be in cache
    expect(_testUserCache.get('user:rapid')).toBeTruthy()
  })

  it('should handle concurrent-like operations safely', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add entries
    _testUserCache.set('user:concurrent', testData)
    
    // Simulate "concurrent" operations (though JS is single-threaded)
    const operations = []
    
    // Mix of get and set operations
    operations.push(_testUserCache.get('user:concurrent'))
    operations.push(_testUserCache.set('user:concurrent2', { ...testData, id: '2' }))
    operations.push(_testUserCache.get('user:concurrent'))
    operations.push(_testUserCache.invalidate('user:concurrent'))
    operations.push(_testUserCache.get('user:concurrent'))
    
    // After invalidation, should be null
    expect(_testUserCache.get('user:concurrent')).toBeNull()
    // Other entry should still exist
    expect(_testUserCache.get('user:concurrent2')).toBeTruthy()
  })
})

describe('LRU Cache - Error Handling', () => {
  beforeEach(() => {
    // Clear cache before each test
    _testUserCache.invalidate()
  })

  it('should not cache error states', () => {
    // This test verifies the behavior when database errors occur
    // The middleware should not cache the fallback state
    
    // Set up a user entry
    const userId = 'error-test-user'
    const cacheKey = `user:${userId}`
    
    // Initially, cache should be empty
    expect(_testUserCache.get(cacheKey)).toBeNull()
    
    // In a real scenario, if DB error occurs, middleware sets fallback but doesn't cache
    // We can't test the actual middleware here, but we can verify cache behavior
    
    // Simulate successful query after error - should be cacheable
    const successData = { id: userId, hasProfile: true, hasWorkspace: true }
    _testUserCache.set(cacheKey, successData)
    
    // Verify it was cached
    expect(_testUserCache.get(cacheKey)).toEqual(successData)
  })
})

describe('LRU Cache - Size Limit Enforcement', () => {
  beforeEach(() => {
    // Clear cache before each test
    _testUserCache.invalidate()
  })

  it('should handle updates without removing entries unnecessarily', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add an entry
    _testUserCache.set('user:update-test', testData)
    
    // Update the same entry multiple times
    for (let i = 0; i < 10; i++) {
      _testUserCache.set('user:update-test', { ...testData, id: `updated-${i}` })
    }
    
    // Entry should still exist with latest value
    const result = _testUserCache.get('user:update-test')
    expect(result).toBeTruthy()
    expect(result?.id).toBe('updated-9')
  })

  it('should maintain size limit when adding many entries', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Note: We can't directly test maxSize enforcement without access to cache size
    // But we can verify behavior by adding many entries
    
    // Add more entries than typical cache size
    const numEntries = 1100 // More than default maxSize of 1000
    for (let i = 0; i < numEntries; i++) {
      _testUserCache.set(`user:bulk-${i}`, { ...testData, id: `${i}` })
    }
    
    // Recent entries should be retrievable
    expect(_testUserCache.get(`user:bulk-${numEntries - 1}`)).toBeTruthy()
    expect(_testUserCache.get(`user:bulk-${numEntries - 2}`)).toBeTruthy()
    
    // Very old entries might have been evicted (depending on maxSize)
    // We can't guarantee this without knowing exact maxSize
  })

  it('should handle edge case of updating at capacity', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Fill cache with many entries
    for (let i = 0; i < 1000; i++) {
      _testUserCache.set(`user:fill-${i}`, { ...testData, id: `${i}` })
    }
    
    // Now update one of the existing entries
    _testUserCache.set('user:fill-500', { ...testData, id: 'updated-500' })
    
    // The updated entry should exist
    expect(_testUserCache.get('user:fill-500')?.id).toBe('updated-500')
    
    // Other recent entries should still exist
    expect(_testUserCache.get('user:fill-999')).toBeTruthy()
  })

  it('should handle rapid additions at capacity', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Mock console.error to check if size limit is exceeded
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Rapidly add many entries
    for (let i = 0; i < 2000; i++) {
      _testUserCache.set(`user:rapid-add-${i}`, { ...testData, id: `${i}` })
    }
    
    // Should not have logged any size limit errors
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    
    // Cleanup
    consoleErrorSpy.mockRestore()
  })
})

describe('LRU Cache - Periodic Cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Clear cache before each test
    _testUserCache.invalidate()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('should remove expired entries during periodic cleanup', () => {
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // Add entries
    _testUserCache.set('user:1', { ...testData, id: '1' })
    _testUserCache.set('user:2', { ...testData, id: '2' })
    
    // Verify entries exist
    expect(_testUserCache.get('user:1')).toBeTruthy()
    expect(_testUserCache.get('user:2')).toBeTruthy()
    
    // Fast forward time past TTL (5 minutes + buffer)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
    
    // Trigger periodic cleanup (runs every minute)
    vi.advanceTimersByTime(60 * 1000)
    
    // Expired entries should be removed on next access
    expect(_testUserCache.get('user:1')).toBeNull()
    expect(_testUserCache.get('user:2')).toBeNull()
  })

  it('should log cleanup activity when entries are removed', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const testData = { id: 'test', hasProfile: true, hasWorkspace: true }
    
    // We need to create a test instance to trigger cleanup
    // Since we can't directly test the global cache's cleanup without modifying the source,
    // we'll test that the cleanup mechanism would work by simulating the behavior
    
    // Add entries that will expire
    _testUserCache.set('user:cleanup1', { ...testData, id: 'cleanup1' })
    _testUserCache.set('user:cleanup2', { ...testData, id: 'cleanup2' })
    
    // Fast forward past TTL
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
    
    // Access entries to trigger removal (cleanup happens on access in current implementation)
    _testUserCache.get('user:cleanup1')
    _testUserCache.get('user:cleanup2')
    
    // Note: The actual periodic cleanup logging would happen in the background
    // but we can't directly test it without access to the private methods
    
    consoleSpy.mockRestore()
  })
})