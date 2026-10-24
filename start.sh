#!/usr/bin/env bash
# TrustVault Full-Stack Development Startup Script (Bash)
set -e

echo "=========================================================="
echo "       TRUSTVAULT: Secure Document Sharing Enclave        "
echo "=========================================================="

echo "[1/3] Initializing database and cryptographic keys..."
python backend/app/seed.py

echo "[2/3] Starting FastAPI Backend on http://127.0.0.1:8000..."
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

trap "echo 'Terminating servers...'; kill $BACKEND_PID" EXIT

echo "[3/3] Starting Next.js Frontend on http://localhost:3000..."
cd frontend
npm run dev
