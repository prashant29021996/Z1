const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initDB, insertLead, getAllLeads, getStats } = require('../lib/db');
const { addClient } = require('./sse');
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

    if (!first_name || !last_name || !email || !company || !budget) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validBudgets = ['Under $10k', '$10k-$50k', 'Greater than $50k'];
    if (!validBudgets.includes(budget)) {
      return res.status(400).json({ error: 'Invalid budget option' });
    }

    const lead = {
      id: uuidv4(),
      first_name,
      last_name,
      email,
      company,
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads - Get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats - Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    app.listen(PORT, () => {
      console.log(`Lead Distribution Portal running at http://localhost:${PORT}`);
      console.log(`  Form:      http://localhost:${PORT}/`);
      console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();