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
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const now = Date.now();

app.get('/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items ORDER BY end_time ASC');
        const items = result.rows;

        const itemsWithState = await Promise.all(items.map(async (item) => {
            const currentPrice = await redis.get(`item:${item.id}:price`);
            const winner = await redis.get(`item:${item.id}:price:winner`);
            return {
                ...item,
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

io.on('connection', (socket) => {
    socket.on('place_bid', async (data) => {
        const { itemId, amount, userId } = data;
        const key = `item:${itemId}:price`;
        const ts = Date.now();

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
            const result = await redis.atomicBid(key, amount, userId, ts);

            if (result === 1) {
                io.emit('update_bid', { itemId, price: amount, winner: userId });
            } else {
                socket.emit('bid_error', { itemId, message: 'You were outbid! Update received.' });
                const realPrice = await redis.get(key);
                socket.emit('update_bid', { itemId, price: Number(realPrice), winner: 'unknown' });
            }

        } catch (e) {
            console.error('Redis Error:', e);
            socket.emit('error', 'System error processing bid');
        }
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});


const processStream = async () => {
    try {
        const streamData = await redis.xread('BLOCK', 1000, 'STREAMS', 'auction_stream', '$');

        if (streamData) {
            const [streamName, messages] = streamData[0];

            const bidsToInsert = [];

            for (const msg of messages) {
                const [id, fields] = msg;
                const bid = {};
                for (let i = 0; i < fields.length; i += 2) {
                    bid[fields[i]] = fields[i + 1];
                }
                bidsToInsert.push(bid);
            }

            if (bidsToInsert.length > 0) {
                console.log(`Persisting ${bidsToInsert.length} bids to Archival DB...`);
            }
        }
    } catch (e) {
        if (e.message !== 'Connection is closed.') {
            console.error('Stream worker error:', e);
        }
    }

    setTimeout(processStream, 100);
};

processStream();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
