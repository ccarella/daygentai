#!/bin/bash
# terragon-setup.sh - Custom setup script for your Terragon environment
# This script runs when your sandbox environment starts

# Example: Install dependencies
# npm install

# Example: Run database migrations
# npm run db:migrate

# Example: Set up environment
# cp .env.example .env

echo "Setup complete!"
#!/bin/bash
# terragon-setup.sh - Daygent setup script

echo "🚀 Starting Daygent setup for Terragon environment..."

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Run type checking
echo ""
echo "🔍 Running type check..."
npm run type-check || echo "⚠️ TypeScript errors detected - please fix before deploying"

# Run linting
echo ""
echo "🧹 Running linter..."
npm run lint || echo "⚠️ Linting warnings detected - consider fixing for code quality"

echo ""
echo "✅ Setup complete!"
