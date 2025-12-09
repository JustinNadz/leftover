#!/bin/bash

# LeftUber Backend - Start Script
echo "🚀 Starting LeftUber Backend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Initialize database if not exists
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️ Initializing database..."
    npx prisma db push
fi

# Start the server
echo "✅ Starting server on port 3000..."
npm run dev
