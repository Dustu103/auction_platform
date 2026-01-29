import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import redis from './redis.js';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for demo
        methods: ["GET", "POST"]
    }
});

// --- DATA INITIALIZATION ---
// In a real app, this would come from the DB.
// We set dynamic end times relative to server start for demo purposes.
const now = Date.now();
// --- REST API ---

app.get('/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items ORDER BY end_time ASC');
        const items = result.rows;

        const itemsWithState = await Promise.all(items.map(async (item) => {
            const currentPrice = await redis.get(`item:${item.id}:price`);
            const winner = await redis.get(`item:${item.id}:price:winner`);
            return {
                ...item,
                // Ensure numbers for frontend
                start_price: Number(item.start_price),
                end_time: Number(item.end_time),
                currentPrice: Number(currentPrice || item.start_price),
                lastBidder: winner
            };
        }));
        res.json(itemsWithState);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});


app.get('/time', (req, res) => {
    res.json({ serverTime: Date.now() });
});

// --- SOCKET.IO REAL-TIME LAYER ---

io.on('connection', (socket) => {
    // console.log(`User Connected: ${socket.id}`);

    socket.on('place_bid', async (data) => {
        const { itemId, amount, userId } = data;
        const key = `item:${itemId}:price`;
        const ts = Date.now();

        // Validate basic expiration
        // Validate basic expiration
        let item;
        try {
            const dbRes = await pool.query('SELECT * FROM items WHERE id = $1', [itemId]);
            item = dbRes.rows[0];
        } catch (err) {
            console.error("Error fetching item for bid:", err);
        }

        if (!item || Date.now() > Number(item.end_time)) {
            socket.emit('bid_error', { itemId, message: 'Auction ended or invalid item!' });
            return;
        }

        try {
            // EXECUTE ATOMIC LUA CHECK
            // Result: 1 = Success, 0 = Fail (Race Condition / Stale Data)
            const result = await redis.atomicBid(key, amount, userId, ts);

            if (result === 1) {
                // Success: Broadcast new price to all clients instantly
                io.emit('update_bid', { itemId, price: amount, winner: userId });
                // console.log(`Bid accepted: Item ${itemId} @ $${amount} by ${userId}`);
            } else {
                // Fail: Notify only the sender
                socket.emit('bid_error', { itemId, message: 'You were outbid! Update received.' });
                // We should also push the latest price to them just in case
                const realPrice = await redis.get(key);
                socket.emit('update_bid', { itemId, price: Number(realPrice), winner: 'unknown' });
            }

        } catch (e) {
            console.error('Redis Error:', e);
            socket.emit('error', 'System error processing bid');
        }
    });

    socket.on('disconnect', () => {
        // console.log('User Disconnected', socket.id);
    });
});

// --- PERSISTENCE WORKER (Background Sync) ---
// This simulates pulling from Redis Streams and writing to Postgres
// In a microservice arch, this would be a separate process.

const processStream = async () => {
    try {
        // Read all new messages from the stream
        // '0' means read from beginning (in real app, track ID)
        // We use xread for simplicity here, draining the stream
        const streamData = await redis.xread('BLOCK', 1000, 'STREAMS', 'auction_stream', '$');

        if (streamData) {
            const [streamName, messages] = streamData[0];

            // Collect bids for batch insert
            const bidsToInsert = [];

            for (const msg of messages) {
                const [id, fields] = msg;
                // Parse flat array [key1, val1, key2, val2...]
                const bid = {};
                for (let i = 0; i < fields.length; i += 2) {
                    bid[fields[i]] = fields[i + 1];
                }
                bidsToInsert.push(bid);
            }

            // MOCK: Write to DB
            if (bidsToInsert.length > 0) {
                // console.log(`Persisting ${bidsToInsert.length} bids to Archival DB...`);
                // Insert Logic Here:
                // await pool.query(...)
            }
        }
    } catch (e) {
        // Timeout or empty is normal for blocking read
        if (e.message !== 'Connection is closed.') {
            // console.error('Stream worker error:', e);
        }
    }

    // Loop
    setTimeout(processStream, 100);
};

// Start the worker
processStream();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
