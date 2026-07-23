const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initDB, insertLead, getAllLeads, getStats, getPool } = require('../lib/db');
const { addClient, cleanup: sseCleanup } = require('./sse');
const { getStatus, enable, disable, syncLead } = require('../lib/hubspot');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================
// API Routes
// ============================================================

// POST /api/leads - Submit a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const { first_name, last_name, email, company, budget } = req.body;

    const errors = [];
    if (!first_name || !first_name.trim()) errors.push('First name is required');
    if (!last_name || !last_name.trim()) errors.push('Last name is required');
    if (!email || !email.trim()) errors.push('Email is required');
    if (!company || !company.trim()) errors.push('Company name is required');
    if (!budget) errors.push('Budget is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const validBudgets = ['Under $10k', '$10k-$50k', 'Greater than $50k'];
    if (!validBudgets.includes(budget)) {
      return res.status(400).json({
        error: `Invalid budget option "${budget}". Must be one of: ${validBudgets.join(', ')}`,
      });
    }

    const lead = {
      id: uuidv4(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim().toLowerCase(),
      company: company.trim(),
      budget,
    };

    const savedLead = await insertLead(lead);

    // Broadcast via SSE
    const { broadcast } = require('./sse');
    broadcast('new-lead', savedLead);

    const stats = await getStats();
    broadcast('stats-updated', stats);

    // Fire-and-forget HubSpot sync
    syncLead(savedLead).catch((err) => {
      console.error('Async HubSpot sync error:', err.message);
    });

    res.status(201).json(savedLead);
  } catch (err) {
    console.error('Error creating lead:', err);
    if (err.code === '23505' && err.constraint === 'leads_email_key') {
      return res.status(409).json({
        error: 'A lead with this email address already exists.',
        field: 'email',
      });
    }
    res.status(500).json({ error: `Failed to create lead: ${err.message}` });
  }
});

// GET /api/leads - Get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: `Failed to fetch leads: ${err.message}` });
  }
});

// GET /api/stats - Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: `Failed to fetch stats: ${err.message}` });
  }
});

// ============================================================
// Health Check
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: getPool() ? 'connected' : 'disconnected',
  });
});

// ============================================================
// SSE Endpoint (Server-Sent Events) - Local dev only
// ============================================================
app.get('/api/events', (req, res) => {
  addClient(res);
});

// ============================================================
// HubSpot Router API
// ============================================================

// GET /api/hubspot - Get HubSpot integration status
app.get('/api/hubspot', (req, res) => {
  res.json(getStatus());
});

// POST /api/hubspot - Enable/Disable HubSpot
app.post('/api/hubspot', (req, res) => {
  const { action, token } = req.body;

  if (action === 'enable') {
    if (!token) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    const result = enable(token);
    const { broadcast } = require('./sse');
    broadcast('hubspot-status', { connected: true, message: 'HubSpot integration enabled' });
    return res.json(result);
  }

  if (action === 'disable') {
    const result = disable();
    const { broadcast } = require('./sse');
    broadcast('hubspot-status', { connected: false, message: 'HubSpot integration disabled' });
    return res.json(result);
  }

  return res.status(400).json({ error: 'Invalid action. Must be "enable" or "disable".' });
});

// ============================================================
// Frontend Routes
// ============================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// ============================================================
// Start Server
// ============================================================
async function start() {
  try {
    await initDB();
    const server = app.listen(PORT, () => {
      console.log('\n  ✓ Lead Distribution Portal running');
      console.log('  ───────────────────────────────────');
      console.log(`  Form:      http://localhost:${PORT}/`);
      console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`  Health:    http://localhost:${PORT}/api/health\n`);
    });

    // ============================================================
    // Graceful Shutdown
    // ============================================================
    const shutdown = async (signal) => {
      console.log(`\n  ⚡ Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        console.log('  ✓ HTTP server closed');

        // Close SSE connections
        sseCleanup();
        console.log('  ✓ SSE connections cleaned up');

        // Close database pool
        try {
          await getPool().end();
          console.log('  ✓ Database pool closed');
        } catch (err) {
          console.error('  ✗ Error closing database pool:', err.message);
        }

        console.log('  ✓ Shutdown complete. Goodbye!\n');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('  ✗ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('\n  ✗ Failed to start server:');
    console.error(`    ${err.message}\n`);

    if (err.code === 'ECONNREFUSED') {
      console.error('    ⚠️  Could not connect to PostgreSQL.');
      console.error('    Make sure the database is running:');
      console.error('      docker compose up -d');
      console.error('    Or set DATABASE_URL environment variable.\n');
    } else if (err.code === 'ENOTFOUND') {
      console.error('    ⚠️  Database host not found.');
      console.error('    Check your DATABASE_URL or DB_HOST setting.\n');
    } else if (err.code === '28P01') {
      console.error('    ⚠️  Authentication failed.');
      console.error('    Check your DB_USER and DB_PASSWORD settings.\n');
    }

    process.exit(1);
  }
}

// Only start if this is the main module (not during tests)
if (require.main === module) {
  start();
}

module.exports = { app, start };
