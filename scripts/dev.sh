#!/bin/bash

# BasePillar Development Script
# Run the full stack locally with hot reload

set -e

echo "🚀 Starting BasePillar Development Environment"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is not installed. Please install it first:"
  echo "   npm install -g pnpm"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Start PostgreSQL with docker if not running
if ! docker ps | grep -q basepillar-postgres; then
  echo "🐘 Starting PostgreSQL..."
  docker run -d \
    --name basepillar-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=basepillar \
    -p 5432:5432 \
    postgres:16-alpine
  
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 5
fi

# Run database migrations
echo "🔄 Running database migrations..."
pnpm db:push || true

# Start development servers
echo ""
echo "🎉 Starting development servers..."
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo "   API Docs: http://localhost:3000/docs"
echo ""

pnpm dev
