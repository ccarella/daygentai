# Manual Timeout Memory Leak Testing Guide

## Quick Test Checklist

### 1. Profile Settings Timeout Test
- [ ] Open settings, save changes 10 times rapidly
- [ ] Save and navigate away before success message disappears (x5)
- [ ] Check console for errors
- [ ] Memory snapshot comparison

### 2. Header Dropdown Timeout Test  
- [ ] Click avatar → Profile Settings → Click avatar again (x10)
- [ ] Open dropdown and navigate away immediately (x5)
- [ ] Rapid open/close dropdown (x20)
- [ ] Check for duplicate navigations

### 3. Prompt Copy Timeout Test
- [ ] Copy prompt rapidly 10 times
- [ ] Copy and close modal immediately (x5)
- [ ] Copy and navigate away (x5)
- [ ] Verify only one checkmark shows at a time

### 4. Issues List Preload Timeout Test
- [ ] Change filters rapidly (All → High Priority → Bug → All) x5
- [ ] Navigate away during loading (x5)
- [ ] Apply search and clear rapidly (x10)
- [ ] Check Network tab for duplicate requests

### 5. Edit Modal Submit Timeout Test
- [ ] Save and close modal immediately (x10)
- [ ] Save multiple times rapidly
- [ ] Save and press Escape key
- [ ] Verify submit button re-enables properly

## Memory Profiling Steps

### Chrome DevTools Method:
1. Open Chrome DevTools (F12)
2. Go to Memory tab
3. Select "Heap snapshot" 
4. Click "Take snapshot" (baseline)
5. Perform test actions 20-30 times
6. Force garbage collection (trash icon)
7. Take another snapshot
8. Compare snapshots:
   - Click snapshot 2
   - Change view to "Comparison"
   - Sort by "Retained Size"
   - Search for: Timer, Timeout, setTimeout

### Performance Monitor Method:
1. Open DevTools → More tools → Performance monitor
2. Check "JS heap size"
3. Perform actions repeatedly
4. Watch for:
   - Continuously increasing heap size
   - Heap size not returning to baseline
   - Sudden spikes that don't recover

## Expected Results

### ✅ PASS Indicators:
- Memory returns to near baseline after GC
- No retained Timer objects in comparison
- No console errors/warnings
- Smooth UI performance

### ❌ FAIL Indicators:
- Growing Timer count in snapshots
- Heap size increases permanently
- Console errors about state updates
- UI becomes sluggish over time

## Automated Memory Test (Terminal)

```bash
# Run memory leak detection tests
npm test -- test/__tests__/components/timeout-cleanup.test.tsx

# Run with memory reporting (if configured)
NODE_OPTIONS="--expose-gc" npm test -- --reporter=memory-leak-reporter
```

## Browser Console Tests

```javascript
// Test 1: Profile Settings Memory Test
(async () => {
  const iterations = 50;
  const saveButton = document.querySelector('button:contains("Save Changes")');
  
  console.time('Profile Save Test');
  for (let i = 0; i < iterations; i++) {
    saveButton.click();
    await new Promise(r => setTimeout(r, 100));
  }
  console.timeEnd('Profile Save Test');
  
  // Check for active timers
  console.log('Active timers:', performance.memory);
})();

// Test 2: Monitor setTimeout calls
const originalSetTimeout = window.setTimeout;
let activeTimeouts = 0;

window.setTimeout = function(...args) {
  activeTimeouts++;
  console.log(`Active timeouts: ${activeTimeouts}`);
  const id = originalSetTimeout.apply(this, args);
  
  const originalClearTimeout = window.clearTimeout;
  window.clearTimeout = function(timeoutId) {
    if (timeoutId === id) {
      activeTimeouts--;
      console.log(`Active timeouts: ${activeTimeouts}`);
    }
    return originalClearTimeout.apply(this, arguments);
  };
  
  return id;
};
```

## Reporting Issues

If you find a memory leak:

1. **Document the steps** to reproduce
2. **Take screenshots** of memory snapshots
3. **Note the component** and action
4. **Record memory growth** (before/after)
5. **Check console** for errors

### Issue Template:
```
Component: [Component Name]
Action: [What triggers the timeout]
Memory Growth: [X MB over Y actions]
Console Errors: [Any errors]
Steps to Reproduce:
1. 
2. 
3.
```