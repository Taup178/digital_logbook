import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 5050;

const allowedOrigins = [
  'https://digital-logbook-bxgv.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS: Origin ${origin} not allowed`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// NOTE: No express.json() here — it would consume the request body stream
// before http-proxy-middleware can forward it to the backend services.
// The gateway is a pure proxy; body parsing happens in each backend service.

const AUTH_TARGET = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const DASH_TARGET = process.env.DASHBOARD_SERVICE_URL || 'http://localhost:5002';
const PROJECT_TARGET = process.env.PROJECT_SERVICE_URL || 'http://localhost:5003';
const PROFILE_TARGET = process.env.PROFILE_SERVICE_URL || 'http://localhost:5004';

function mountProxy(prefix, target) {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: { ['^' + prefix]: '' },
      onProxyReq: (proxyReq, req) => {
        const auth = req.headers['authorization'];
        if (auth) proxyReq.setHeader('authorization', auth);
      },
      onError: (err, req, res) => {
        console.error(`Gateway proxy error [${prefix} -> ${target}]:`, err && err.message);
        if (!res.headersSent) res.status(502).json({ error: 'Bad gateway' });
      }
    })
  );
}

mountProxy('/auth', AUTH_TARGET);
mountProxy('/dashboard', DASH_TARGET);
mountProxy('/projects', PROJECT_TARGET);
mountProxy('/profile', PROFILE_TARGET);

app.get('/', (req, res) => res.json({ service: 'api-gateway', status: 'ok' }));

app.use((err, req, res, next) => {
  console.error('Unhandled gateway error:', err);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: 'Internal server error', message: err?.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${PORT}`);
});
