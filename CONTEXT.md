# Lead Distribution Portal — Context & Requirements

## Overview
Build a lightweight **Lead Distribution Portal** consisting of:
1. A client-facing web form
2. An internal tracking dashboard
3. A server backend

When a user submits the web form, the backend must:
- Ingest the data
- Update the local dashboard in real-time
- Programmatically synchronize, validate, and route the lead into a **HubSpot Developer Sandbox Account** via HubSpot's CRM APIs

---

## Architecture Flow

```
[Web Form Submission]
        │
        ▼
[Your Backend Server] ──(Real-time Event)──> [Your Internal Dashboard]
        │
   (OAuth / Access Token)
        │
        ▼
[HubSpot CRM API]
```

---

## 1. Form & Ingestion Engine

Create a **public-facing HTML form** (or single-page app) that collects:

| Field | Type | Details |
|-------|------|---------|
| First & Last Name | Text input | Required |
| Corporate Email Address | Email input | Required |
| Company Name | Text input | Required |
| Estimated Annual Budget | Dropdown | Options: `Under $10k`, `$10k-$50k`, `Greater than $50k` |

---

## 2. The Internal Dashboard

Build a **single-page monitoring interface** that displays:

### a) Live Lead Feed
- A clean table displaying all submitted leads
- Shows:
  - Local database status
  - HubSpot Sync status

### b) HubSpot Router Control
- An interface or toggle section showing the status of the webhook integration connection to HubSpot

### c) Analytics Badges
- Real-time summary statistics:
  - **Total leads ingested**
  - **Total estimated pipeline value processed**

---

## 3. Backend Server

Responsibilities:
- Receive form submissions
- Store data locally (database)
- Emit real-time events to the dashboard
- Authenticate with HubSpot via OAuth / Access Token
- Validate and route leads into HubSpot CRM

---

## Tech Stack (To Be Determined)

- **Frontend:** HTML/CSS/JS or a framework (SPA)
- **Backend:** Node.js / Python / Go (TBD)
- **Database:** SQLite / PostgreSQL / in-memory (TBD)
- **Real-time:** WebSockets / Server-Sent Events / Polling (TBD)
- **HubSpot Integration:** HubSpot CRM API with OAuth

---

## Key Considerations

- HubSpot Developer Sandbox Account required for API integration
- Real-time updates from backend to dashboard
- Proper error handling for HubSpot API sync failures
- Clean, professional UI for both form and dashboard
- Local database status tracking vs HubSpot sync status