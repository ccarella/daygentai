// Test script to verify AJAX-like navigation
// Run this in the browser console to test the navigation

// Test navigating to an issue without page refresh
function testIssueNavigation() {
  console.log('Current URL:', window.location.pathname);
  
  // Listen for URL changes
  const originalPushState = window.history.pushState;
  window.history.pushState = function(...args) {
    console.log('URL changed to:', args[2]);
    originalPushState.apply(window.history, args);
  };
  
  // Test clicking on an issue in the list
  const issueRows = document.querySelectorAll('[role="row"]');
  if (issueRows.length > 1) {
    console.log('Found', issueRows.length - 1, 'issues');
    console.log('Clicking on first issue...');
    issueRows[1].click();
    
    setTimeout(() => {
      console.log('New URL:', window.location.pathname);
      console.log('Page reloaded?', performance.navigation.type === 1 ? 'Yes' : 'No');
    }, 1000);
  } else {
    console.log('No issues found in the list');
  }
}

// Test keyboard shortcut navigation
function testKeyboardNavigation() {
  console.log('Testing keyboard shortcut "G then I"...');
  
  // Simulate 'G' key press
  const gEvent = new KeyboardEvent('keydown', { key: 'g', code: 'KeyG' });
  window.dispatchEvent(gEvent);
  
  // Simulate 'I' key press after a short delay
  setTimeout(() => {
    const iEvent = new KeyboardEvent('keydown', { key: 'i', code: 'KeyI' });
    window.dispatchEvent(iEvent);
    
    console.log('Navigation triggered');
    console.log('Current URL:', window.location.pathname);
  }, 100);
}

// Test command palette navigation
function testCommandPaletteNavigation() {
  console.log('Opening command palette...');
  
  // Open command palette (Cmd+K)
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    code: 'KeyK',
    metaKey: true
  });
  window.dispatchEvent(event);
  
  setTimeout(() => {
    // Type "go to issues"
    const input = document.querySelector('input[placeholder="Type a command or search..."]');
    if (input) {
      input.value = 'go to issues';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      setTimeout(() => {
        // Press Enter to execute
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter'
        });
        input.dispatchEvent(enterEvent);
        
        console.log('Command executed');
        console.log('Current URL:', window.location.pathname);
      }, 500);
    } else {
      console.log('Command palette input not found');
    }
  }, 500);
}

console.log('AJAX Navigation Test Functions Loaded');
console.log('Available functions:');
console.log('- testIssueNavigation()');
console.log('- testKeyboardNavigation()');
console.log('- testCommandPaletteNavigation()');