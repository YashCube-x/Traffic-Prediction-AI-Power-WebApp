#!/usr/bin/env python3
"""
TrafficVision AI — Unified Full-Stack Launcher (Python)
Starts Node.js Express Backend, Python FastAPI AI Core, and React Vite Frontend.
"""

import os
import sys
import subprocess
import signal
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
processes = []

def signal_handler(sig, frame):
    print("\n🛑 Shutdown signal received. Stopping TrafficVision AI servers...")
    for proc in processes:
        try:
            proc.terminate()
        except Exception:
            pass
    print("✅ All servers stopped successfully.")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def main():
    print("==========================================================")
    print("🚀 Starting TrafficVision AI Platform (Backend + Frontend)")
    print("==========================================================")

    # 1. Start Express Backend
    backend_dir = os.path.join(ROOT_DIR, "backend")
    frontend_dir = os.path.join(ROOT_DIR, "frontend")

    print("⚡ Starting Node.js Express Gateway (Port 2001)...")
    express_proc = subprocess.Popen(["npm", "start"], cwd=backend_dir)
    processes.append(express_proc)

    # 2. Check if uvicorn is installed to start FastAPI
    try:
        import uvicorn
        print("🐍 Starting Python FastAPI AI Core Engine (Port 8000)...")
        fastapi_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
            cwd=backend_dir
        )
        processes.append(fastapi_proc)
    except ImportError:
        print("ℹ️  uvicorn not found; running with Node.js Express gateway.")

    # 3. Start React Frontend
    print("🎨 Starting React Frontend Dashboard (Port 5173)...")
    frontend_proc = subprocess.Popen(["npm", "run", "dev"], cwd=frontend_dir)
    processes.append(frontend_proc)

    print("\n==========================================================")
    print("✨ TrafficVision AI is running!")
    print("🌐 Frontend Dashboard:  http://localhost:5173")
    print("🔌 Express API Gateway: http://localhost:2001")
    print("🐍 FastAPI AI Docs:     http://localhost:8000/docs (if active)")
    print("Press Ctrl+C to stop all servers.")
    print("==========================================================")

    for proc in processes:
        proc.wait()

if __name__ == "__main__":
    main()
