import { useState, useEffect, useMemo, useRef } from 'react'
import io from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'

// Docker compatibility: use window.location if served from same origin, or default to localhost:3000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(API_URL);

// Generate a random User ID for the session
const USER_ID = 'user_' + Math.floor(Math.random() * 10000);

const Countdown = ({ endTime, serverOffset }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            // Current Server Time = Date.now() + serverOffset
            const now = Date.now() + serverOffset;
            const diff = endTime - now;
            setTimeLeft(diff > 0 ? diff : 0);
        }, 100); // 10Hz update for smoothness

        return () => clearInterval(timer);
    }, [endTime, serverOffset]);

    const format = (ms) => {
        if (ms <= 0) return "CLOSED";
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const msParts = Math.floor((ms % 1000) / 100); // Tenths
        return `${m}:${s.toString().padStart(2, '0')}.${msParts}`;
    };

    return (
        <div className={`timer ${timeLeft < 10000 && timeLeft > 0 ? 'urgent' : ''}`}>
            <span>⏱</span> {format(timeLeft)}
        </div>
    );
};

function App() {
    const [items, setItems] = useState([]);
    const [serverOffset, setServerOffset] = useState(0);
    const [bidError, setBidError] = useState(null);

    useEffect(() => {
        // 1. Time Synchronization
        fetch(`${API_URL}/time`)
            .then(res => res.json())
            .then(data => {
                const offset = data.serverTime - Date.now();
                setServerOffset(offset);
            })
            .catch(console.error);

        // 2. Load Initial Items
        fetch(`${API_URL}/items`)
            .then(res => res.json())
            .then(setItems)
            .catch(console.error);

        // 3. Socket Event Listeners
        socket.on('connect', () => {
            console.log('Connected to socket');
        });

        socket.on('update_bid', (data) => {
            // data: { itemId, price, winner }
            setItems(prevItems => prevItems.map(item => {
                if (item.id === data.itemId) {
                    return {
                        ...item,
                        currentPrice: data.price,
                        lastBidder: data.winner,
                        flash: 'green' // Trigger green flash
                    };
                }
                return item;
            }));

            // Clear flash after animation
            setTimeout(() => {
                setItems(prevItems => prevItems.map(item => {
                    if (item.id === data.itemId) return { ...item, flash: null };
                    return item;
                }));
            }, 500);
        });

        socket.on('bid_error', (data) => {
            // data: { itemId, message }
            setBidError(data.message);

            // If outbid, flash red on that item
            setItems(prevItems => prevItems.map(item => {
                if (item.id === data.itemId) {
                    return { ...item, flash: 'red' };
                }
                return item;
            }));

            setTimeout(() => setBidError(null), 3000);
        });

        return () => {
            socket.off('update_bid');
            socket.off('bid_error');
        };
    }, []);

    const handleBid = (item) => {
        const bidStep = 10;
        const newAmount = item.currentPrice + bidStep;

        // Optimistic UI? No, wait for server response to guarantee truth.
        // The "Glass-to-glass" latency is the key metric here.

        socket.emit('place_bid', {
            itemId: item.id,
            amount: newAmount,
            userId: USER_ID
        });
    };

    return (
        <div className="container">
            <header className="header">
                <h1>LiveBid Platform</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Real-time Atomic Auctions • User ID: <span style={{ color: 'var(--accent)' }}>{USER_ID}</span>
                </p>
            </header>

            {bidError && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', top: 20, right: 20,
                        background: 'var(--error)', padding: '1rem',
                        borderRadius: '8px', zIndex: 100, fontWeight: 'bold'
                    }}
                >
                    ⚠️ {bidError}
                </motion.div>
            )}

            <div className="auction-grid">
                {items.map(item => {
                    const isWinning = item.lastBidder === USER_ID;
                    const isOutbid = !isWinning && item.lastBidder; // Someone else is clicking

                    return (
                        <motion.div
                            layout
                            className="card"
                            key={item.id}
                        >
                            <div
                                className={`card-image-container ${item.flash === 'green' ? 'flash-green' : ''} ${item.flash === 'red' ? 'flash-red' : ''}`}
                                style={{ position: 'relative' }}
                            >
                                <img src={item.image} alt={item.title} className="card-image" />
                                {isWinning && (
                                    <div style={{ position: 'absolute', top: 10, right: 10 }} className="status-badge badge-winning">
                                        Winning
                                    </div>
                                )}
                            </div>

                            <div className="card-content">
                                <h2 className="card-title">{item.title}</h2>

                                <Countdown endTime={item.endTime} serverOffset={serverOffset} />

                                <div className="price-tag">
                                    <span style={{ color: isWinning ? 'var(--success)' : 'inherit' }}>
                                        ${item.currentPrice.toLocaleString()}
                                    </span>
                                </div>

                                <button
                                    className="btn-bid"
                                    onClick={() => handleBid(item)}
                                    disabled={Date.now() + serverOffset > item.endTime}
                                >
                                    Bid +$10
                                </button>

                                {item.lastBidder && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Last Bidder: {item.lastBidder.slice(0, 8)}...
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    )
}

export default App
