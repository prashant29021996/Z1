// HubSpot Router - Integration module
// Shared between local dev and Vercel serverless functions.

const { updateHubspotStatus } = require('./db');

const CONFIG = {
  enabled: false,
  apiBaseUrl: 'https://api.hubapi.com/crm/v3',
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN || '',
};

function isEnabled() {
  return CONFIG.enabled && CONFIG.accessToken.length > 0;
}

function enable(token) {
  CONFIG.enabled = true;
  CONFIG.accessToken = token;
  return { connected: true };
}

function disable() {
  CONFIG.enabled = false;
  return { connected: false };
}

function getStatus() {
  return {
    connected: CONFIG.enabled && CONFIG.accessToken.length > 0,
    enabled: CONFIG.enabled,
    hasToken: CONFIG.accessToken.length > 0,
    apiBaseUrl: CONFIG.apiBaseUrl,
  };
}

async function syncLead(lead) {
  if (!isEnabled()) {
    console.log(`HubSpot sync skipped for lead ${lead.id}: integration not enabled`);
    await updateHubspotStatus(lead.id, 'skipped');
    return { status: 'skipped', message: 'HubSpot integration not enabled' };
  }

  try {
    console.log(`Syncing lead ${lead.id} to HubSpot...`);

    const response = await fetch(`${CONFIG.apiBaseUrl}/objects/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          firstname: lead.first_name,
          lastname: lead.last_name,
          email: lead.email,
          company: lead.company,
          hs_lead_status: 'NEW',
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HubSpot API error ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const hubspotId = result.id;

    await updateHubspotStatus(lead.id, 'synced', hubspotId);

    console.log(`Lead ${lead.id} synced to HubSpot with ID ${hubspotId}`);
    return { status: 'synced', hubspot_id: hubspotId };
  } catch (err) {
    console.error(`HubSpot sync failed for lead ${lead.id}:`, err.message);
    await updateHubspotStatus(lead.id, 'failed');
    return { status: 'failed', error: err.message };
  }
}

module.exports = { isEnabled, enable, disable, getStatus, syncLead };
