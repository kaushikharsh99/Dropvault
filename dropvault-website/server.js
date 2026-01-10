import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const natural = require('natural');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 1. Setup Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const uploadDir = path.join(__dirname, 'uploads', userId);
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 2. Middleware
app.use(cors());
app.use(express.json()); // Enable JSON body parsing
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- INTELLIGENCE LAYER (Phase 2) ---

const extractKeywords = (text) => {
    if (!text) return [];
    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(text.toLowerCase());
    const stopwords = ['the', 'is', 'in', 'and', 'to', 'of', 'a', 'for', 'it', 'on', 'with', 'as', 'this', 'that', 'are', 'was', 'be', 'at', 'or', 'by', 'an', 'from', 'not', 'if', 'but', 'can', 'will', 'my', 'your', 'we', 'they', 'he', 'she', 'https', 'http', 'com', 'www'];
    
    const frequency = {};
    words.forEach(word => {
        if (word.length > 3 && !stopwords.includes(word) && !/^\d+$/.test(word)) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    });

    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Top 5
        .map(entry => entry[0]);
};

app.post('/process-metadata', async (req, res) => {
    const { type, fileUrl, content } = req.body;
    let extractedText = "";
    let finalType = type;

    try {
        // A. PDF Extraction
        if (type === 'pdf' && fileUrl) {
            // Convert relative /api/uploads/... to absolute file path
            // fileUrl ex: /api/uploads/USER/file.pdf -> remove /api/uploads -> uploads/USER/file.pdf
            const relPath = fileUrl.replace('/api/', ''); 
            const absolutePath = path.join(__dirname, relPath);
            
            if (fs.existsSync(absolutePath)) {
                const dataBuffer = fs.readFileSync(absolutePath);
                const pdfData = await pdf(dataBuffer);
                // Limit to first 1000 chars for summary
                extractedText = pdfData.text.substring(0, 1000).replace(/\n/g, ' ');
            }
        }
        
        // B. Link / Article Extraction
        else if (type === 'link') {
            if (content.includes('youtube.com') || content.includes('youtu.be')) {
                finalType = 'video';
                extractedText = "YouTube Video: " + content; // Basic placeholder
            } else {
                finalType = 'article';
                try {
                    const response = await fetch(content);
                    const html = await response.text();
                    const $ = cheerio.load(html);
                    const title = $('title').text() || "";
                    const desc = $('meta[name="description"]').attr('content') || "";
                    extractedText = `${title}\n${desc}`;
                } catch (err) {
                    console.error("Link fetch failed:", err.message);
                    extractedText = content; // Fallback
                }
            }
        }
        
        // C. Text / Note
        else if (type === 'note' || type === 'text') {
            extractedText = content;
        }

        // Generate Tags
        const suggestedTags = extractKeywords(extractedText);

        res.json({
            success: true,
            extractedText: extractedText.trim(),
            suggestedTags: suggestedTags,
            detectedType: finalType
        });

    } catch (error) {
        console.error("Metadata processing error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ------------------------------------

// 3. Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  
  const userId = req.headers['x-user-id'] || 'anonymous';
  const fileUrl = `/api/uploads/${userId}/${req.file.filename}`;
  
  res.json({ 
    success: true, 
    fileUrl: fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype
  });
});

app.use((req, res) => {
    console.log(`[404] Resource not found: ${req.url}`);
    res.status(404).send(`Not Found: ${req.url}`);
});

app.listen(PORT, () => {
  console.log(`📂 Local File Server running at http://localhost:${PORT}`);
  console.log(`   - Files will be saved to: ${path.join(__dirname, 'uploads')}`);
});