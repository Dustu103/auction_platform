import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isMock = !connectionString || process.env.USE_MOCK_DB === 'true';

let pool;

if (isMock) {
    console.warn("⚠️  DATABASE_URL not found. Running in MOCK DB mode. Data will mostly be in Redis.");
    // Mock pool interface
    pool = {
        query: async () => ({ rows: [] }),
        connect: async () => ({ release: () => { } }),
    };
} else {
    let config = {
        connectionString,
        ssl: { rejectUnauthorized: false }
    };

    // Override host if DB_HOST_IP is set (fixes DNS ENOTFOUND issues)
    if (process.env.DB_HOST_IP) {
        try {
            const url = new URL(connectionString);
            config = {
                user: url.username,
                password: url.password,
                host: process.env.DB_HOST_IP,
                port: url.port || 5432,
                database: url.pathname.split('/')[1],
                ssl: {
                    rejectUnauthorized: false,
                    servername: url.hostname // Important for Neon SNI
                }
            };
            console.log(`🔧 Using manual DB IP: ${process.env.DB_HOST_IP} for ${url.hostname}`);
        } catch (e) {
            console.error("⚠️ Failed to apply DB_HOST_IP override:", e);
        }
    }

    pool = new Pool(config);
}

// Initial Schema Creation
const initDB = async () => {
    if (isMock) return;
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS items (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                start_price DECIMAL(10, 2) NOT NULL,
                end_time BIGINT NOT NULL,
                image TEXT
            );

            CREATE TABLE IF NOT EXISTS bids (
                id SERIAL PRIMARY KEY,
                item_id VARCHAR(50) REFERENCES items(id),
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
