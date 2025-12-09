@echo off
REM LeftUber Backend - Start Script (Windows)
echo 🚀 Starting LeftUber Backend...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Initialize database if not exists
if not exist "prisma\dev.db" (
    echo 🗄️ Initializing database...
    call npx prisma db push
)

REM Start the server
echo ✅ Starting server on port 3000...
call npm run dev
