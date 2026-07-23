const { getStatus, enable, disable } = require('../lib/hubspot');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json(getStatus());
    }

    if (req.method === 'POST') {
      const { action, token } = req.body;

      if (action === 'enable') {
        if (!token) {
          return res.status(400).json({ error: 'Access token is required' });
        }
        const result = enable(token);
        return res.status(200).json(result);
      }

      if (action === 'disable') {
        const result = disable();
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid action. Must be "enable" or "disable".' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/hubspot:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};