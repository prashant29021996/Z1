# Lead Distribution Portal

A lightweight lead distribution system with a client-facing web form, real-time internal dashboard, and HubSpot CRM integration (optional)

## Architecture

```
[Web Form Submission]  →  [Express API]  →  [PostgreSQL]
                              │
                         (SSE / Polling)
                              │
                              ▼
                    [Real-time Dashboard]
                              │
                         (Optional)
                              ▼
                    [HubSpot CRM API]
```

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (local via Docker, Neon/Supabase for Vercel)
- **Frontend:** Vanilla HTML/CSS/JS (single-page apps)
- **Real-time:** Server-Sent Events (local) / Polling (Vercel)
- **Hosting:** Vercel (serverless) or local Express server

## Features

- ✅ Lead submission form with validation
- ✅ Real-time dashboard with live lead feed
- ✅ Analytics badges (total leads, pipeline value)
- ✅ HubSpot Router Control (enable/disable with access token)
- ✅ Optional HubSpot CRM sync
- ✅ Graceful shutdown handling
- ✅ Error-friendly startup messages

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/prashant29021996/Z1.git
cd Z1

# 2. Install dependencies
npm install

# 3. Start PostgreSQL via Docker
docker compose up -d

# 4. Start the development server
npm run dev
```

The server will start at `http://localhost:3000`.

- **Lead Form:** http://localhost:3000/
- **Dashboard:** http://localhost:3000/dashboard
- **Health Check:** http://localhost:3000/api/health

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/lead_portal` |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot Private App token | (empty = disabled) |
| `PORT` | Server port (local only) | `3000` |

## Testing

```bash
# Run tests (requires PostgreSQL running)
npm test

# Run linting
npm run lint
```

## Deployment (Vercel)

### 1. Set up PostgreSQL

Create a free serverless PostgreSQL database:

- **Option A — Neon:** https://neon.tech (recommended)
- **Option B — Supabase:** https://supabase.com

Copy the connection string (looks like `postgresql://user:pass@ep-xxxx.aws.neon.tech/neondb?sslmode=require`).

### 2. Deploy

**Via Vercel CLI:**
```bash
npm i -g vercel
vercel
vercel env add DATABASE_URL   # paste your Neon/Supabase connection string
vercel --prod
```

**Via Vercel Dashboard:**
1. Import the repository: https://vercel.com/new
2. Add `DATABASE_URL` in Settings → Environment Variables
3. Deploy

Your app will be live at `https://your-project.vercel.app`.

### 3. HubSpot Setup (Optional)

1. Go to your HubSpot Developer account
2. Create a Private App with necessary scopes
3. Copy the Access Token
4. On the dashboard, enter the token in the HubSpot Router Control panel and click **Enable Connection**

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leads` | Get all leads |
| POST | `/api/leads` | Create a new lead |
| GET | `/api/stats` | Get dashboard statistics |
| GET | `/api/hubspot` | Get HubSpot integration status |
| POST | `/api/hubspot` | Enable/disable HubSpot sync |
| GET | `/api/health` | Health check |
| GET | `/api/events` | SSE endpoint (local only) |

## Project Structure

```
Z1/
├── api/                  # Vercel serverless functions
│   ├── leads.js
│   ├── stats.js
│   └── hubspot.js
├── lib/                  # Shared libraries
│   ├── db.js             # Database module (Postgres + Neon)
│   └── hubspot.js        # HubSpot integration module
├── public/               # Frontend static files
│   ├── index.html        # Lead submission form
│   └── dashboard.html    # Internal dashboard
├── src/                  # Local Express server
│   ├── app.js            # Server entry point
│   └── sse.js            # Server-Sent Events manager
├── test/                 # Test files
│   └── leads.test.js
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Local PostgreSQL
├── vercel.json           # Vercel configuration
└── package.json