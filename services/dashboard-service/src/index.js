import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import searchRouter from './Routes/search.js';

const app = express();
const PORT = process.env.PORT || 5002;

// Allowed origins for CORS
const defaultOrigins = [
  'https://digital-logbook-bxgv.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5050'
];

const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (defaultOrigins.includes(origin) || envOrigins.includes(origin)) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(origin)) return true;
  return false;
};

// CORS configuration with dynamic origin checking
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Apply CORS options globally
app.use(cors(corsOptions));

// Safe preflight wildcard handler for Express 5 (regex instead of '*')
app.options(/(.*)/, cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'dashboard-service', status: 'ok' });
});

app.use('/service', searchRouter);

// Global error handler - ensures CORS headers on errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
});

app.listen(PORT, () => {
  console.log(`dashboard-service running on port ${PORT}`);
});

export default app;