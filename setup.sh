#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting DropVault Dependency Installation..."

# --- 1. Environment Configuration ---
echo "⚙️  Setting up environment files..."
if [ ! -f "dropvault-website/.env" ]; then
    cp dropvault-website/.env.example dropvault-website/.env
    echo "✅ Created dropvault-website/.env (Remember to add your keys!)"
fi

if [ ! -f "dropvault-extension/.env" ]; then
    cp dropvault-extension/.env.example dropvault-extension/.env
    echo "✅ Created dropvault-extension/.env (Remember to add your keys!)"
fi

# --- 2. Website Frontend ---
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

echo "🎭 Installing Playwright Browsers..."
./venv/bin/playwright install chromium

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
