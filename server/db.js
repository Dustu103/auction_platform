import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isMock = !connectionString;

let pool;

if (isMock) {
    console.warn("⚠️  DATABASE_URL not found. Running in MOCK DB mode. Data will mostly be in Redis.");
    // Mock pool interface
    pool = {
        query: async () => ({ rows: [] }),
        connect: async () => ({ release: () => { } }),
    };
} else {
    pool = new Pool({
        connectionString,
        // SSL might be needed for some providers like Heroku/Render
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
}

// Initial Schema Creation
const initDB = async () => {
    if (isMock) return;
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS bids (
                id SERIAL PRIMARY KEY,
                item_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Database schema ensured.");
    } catch (err) {
        console.error("❌ Database init failed:", err);
    } finally {
        client.release();
    }
};

initDB();

export default pool;
