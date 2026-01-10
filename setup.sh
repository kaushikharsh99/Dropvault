#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting DropVault Dependency Installation..."

# --- 1. Website Frontend ---
echo "------------------------------------------------"
echo "📦 Installing Website Frontend Dependencies..."
echo "------------------------------------------------"
cd dropvault-website
npm install

# --- 2. Website Backend ---
echo "------------------------------------------------"
echo "🐍 Setting up Backend Virtual Environment..."
echo "------------------------------------------------"
cd backend

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created."
else
    echo "ℹ️  Virtual environment already exists."
fi

echo "⬇️ Installing Backend Python Dependencies (This may take a few minutes)..."
# Using robust flags for large packages like PyTorch
./venv/bin/pip install --upgrade pip
./venv/bin/pip install --no-cache-dir --retries 10 --timeout 300 -r requirements.txt

cd ../.. # Go back to project root

# --- 3. Extension ---
echo "------------------------------------------------"
echo "🧩 Installing Extension Dependencies..."
echo "------------------------------------------------"
cd dropvault-extension
npm install
npm run build # Build the extension so it's ready to load

cd .. # Back to root

echo "------------------------------------------------"
echo "✅ All dependencies installed successfully!"
echo "------------------------------------------------"
echo "👉 To start the application:"
echo "   cd dropvault-website"
echo "   python3 start_app.py"
