# Debugging Status Commands

## Current Implementation Status

The status change commands feature has been implemented with the following components:

1. **CommandPalette Component** - Updated to accept `currentIssue` and `onIssueStatusChange` props
2. **Issue Details Page** - Fetches issue data and passes it to CommandPalette
3. **Global Shortcuts Hook** - Handles sequential keyboard shortcuts (S then T/P/R/D)

## Debug Steps

To debug the issue, check the browser console for the following logs:

1. **On Issue Page Load:**
   - `Fetched issue for command palette: {id, title, status}`
   - `CommandPalette mounted/updated - currentIssue: {issue data}`
   - `CommandPalette - onIssueStatusChange defined: true/false`

2. **When Opening Command Palette:**
   - `Current issue status: [status value]`
   - `Adding status option: [label] for status: [value]`
   - `Total commands generated: [number]`
   - `Commands by group: {group names and counts}`

3. **When Using Keyboard Shortcuts:**
   - `Key sequence detected: [sequence]`
   - `Attempting status change: {currentIssue, newStatus}`
   - `Status changed successfully to: [status]`

## Common Issues to Check

1. **Issue data not loading:** Check if `currentIssue` is null in console logs
2. **Status value mismatch:** Verify the status value matches expected values (todo, in_progress, in_review, done)
3. **Multiple CommandPalette instances:** Ensure only one CommandPalette is rendered per page
4. **Provider conflicts:** Check for nested CommandPaletteProvider components

## Next Steps

1. Open browser developer tools
2. Navigate to an issue details page
3. Check console logs for the debug messages
4. Open command palette (⌘K) and check if "Issue Actions" group appears
5. Try keyboard shortcuts (S then T/P/R/D) and check console for key sequence logs