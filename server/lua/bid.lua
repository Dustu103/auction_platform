-- Redis LUA Script for Atomic Bidding
-- KEYS[1]: item_id (e.g., "item:1:price")
-- ARGV[1]: new_bid_amount
-- ARGV[2]: user_id
-- ARGV[3]: timestamp

local current_bid_key = KEYS[1]
local current_bid = tonumber(redis.call('get', current_bid_key)) or 0
local new_bid = tonumber(ARGV[1])
local user_id = ARGV[2]
local timestamp = ARGV[3]

if new_bid > current_bid then
    -- Update the current price
    redis.call('set', current_bid_key, new_bid)
    
    -- Store the winner info in a separate key if needed, or just rely on the stream/log
    redis.call('set', current_bid_key .. ':winner', user_id)

    -- Add to the stream for the background worker (Persistence Layer)
    -- Stream Key: "auction_stream"
    redis.call('xadd', 'auction_stream', '*', 'item_id', current_bid_key, 'price', new_bid, 'user_id', user_id, 'ts', timestamp)

    return 1 -- Success
else
    return 0 -- Outbid (stale or too low)
end
