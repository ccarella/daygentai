#!/usr/bin/env node

/**
 * Test script to demonstrate enhanced error handling and body size limits
 * This script tests the API routes with various error conditions
 */

const baseUrl = 'http://localhost:3000'

async function testErrorHandling() {
  console.log('🧪 Testing Enhanced Error Handling & Body Size Limits\n')
  
  // Test 1: Body size limit violation
  console.log('1. Testing Payload Too Large (413) error...')
  try {
    const largePayload = {
      title: 'A'.repeat(500000), // 500KB title
      description: 'B'.repeat(500000), // 500KB description  
      workspaceId: 'test-workspace-id'
    }
    
    const response = await fetch(`${baseUrl}/api/generate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largePayload)
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Network error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 2: Missing required fields (400)
  console.log('2. Testing Validation Error (400)...')
  try {
    const response = await fetch(`${baseUrl}/api/generate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }) // Missing description and workspaceId
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Network error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 3: Unauthorized request (401)
  console.log('3. Testing Unauthorized Error (401)...')
  try {
    const response = await fetch(`${baseUrl}/api/search/issues?workspace_id=test`)
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Network error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 4: Missing required query parameter (400)
  console.log('4. Testing Missing Query Parameter (400)...')
  try {
    const response = await fetch(`${baseUrl}/api/search/issues`) // Missing workspace_id
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Network error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 5: Valid small request (should work)
  console.log('5. Testing Valid Small Request...')
  try {
    const response = await fetch(`${baseUrl}/api/workspace/has-api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'test-id' })
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    if (response.status === 401) {
      console.log(`   Error: ${result.error} (Expected - no auth)`)
      console.log(`   Code: ${result.code}`)
    } else {
      console.log(`   Success: ${JSON.stringify(result)}`)
    }
  } catch (error) {
    console.log(`   Network error: ${error.message}`)
  }
  
  console.log('\n✅ Error handling tests completed!')
  console.log('\n📋 Expected Results:')
  console.log('   - Test 1: Should return 413 with PAYLOAD_TOO_LARGE code')
  console.log('   - Test 2: Should return 400 with VALIDATION_ERROR code')
  console.log('   - Test 3: Should return 401 with UNAUTHORIZED code')
  console.log('   - Test 4: Should return 400 with VALIDATION_ERROR code')
  console.log('   - Test 5: Should return 401 with UNAUTHORIZED code (expected)')
}

// Check if we're running this script directly
if (require.main === module) {
  testErrorHandling().catch(console.error)
}

module.exports = { testErrorHandling }