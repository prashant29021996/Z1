const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'lead_portal'}`;

  const isVercel = process.env.VERCEL === '1';

  if (isVercel) {
    // On Vercel, use Neon serverless driver or standard pg with connection pooling
    const { Pool: NeonPool } = require('@neondatabase/serverless');
    pool = new NeonPool({ connectionString });
  } else {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  return pool;
}

async function initDB() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        budget VARCHAR(50) NOT NULL,
        local_status VARCHAR(50) NOT NULL DEFAULT 'received',
        hubspot_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        hubspot_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

async function insertLead(lead) {
  const { id, first_name, last_name, email, company, budget } = lead;
  const result = await getPool().query(
    `INSERT INTO leads (id, first_name, last_name, email, company, budget)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, first_name, last_name, email, company, budget],
  );
  return result.rows[0];
}

async function getAllLeads() {
  const result = await getPool().query(
    'SELECT * FROM leads ORDER BY created_at DESC',
  );
  return result.rows;
}

async function getLeadById(id) {
  const result = await getPool().query(
    'SELECT * FROM leads WHERE id = $1',
    [id],
  );
  return result.rows[0] || null;
}

async function updateHubspotStatus(id, hubspot_status, hubspot_id = null) {
  const result = await getPool().query(
    `UPDATE leads
     SET hubspot_status = $2,
         hubspot_id = COALESCE($3, hubspot_id),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, hubspot_status, hubspot_id],
  );
  return result.rows[0];
}

async function getStats() {
  const result = await getPool().query(`
    SELECT
      COUNT(*)::int AS total_leads,
      COALESCE(SUM(
        CASE
          WHEN budget = 'Under $10k' THEN 10000
          WHEN budget = '$10k-$50k' THEN 50000
          WHEN budget = 'Greater than $50k' THEN 100000
          ELSE 0
        END
      ), 0) AS total_pipeline_value
    FROM leads
  `);
  return result.rows[0];
}

module.exports = {
  initDB,
  insertLead,
  getAllLeads,
  getLeadById,
  updateHubspotStatus,
  getStats,
  getPool,
};
