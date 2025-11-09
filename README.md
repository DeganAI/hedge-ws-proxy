# Hedge Fund WebSocket Proxy

Secure WebSocket proxy for connecting the DegenLlama Hedge dashboard to the coordinator.

## What It Does

- Bridges HTTPS dashboard to HTTP coordinator WebSocket
- Forwards real-time trading signals from agents
- Enables SSL/TLS connection from browser

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/DeganAI/hedge-ws-proxy)

OR manually:

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select `DeganAI/hedge-ws-proxy`
4. Railway will auto-deploy
5. Copy the deployment URL (e.g., `https://hedge-ws-proxy-production.up.railway.app`)
6. Update dashboard to use: `wss://[YOUR-URL]`

## Architecture

```
Dashboard (HTTPS)
    ↓ WSS
Proxy (Railway with SSL)
    ↓ WS
Coordinator (VPS)
    ↓
Redis → Trading Agents
```

## Environment Variables

- `PORT`: Auto-set by Railway (default: 8080)
- `COORDINATOR_WS`: `ws://199.250.222.17:3000/ws` (default)

## Local Testing

```bash
npm install
PORT=8080 node index.js
```

## Health Check

```
GET /health
```

Returns `OK` if running.
