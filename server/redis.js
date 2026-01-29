import Redis from 'ioredis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

const luaPath = './lua/bid.lua';
try {
    const luaScript = fs.readFileSync(luaPath, 'utf8');
    redis.defineCommand('atomicBid', {
        numberOfKeys: 1,
        lua: luaScript
    });
} catch (err) {
    console.error('Failed to load Lua script:', err);
}

export default redis;
