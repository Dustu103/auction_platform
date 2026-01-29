import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Redis
// In a real environment, you might handle connection errors or retries more robustly
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Load Lua Script for Atomic Bidding
const luaPath = path.join(__dirname, 'lua', 'bid.lua');
try {
    const luaScript = fs.readFileSync(luaPath, 'utf8');
    
    // Define the custom command 'atomicBid'
    // Usage: redis.atomicBid(key, new_bid, user_id, timestamp)
    redis.defineCommand('atomicBid', {
        numberOfKeys: 1,
        lua: luaScript
    });
} catch (err) {
    console.error('Failed to load Lua script:', err);
}

export default redis;
