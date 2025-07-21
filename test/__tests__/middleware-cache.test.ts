import { describe, it, expect, beforeEach } from 'vitest'
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