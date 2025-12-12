import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeKOLHandle } from './services/geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Configure CORS to only allow your frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting middleware (basic implementation)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

const rateLimiter = (req, res, next) => {
  const clientId = req.ip;
  const now = Date.now();

  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, []);
  }

  const requests = requestCounts.get(clientId).filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  requests.push(now);
  requestCounts.set(clientId, requests);
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Analyze KOL endpoint
app.post('/api/analyze-kol', rateLimiter, async (req, res) => {
  try {
    const { handle } = req.body;

    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({
        error: 'Invalid request. Handle is required and must be a string.'
      });
    }

    // Sanitize handle input
    const sanitizedHandle = handle.trim().substring(0, 50);

    if (!sanitizedHandle) {
      return res.status(400).json({
        error: 'Handle cannot be empty.'
      });
    }

    const analysis = await analyzeKOLHandle(sanitizedHandle);

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing KOL:', error);
    res.status(500).json({
      error: 'Failed to analyze KOL. Please try again later.',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`CORS enabled for: ${corsOptions.origin}`);
});
