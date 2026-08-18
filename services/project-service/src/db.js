import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: Missing DATABASE_URL - ALL database calls will fail!');
  console.error('  Set DATABASE_URL in your .env file');
} else {
  console.log('Database pool initialized successfully');
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost:5432/digital_logbook',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
