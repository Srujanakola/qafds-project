# QAFDS

<!-- CI / Build badge: replace OWNER/REPO with your GitHub org/name once repository is created -->
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)

## Quick project status

This repository contains a React frontend and a FastAPI backend for the Quantum AI Fraud Detection System (QAFDS).

## Running with Docker (recommended for final demo)

1. Create an `.env` file at the repo root with your Stripe test key:

```env
STRIPE_SECRET_KEY=sk_test_...
```

2. Build and start both services:

```bash
docker-compose up --build
```

- Backend will be available at `http://localhost:8000`
- Worker (background job processor) accessible as container `qafds_worker` running `rq worker`
- Prometheus metrics at `http://localhost:9090` (scrapes backend)
- Grafana dashboard available at `http://localhost:3001` (connect to Prometheus data source)
- Frontend will be available at `http://localhost:3000`

You can manage the job queue from your host:

```bash
docker-compose exec worker rq info
# to start a worker manually:
docker-compose exec worker rq worker
```

## Tests and CI

- Backend tests use `pytest` (covered in `.github/workflows/ci.yml`).
- Frontend has a minimal React test using `@testing-library/react`.

Run backend tests locally:

```bash
py -3.11 -m pytest backend/tests
```

### Monitoring

- Prometheus collects `/metrics` by default; visit http://localhost:9090 once compose is running.
- Grafana is preconfigured to talk to Prometheus on startup; browse to http://localhost:3001 and add `http://prometheus:9090` as a data source.

Run frontend tests locally:

```bash
cd frontend
npm ci
npm test -- --watchAll=false
```
# ⚛ QAFDS — Quantum AI Fraud Detection System
## Final Year Project — Real-Time Stripe Sandbox Integration

---

## WHAT THIS SYSTEM DOES

- Connects to Stripe Sandbox API (free, no real money)
- Detects fraud in real-time using Quantum-Hybrid ML model
- Live dashboard with transaction feed, fraud alerts, analytics
- One-click demo transactions for interview presentation

---

## REQUIREMENTS — INSTALL THESE FIRST

1. **Python 3.9+**   → https://python.org/downloads
2. **Node.js 18+**   → https://nodejs.org
3. **Stripe Account** → https://stripe.com (free, no card needed)

---

## STEP 1 — GET YOUR FREE STRIPE KEY (2 minutes)

1. Go to https://stripe.com → click "Start now"
2. Sign up with email + password (NO credit card required)
3. After login → click "Developers" in left sidebar
4. Click "API Keys"
5. Under "Secret key" → click "Reveal test key"
6. Copy the key (starts with sk_test_...)
7. KEEP THIS KEY — you will paste it into the app

---

## STEP 2 — RUN THE BACKEND

Open Terminal (or Command Prompt):

```bash
# Go into the backend folder
cd qafds/backend

# Install Python packages
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

KEEP THIS TERMINAL OPEN.

---

## STEP 3 — RUN THE FRONTEND

Open a NEW Terminal (keep the backend one running):

```bash
# Go into the frontend folder
cd qafds/frontend

# Install packages (first time only, takes 1-2 minutes)
npm install

# Start the frontend
npm start
```

Your browser will automatically open: http://localhost:3000

---

## STEP 4 — AUTHENTICATE & CONNECT

1. Before using the dashboard you must login or register.
   - a demo account exists: **username:** `demo`, **password:** `demo123`
   - you can also create a new user via the registration form.
2. Once logged in, paste your sk_test_... key into the input box.
3. Click "CONNECT TO STRIPE SANDBOX".
4. Dashboard loads with live data!

---

## STEP 5 — CREATE TEST TRANSACTIONS (DEMO)

1. Click the "DEMO" tab at the top
2. Set amount, merchant, city, category
3. Click any card button:
   - ✅ Normal Payment    → APPROVED  (low risk)
   - 🚨 High Fraud Risk  → BLOCKED   (high risk — best for demo!)
   - ⚠️ Medium Risk      → FLAGGED   (medium risk)
   - ❌ Card Declined    → DECLINED
4. Watch it appear on dashboard within 4 seconds!

---

## FOR YOUR INTERVIEW — WHAT TO SAY

When they ask: "Is this real data?"
→ "Yes — transactions are processed through Stripe's live API servers 
   in real-time using their official sandbox environment. This is the 
   exact same infrastructure as production, with test card numbers 
   instead of real cards — the industry-standard approach for safe 
   demonstration of financial systems."

When they ask: "Do real transactions cost money?"
→ "No — sk_test_ keys never move real money. Stripe only charges 
   when sk_live_ keys are used with real cards. This system costs 
   exactly ₹0 to run."

When they say: "Show us a live transaction"
→ Go to DEMO tab → click "🚨 High Fraud Risk" → 
   show dashboard → BLOCKED alert fires in ~4 seconds

---

## PROJECT ARCHITECTURE

```
Your Computer
├── Backend (FastAPI — Python)     port 8000
│   ├── Stripe API integration
│   ├── Quantum-Hybrid ML scoring
│   │   ├── Classical ML (XGBoost simulation)
│   │   └── Quantum layer (VQC simulation)
│   └── REST API endpoints
│
└── Frontend (React)               port 3000
    ├── Dashboard with live feed
    ├── Demo transaction panel
    ├── Transaction history table
    └── Fraud alert log
```

## API ENDPOINTS

| Endpoint | Method | Description |
|---|---|---|
| /api/auth/register | POST | Create a new user account |
| /api/auth/login    | POST | Obtain JWT token (username/password) |
| /api/auth/me       | GET  | Return profile info (requires auth) |
| /api/connect       | POST | Validate & store Stripe key (requires auth) |
| /api/transactions  | GET  | Fetch & score latest charges (requires auth) |
| /api/transaction/create | POST | Create test transaction (requires auth) |
| /api/stats         | GET  | Aggregate fraud statistics (requires auth) |

---

## STRIPE TEST CARDS

| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | ✅ Success |
| 4100 0000 0000 0019 | 🚨 High Fraud |
| 4000 0000 0000 9235 | ⚠️ Medium Risk |
| 4000 0000 0000 0002 | ❌ Declined |
| 4000 0000 0000 9995 | ❌ Insufficient funds |

Expiry: any future date (e.g. 12/26)
CVC: any 3 digits (e.g. 123)

---

## COST = ₹0 / $0 FOREVER

- sk_test_ key = sandbox mode = no real money ever
- Stripe only charges on sk_live_ key + real card charges
- This project never uses sk_live_

---

Built for Final Year Project — Real-Time Quantum AI Fraud Detection
