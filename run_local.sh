#!/bin/bash
# Helper script to run both backend and frontend locally

echo "Starting Backend (http://localhost:8001)..."
gnome-terminal -- bash -c "cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001; exec bash" &

echo "Starting Frontend (http://localhost:3000)..."
gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash" &

echo "Services starting in separate terminals..."
