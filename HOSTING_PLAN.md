# Free Hosting Plan for Real-Time Auction Platform

This guide outlines a completely free hosting strategy for your auction platform using a combination of modern cloud services.

## Architecture Overview

| Component | Service | Tier | Notes |
|-----------|---------|------|-------|
| **Frontend** | **Vercel** | Free Hobby | Excellent for React/Vite. Fast global CDN. |
| **Backend** | **Render** | Free Web Service | Spins down after inactivity (cold start ~50s). |
| **Database** | **Neon** | Free Tier | Serverless Postgres (0.5GB storage). |
| **Redis** | **Upstash** | Free Tier | Serverless Redis (Wait-for-socket approach). |

---

## Step 1: Set up Persistence (Database & Cache)

Before deploying the code, you need the "storage" layer ready so you can get the connection strings (`DATABASE_URL` and `REDIS_URL`).

### 1. PostgreSQL on Neon (neon.tech)
1.  Sign up at [neon.tech](https://neon.tech).
2.  Create a new Project (e.g., `auction-db`).
3.  Copy the **Connection String** (e.g., `postgres://user:pass@ep-xyz.aws.neon.tech/neondb...`).
    *   *Note: Select the "Pooled" connection string if available, though standard works too for low traffic.*

### 2. Redis on Upstash (upstash.com)
1.  Sign up at [upstash.com](https://upstash.com).
2.  Create a new Redis database.
3.  Copy the **Redis URL** (e.g., `redis://default:pass@distinct-animal-123.upstash.io:6379`).

---

## Step 2: Deploy Backend (Render)

We will deploy the Node.js server.

1.  Push your code to a **GitHub Repository** (if not already).
2.  Sign up at [render.com](https://render.com).
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  **Settings**:
    *   **Root Directory**: `server` (Important! Your backend is in a subfolder).
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
6.  **Environment Variables**:
    *   Add `DATABASE_URL` = *(Paste from Neon)*
    *   Add `REDIS_URL` = *(Paste from Upstash)*
    *   Add `NODE_ENV` = `production`
7.  Click **Create Web Service**.
8.  Wait for deployment. Once live, copy your **Backend URL** (e.g., `https://auction-platform.onrender.com`).

---

## Step 3: Deploy Frontend (Vercel)

Now we deploy the Client and tell it where the Backend is.

1.  Sign up at [vercel.com](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import the same GitHub repository.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should detect automatically).
    *   **Root Directory**: Edit this and select `client`.
    *   **Environment Variables**:
        *   Key: `VITE_API_URL`
        *   Value: *(Paste your Render Backend URL, e.g., `https://auction-platform.onrender.com`)*
        *   *Important: Do not add a trailing slash `/`.*
5.  Click **Deploy**.

---

## Verification

1.  Visit your new Vercel URL (e.g., `https://auction-platform.vercel.app`).
2.  The app should load.
3.  It might take ~1 minute for the initial data to load if the Render backend is "waking up" (Cold Start).
4.  Once connected, you will see the items and be able to bid in real-time.

## Important Considerations for "Free"
-   **Render Cold Starts**: On the free tier, Render spins down your server if no one visits for 15 minutes. The first visit afterwards will take about 1 minute to load while the server wakes up.
-   **Upstash Limits**: Upstash limits the number of daily commands. For a busy auction demo, you might hit limits, but for a portfolio piece/demo, it is sufficient.
