#!/usr/bin/env node

/**
 * Test script to demonstrate file upload handling with different sizes
 * This script tests the file upload routes with various file types and sizes
 */

const baseUrl = 'http://localhost:3000'
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

// Create test files in memory
function createTestFile(name, sizeInBytes, mimeType) {
  const buffer = Buffer.alloc(sizeInBytes, 'a') // Fill with 'a' characters
  return {
    name,
    buffer,
    mimeType,
    size: sizeInBytes
  }
}

async function testFileUploads() {
  console.log('🧪 Testing File Upload Handling with Different Sizes\n')
  
  // Test 1: Valid avatar upload (small image)
  console.log('1. Testing Valid Avatar Upload (1MB PNG)...')
  try {
    const form = new FormData()
    const file = createTestFile('avatar.png', 1024 * 1024, 'image/png') // 1MB
    form.append('avatar', file.buffer, {
      filename: file.name,
      contentType: file.mimeType
    })
    
    const response = await fetch(`${baseUrl}/api/upload/avatar`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    if (response.status === 401) {
      console.log(`   Result: ${result.error} (Expected - no auth)`)
      console.log(`   Code: ${result.code}`)
    } else {
      console.log(`   Result: ${JSON.stringify(result, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 2: Oversized avatar upload
  console.log('2. Testing Oversized Avatar Upload (6MB - exceeds 5MB limit)...')
  try {
    const form = new FormData()
    const file = createTestFile('large-avatar.png', 6 * 1024 * 1024, 'image/png') // 6MB
    form.append('avatar', file.buffer, {
      filename: file.name,
      contentType: file.mimeType
    })
    
    const response = await fetch(`${baseUrl}/api/upload/avatar`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 3: Invalid file type for avatar
  console.log('3. Testing Invalid File Type for Avatar (PDF instead of image)...')
  try {
    const form = new FormData()
    const file = createTestFile('document.pdf', 1024 * 1024, 'application/pdf') // 1MB PDF
    form.append('avatar', file.buffer, {
      filename: file.name,
      contentType: file.mimeType
    })
    
    const response = await fetch(`${baseUrl}/api/upload/avatar`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 4: Valid document upload
  console.log('4. Testing Valid Document Upload (5MB PDF)...')
  try {
    const form = new FormData()
    const file = createTestFile('report.pdf', 5 * 1024 * 1024, 'application/pdf') // 5MB
    form.append('document', file.buffer, {
      filename: file.name,
      contentType: file.mimeType
    })
    form.append('workspaceId', 'test-workspace-123')
    
    const response = await fetch(`${baseUrl}/api/upload/document`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    if (response.status === 401) {
      console.log(`   Result: ${result.error} (Expected - no auth)`)
      console.log(`   Code: ${result.code}`)
    } else {
      console.log(`   Result: ${JSON.stringify(result, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 5: Oversized document upload
  console.log('5. Testing Oversized Document Upload (11MB - exceeds 10MB limit)...')
  try {
    const form = new FormData()
    const file = createTestFile('huge-report.pdf', 11 * 1024 * 1024, 'application/pdf') // 11MB
    form.append('document', file.buffer, {
      filename: file.name,
      contentType: file.mimeType
    })
    form.append('workspaceId', 'test-workspace-123')
    
    const response = await fetch(`${baseUrl}/api/upload/document`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }
  
  console.log('')
  
  // Test 6: Missing workspace ID for document
  console.log('6. Testing Document Upload Without Workspace ID...')
  try {
    const form = new FormData()
    const file = createTestFile('report.pdf', 1024 * 1024, 'application/pdf') // 1MB
    form.append('document', file.buffer, {
      filename: file.name,
      contentType: file.mimeType
    })
    // Intentionally not adding workspaceId
    
    const response = await fetch(`${baseUrl}/api/upload/document`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    
    const result = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Error: ${result.error}`)
    console.log(`   Code: ${result.code}`)
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`)
  }
  
  console.log('\n✅ File upload tests completed!')
  console.log('\n📋 Expected Results:')
  console.log('   - Test 1: 401 UNAUTHORIZED (no auth token)')
  console.log('   - Test 2: 413 PAYLOAD_TOO_LARGE (exceeds 5MB avatar limit)')
  console.log('   - Test 3: 400 VALIDATION_ERROR (PDF not allowed for avatar)')
  console.log('   - Test 4: 401 UNAUTHORIZED (no auth token)')
  console.log('   - Test 5: 413 PAYLOAD_TOO_LARGE (exceeds 10MB document limit)')
  console.log('   - Test 6: 400 VALIDATION_ERROR (missing workspace ID)')
}

// Check if FormData is available
try {
  const FormData = require('form-data')
} catch (error) {
  console.error('Error: form-data package is required. Install it with: npm install form-data')
  process.exit(1)
}

// Check if we're running this script directly
if (require.main === module) {
  testFileUploads().catch(console.error)
}

module.exports = { testFileUploads }