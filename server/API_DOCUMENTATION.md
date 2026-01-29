# API Documentation

## Base URL
`http://localhost:3000` (Local)
`http://<SERVER_IP>:3000` (Network/Docker)

## REST Endpoints

### 1. Get All Auction Items
**Endpoint:** `GET /items`

Returns a list of all active auction items with their live status.

**Response Example:**
```json
[
  {
    "id": "item-1769703084132-1",
    "title": "Vintage Camera",
    "start_price": 150,
    "end_time": 1769706684132,
    "image": "https://images.unsplash.com/...",
    "currentPrice": 160,
    "lastBidder": "user_4867"
  }
]
```

### 2. Get Server Time
**Endpoint:** `GET /time`

Used for synchronizing client countdown timers with the server to prevent drift.

**Response Example:**
```json
{
  "serverTime": 1769703456789
}
```

---

## Real-Time API (Socket.io)

The application uses Socket.io for real-time bidirectional communication.

### Connection
Connect to the Base URL.

### Client Emits (Outgoing)

#### `place_bid`
Send this event to attempt to place a bid on an item.

**Payload:**
```json
{
  "itemId": "item-id",
  "amount": 170,  // Must be greater than current price
  "userId": "user_123"
}
```

### Server Emits (Incoming)

#### `update_bid`
Broadcasted to **all connected clients** when a new valid bid is accepted. Use this to update the UI instantly.

**Payload:**
```json
{
  "itemId": "item-id",
  "price": 170,
  "winner": "user_123"
}
```

#### `bid_error`
Sent **only to the sender** if their bid is rejected (e.g., amount too low, auction expired, or race condition lost).

**Payload:**
```json
{
  "itemId": "item-id",
  "message": "You were outbid! Update received."
}
```
