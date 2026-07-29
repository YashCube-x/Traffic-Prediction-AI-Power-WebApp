#!/bin/bash

# TrafficVision AI — Full Stack Launcher Script
# Starts Express Backend, Python FastAPI (if available), and React Vite Frontend concurrently.

echo "=========================================================="
echo "🚀 Starting TrafficVision AI Platform (Backend + Frontend)"
echo "=========================================================="

# Function to handle cleanup on exit (Ctrl+C)
cleanup() {
  echo ""
  echo "🛑 Stopping TrafficVision AI servers..."
  kill $(jobs -p) 2>/dev/null
  echo "✅ All servers stopped successfully."
  exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Start Node.js Express Backend API Gateway (Port 2001)
echo "⚡ Starting Express Backend API Gateway on http://localhost:2001 ..."
(cd "$ROOT_DIR/backend" && npm start) &
EXPRESS_PID=$!

# 2. Check and start Python FastAPI Core AI Backend (Port 8000) if uvicorn is installed
PYTHON_BIN="$ROOT_DIR/backend/venv/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

if "$PYTHON_BIN" -c "import uvicorn" 2>/dev/null; then
  echo "🐍 Starting Python FastAPI Core AI Service on http://localhost:8000 ..."
  (cd "$ROOT_DIR/backend" && "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
  FASTAPI_PID=$!
else
  echo "ℹ️  FastAPI uvicorn not detected in environment. Express Gateway fallback active."
fi

# 3. Start React.js Frontend Dashboard (Vite Port 5173)
echo "🎨 Starting React Frontend Dashboard on http://localhost:5173 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "✨ TrafficVision AI is running!"
echo "🌐 Frontend Dashboard:  http://localhost:5173"
echo "🔌 Express API Gateway: http://localhost:2001"
echo "🐍 FastAPI AI Docs:     http://localhost:8000/docs (if active)"
echo "Press Ctrl+C to stop all servers."
echo "=========================================================="

# Wait for background jobs
wait
