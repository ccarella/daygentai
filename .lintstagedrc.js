module.exports = {
  // Lint JavaScript/TypeScript files
  '*.{js,jsx,ts,tsx}': ['next lint --fix --file'],
  
  // Type check only the changed TypeScript files
  '*.{ts,tsx}': () => 'npm run type-check',
  
  // Run tests related to changed files
  '*.{js,jsx,ts,tsx}': ['vitest related --run']
}