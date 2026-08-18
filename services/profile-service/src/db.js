import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: Missing DATABASE_URL - service will start but database calls will fail');
} else {
  console.log('Database pool initialized successfully');
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost:5432/digital_logbook',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
