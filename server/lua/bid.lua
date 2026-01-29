
local current_bid_key = KEYS[1]
local current_bid = tonumber(redis.call('get', current_bid_key)) or 0
local new_bid = tonumber(ARGV[1])
local user_id = ARGV[2]
local timestamp = ARGV[3]

if new_bid > current_bid then
    redis.call('set', current_bid_key, new_bid)
    
    redis.call('set', current_bid_key .. ':winner', user_id)
    redis.call('xadd', 'auction_stream', '*', 'item_id', current_bid_key, 'price', new_bid, 'user_id', user_id, 'ts', timestamp)

    return 1
else
    return 0
end
