# ── Stage 1: Build React app ────────────────────────────────────────
FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --no-audit --no-fund

COPY . .

# API calls go to /api (relative) — nginx will proxy to backend
ENV VITE_API_BASE_URL=""
ENV VITE_WS_BASE_URL=""

RUN npm run build

# ── Stage 2: Serve with nginx ───────────────────────────────────────
FROM nginx:alpine

# Copy built SPA
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (proxies /api/* and /ws/* to backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
