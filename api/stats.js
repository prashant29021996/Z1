const { initDB, getStats } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDB();
    const stats = await getStats();
    return res.status(200).json(stats);
  } catch (err) {
    console.error('Error in /api/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};