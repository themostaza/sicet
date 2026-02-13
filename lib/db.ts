import { Pool } from "pg";

/**
 * PostgreSQL connection pool for direct database queries
 * Used when Supabase REST API limits are insufficient (e.g., large report exports)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool configuration
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});

export default pool;
