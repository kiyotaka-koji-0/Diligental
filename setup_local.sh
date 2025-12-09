#!/bin/bash
set -e

echo "Setting up Backend with uv..."
cd backend
if ! command -v uv &> /dev/null; then
    echo "uv not found. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
    uv venv
fi

# Install dependencies
uv pip install -r requirements.txt
echo "Backend dependencies installed with uv."
cd ..

echo "Setting up Frontend..."
cd frontend
npm install
echo "Frontend dependencies installed."
cd ..

echo "---------------------------------------------------"
echo "Setup Complete!"
echo "Please ensure you have:"
echo "1. Started Redis on localhost:6379"
echo "2. Started Postgres on localhost:5432"
echo "3. Created a database named 'diligental'"
echo "4. Updated backend/.env with your Postgres credentials"
