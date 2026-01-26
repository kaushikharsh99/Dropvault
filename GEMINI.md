# DropVault GEMINI.md Context

## Project Overview
DropVault is an AI-powered, private personal knowledge vault designed to capture, organize, and retrieve digital information (notes, links, images, PDFs, videos) using local AI models. It consists of three primary components:
1.  **DropVault Website**: The main dashboard for managing and searching your vault.
2.  **DropVault Backend**: A FastAPI server handling local AI inference (OCR, Vision, Transcription, Embeddings) and SQLite storage.
3.  **DropVault Extension**: A Chrome extension for instant capturing of web content.

### Core Architecture
- **Frontend**: React (Vite), Tailwind CSS, Radix UI (Shadcn), Framer Motion, GSAP (interactivity), React Bootstrap.
- **Backend**: Python (FastAPI), PyTorch, SQLite (metadata & vector storage).
- **AI Engine**: 
    - **Vision**: BLIP (captions) & OWL-ViT (object detection).
    - **Audio/Video**: OpenAI Whisper (transcription).
    - **OCR**: Tesseract OCR.
    - **Search**: Multi-stage pipeline using Sentence Transformers (`all-MiniLM-L6-v2`), semantic chunking, weighted scoring, reranking, and query expansion.
- **Infrastructure**: Firebase (Authentication, Firestore, Storage).

## Building and Running

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Tesseract OCR (installed on system)
- Firebase Project (keys configured in `.env`)

### Key Commands
- **Full System Install**: Run `./setup.sh` from the project root.
- **Start All Services**: `cd dropvault-website && python3 start_app.py`.
- **Run Website Dev Server**: `cd dropvault-website && npm run dev`.
- **Run Backend Server**: `cd dropvault-website && ./backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000`.
- **Build Chrome Extension**: `cd dropvault-extension && npm run build`.

## Search & Storage Logic
DropVault uses a high-precision search architecture:
1.  **Semantic Chunking**: Files are broken into modality-specific chunks (OCR, Vision, Transcript).
2.  **Weighted Scoring**: Visual data gets higher priority boosts (1.5x) over transcripts (0.7x).
3.  **Two-Stage Retrieval**: Vector-based recall (top 60 chunks) followed by lightweight reranking (keyword overlap, modality hints, recency boost).
4.  **Query Expansion**: Synonyms are injected into user queries before embedding.
5.  **Personal Relevance**: System tracks item access counts and builds a user profile vector to bias search towards frequent interests.

## Development Conventions
- **UI/UX**: Mimic "Apple-style" product landing pages with sticky scroll animations and glassmorphism.
- **Styling**: Tailwind CSS for layout, custom CSS variables in `index.css` for theme colors.
- **Interactivity**: Use Framer Motion for scroll-driven "scrollytelling" and GSAP for high-performance physics effects (like DotGrid).
- **Theme**: Automatic dark/light mode detection via `ThemeContext.jsx`.
- **Backend Modularity**: AI logic is separated into `ai.py`, `vision.py`, `media_utils.py`, and `worker.py`.
- **Data Integrity**: SQLite database (`dropvault.db`) handles the vector chunking and user profiles locally.
