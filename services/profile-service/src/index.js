import './config.js';

import express from 'express';
import cors from 'cors';

import loginRoutes from './Routes/login.js';
import profileRoutes from './Routes/profile.js';

const app = express();
const PORT = process.env.PORT || 5004;

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
  res.json({ service: 'profile-service', status: 'healthy' });
});

app.use('/service', loginRoutes);
app.use('/service', profileRoutes);

// Global error handler - ensures CORS headers are sent even on errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Ensure CORS headers are present on error responses
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: err?.message || 'Unknown error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Profile Service running on port ${PORT}`);
});
