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