# LiveBid - Real-time Auction Platform

A high-performance real-time auction system using Node.js, React, and Redis Atomic operations.

## Architecture

- **Hot Layer**: Redis (State Authority) + Lua Scripts (Atomic Locking)
- **Persistence Layer**: PostgreSQL (Archival) via Write-Behind Pattern (Redis Streams)
- **Communication**: Socket.io (Real-time) + REST (Initial Load)
- **Frontend**: React + Framer Motion (Glassmorphism Design)

## Prerequisites

- Docker & Docker Compose

## How to Run (Docker)

1. **Build and Start**:
   ```bash
   docker-compose up --build
   ```
2. **Access**:
   - Frontend: [http://localhost:8080](http://localhost:8080)
   - Backend API: [http://localhost:3000](http://localhost:3000)

## How to Run (Local Dev)

1. **Start Infrastructure** (Redis/Postgres must be running locally).
   
2. **Backend**:
   ```bash
   cd server
   npm install
   npm start
   ```

3. **Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Key Features Implemented

- **Atomic Bidding**: `server/lua/bid.lua` ensures no race conditions.
- **Time Synchronization**: Server-Client time offset calculation prevents timer hacks.
- **Visual Feedback**: Real-time flashes for new bids and status changes.
- **Persistence Strategy**: Background worker simulating the "Buffer & Stream" pattern.
