// Test file with linting issues
import React from 'react'

export function TestComponent() {
  const unused = "This variable is never used";
  console.log("Using console.log")
  
  return <div>Test</div>
}