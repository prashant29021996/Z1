const { v4: uuidv4 } = require('uuid');
const { initDB, insertLead, getAllLeads } = require('../lib/db');
const { syncLead } = require('../lib/hubspot');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Ensure DB is initialized (idempotent)
    await initDB();

    if (req.method === 'GET') {
      const leads = await getAllLeads();
      return res.status(200).json(leads);
    }

    if (req.method === 'POST') {
      const { first_name, last_name, email, company, budget } = req.body;

      // Validation
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

      // Store in database
      const savedLead = await insertLead(lead);

      // Attempt HubSpot sync (fire-and-forget)
      syncLead(savedLead).catch((err) => {
        console.error('Async HubSpot sync error:', err.message);
      });

      return res.status(201).json(savedLead);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/leads:', err);
    if (err.code === '23505' && err.constraint === 'leads_email_key') {
      return res.status(409).json({
        error: 'A lead with this email address already exists.',
        field: 'email',
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
