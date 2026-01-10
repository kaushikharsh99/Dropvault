# DropVault

DropVault is a unified knowledge management system that combines a modern web interface with a browser extension for seamless content capture.

## Project Structure

This repository contains two main components:

- **`dropvault-website/`**: The main web application (React + Vite + FastAPI Backend).
- **`dropvault-extension/`**: A browser extension (Chrome/Edge) to quickly save links and content to your vault.

## Setup & Installation

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- Firebase Project

### 1. Environment Configuration

This project uses Firebase for authentication and storage. You need to set up your environment variables.

1.  Navigate to `dropvault-website` and copy the example env file:
    ```bash
    cd dropvault-website
    cp .env.example .env
    ```
2.  Fill in your Firebase credentials in `.env`.

3.  Do the same for the extension:
    ```bash
    cd ../dropvault-extension
    cp .env.example .env
    ```

### 2. Install Dependencies

**Website (Frontend & Backend):**
```bash
cd dropvault-website
npm install
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Extension:**
```bash
cd dropvault-extension
npm install
npm run build
```

## Running the Application

To start the full system (Website Frontend + Python Backend):

```bash
cd dropvault-website
python3 start_app.py
```

This will launch:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

## Loading the Extension

1.  Build the extension: `cd dropvault-extension && npm run build`
2.  Open Chrome/Edge and go to `chrome://extensions`.
3.  Enable "Developer mode".
4.  Click "Load unpacked" and select the `dropvault-extension/dist` folder.

## License

MIT
