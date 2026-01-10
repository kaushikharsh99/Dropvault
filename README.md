# DropVault 🧠🔐

**Your AI-Powered, Private Second Brain.**

DropVault is a unified knowledge management system designed to capture, organize, and retrieve your digital life. It combines a seamless browser extension for instant capturing with a powerful, AI-driven local web dashboard for management and semantic search.

## ✨ Key Features

- **🚀 Universal Capture:** Instantly save links, articles, images, and notes from anywhere on the web using the browser extension.
- **🤖 AI-Powered Search:** Don't just search for keywords. DropVault uses **semantic vector search** (via local embeddings) to find content based on *meaning* and context.
- **📄 Smart Extraction:**
    - **OCR:** Automatically extracts text from uploaded images.
    - **PDF Parsing:** Index and search through the content of your PDF documents.
    - **Auto-Tagging:** AI analyzes content to suggest relevant tags automatically.
- **🔒 Privacy First:** Your data logic and AI models run **locally** on your machine. We use Firebase only for secure authentication and file storage synchronization.
- **⚡ Modern Stack:** Built with React (Vite), Python (FastAPI + PyTorch), and Chrome Extension APIs.

## 📂 Project Structure

- **`dropvault-website/`**: The main application.
  - **Frontend:** React + TailwindCSS + ShadcnUI.
  - **Backend:** Python FastAPI server handling AI models, OCR, and database logic.
- **`dropvault-extension/`**: A Chromium-based browser extension to interact with the Vault from any tab.

---

## 🚀 Quick Start

### ⚠️ Important: API Keys & Credentials
This project requires a **Firebase project** for authentication and storage. **You must provide your own API keys and Client IDs.** These are not included in the repository for security reasons.
1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password & Google) and **Firestore/Storage**.
3. Register a **Web App** to get your configuration keys.

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Firebase Project**

### 🛠 System Dependencies (Required for OCR)
For the Image-to-Text (OCR) features to work, you must have **Tesseract OCR** installed on your system:
- **Ubuntu/Debian:** `sudo apt install tesseract-ocr`
- **macOS:** `brew install tesseract`
- **Windows:** Download the installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki).

### 1. Configure Environment
You need to paste your own Firebase configuration values into the `.env` files.

1.  **Website:**
    ```bash
    cd dropvault-website
    cp .env.example .env
    # Open .env and paste your Firebase credentials
    ```
2.  **Extension:**
    ```bash
    cd ../dropvault-extension
    cp .env.example .env
    # Open .env and paste your Firebase credentials
    ```

### 2. One-Click Installation (Recommended)

We've provided a script to automatically install all frontend and backend dependencies, set up the virtual environment, and build the extension.

```bash
# From the project root
chmod +x setup.sh
./setup.sh
```

*(This may take a few minutes as it installs large AI libraries like PyTorch)*

### 3. Run the System

Launch the full application (Frontend + AI Backend) with a single command:

```bash
cd dropvault-website
python3 start_app.py
```

- **Frontend:** `http://localhost:5173`
- **Backend:** `http://localhost:8000`

---

## 🧩 Installing the Browser Extension

Once the setup is complete, you can load the extension into Chrome, Edge, or Brave:

1.  Open your browser and navigate to `chrome://extensions`.
2.  Toggle **"Developer mode"** (top right).
3.  Click **"Load unpacked"**.
4.  Select the **`dropvault-extension/dist`** folder.

---

## 🛠 Manual Setup (Advanced)

If you prefer to install dependencies manually:

<details>
<summary>Click to expand manual instructions</summary>

**1. Website Frontend**
```bash
cd dropvault-website
npm install
```

**2. Python Backend**
```bash
cd dropvault-website/backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**3. Extension**
```bash
cd dropvault-extension
npm install
npm run build
```
</details>