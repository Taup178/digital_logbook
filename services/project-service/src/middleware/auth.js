import { jwtVerify, createRemoteJWKSet } from 'jose';
import { pool } from '../db.js';

/**
 * Express middleware that verifies the Supabase JWT from the
 * Authorization: Bearer <token> header.
 *
 * Supabase signs auth session tokens with an asymmetric key (ES256).
 * The public key is fetched from Supabase's standard OIDC JWKS endpoint
 * and cached by jose's createRemoteJWKSet.
 *
 * On success, attaches:
 *   req.user     — the decoded JWT payload
 *   req.userEmail — the verified user's email
 *
 * On failure, responds with 401 and does not call next().
 */
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error('CRITICAL: Missing SUPABASE_URL - JWT verification will fail!');
}

const JWKS_URL = new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
const JWKS = createRemoteJWKSet(JWKS_URL);

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing access token' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['ES256'],
      issuer: `${SUPABASE_URL}/auth/v1`,
    });

    const user = {
      id: payload.sub,
      email: payload.email,
    };

    if (!user.email) {
      console.error('Token verification failed: no email in JWT payload');
      return res.status(401).json({ error: 'Unauthorized: invalid access token' });
    }

    req.user = user;
    req.userEmail = user.email;

    // Ensure a matching row exists in our public.users table. Some auth flows
    // (OAuth, restored sessions, sign-in before the create-profile page ran)
    // never inserted the row, but project FKs depend on it.
    try {
      await pool.query(
        'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
        [user.email]
      );
    } catch (err) {
      console.error('User provisioning failed:', err.message);
    }

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message || 'No user returned');
    return res.status(401).json({ error: 'Unauthorized: invalid access token' });
  }
}
