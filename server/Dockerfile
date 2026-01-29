# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# If there was a build step (TypeScript), we would run it here.
# For pure JS, we just verify structure or lint if needed.

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy Dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy Source Code
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/redis.js ./redis.js
COPY --from=builder /app/db.js ./db.js
COPY --from=builder /app/lua ./lua

EXPOSE 3000
CMD ["node", "server.js"]
