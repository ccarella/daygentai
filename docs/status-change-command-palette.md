# Status Change via Command Palette

This feature allows users to quickly change the status of an issue while on the issue details page using the command palette.

## How to Use

### Via Command Palette (⌘K)
1. Navigate to any issue details page
2. Open the command palette with `⌘K` (Mac) or `Ctrl+K` (Windows/Linux)
3. The first options shown will be status change commands (if applicable)
4. Select or search for:
   - "Change Status to Todo"
   - "Change Status to In Progress"
   - "Change Status to In Review"
   - "Change Status to Done"
5. Press Enter to apply the status change

### Via Keyboard Shortcuts
While on an issue details page, you can use sequential shortcuts:
- `S` then `T` - Change status to Todo
- `S` then `P` - Change status to In Progress
- `S` then `R` - Change status to In Review
- `S` then `D` - Change status to Done

## Implementation Details

The feature is implemented across several components:

1. **Command Palette** (`/components/command-palette/command-palette.tsx`)
   - Detects when on an issue page via `currentIssue` prop
   - Dynamically adds status change commands to the command list
   - Shows only status options different from current status

2. **Issue Details Page** (`/app/[slug]/issue/[id]/page.tsx`)
   - Fetches current issue data
   - Passes issue context to command palette
   - Handles status change callbacks

3. **Global Shortcuts** (`/hooks/use-global-shortcuts.tsx`)
   - Registers sequential keyboard shortcuts (S then T/P/R/D)
   - Handles direct status updates via Supabase

4. **UI Updates**
   - Command palette shows "Issue Actions" group at the top when on issue page
   - Help modal (?) displays status shortcuts when applicable
   - Status changes are immediate with no page reload required

## Benefits

- **Speed**: Change status without using mouse or navigating menus
- **Context-aware**: Only shows relevant status options
- **Consistent**: Uses same keyboard shortcut patterns as other features
- **Accessible**: Works via both command palette search and direct shortcuts