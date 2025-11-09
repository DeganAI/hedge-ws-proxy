import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { createClient } from 'redis';

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || 'redis://199.250.222.17:6379';

console.log('[Proxy] Starting Direct Redis-to-WebSocket Bridge');
console.log('[Proxy] Redis URL:', REDIS_URL);
console.log('[Proxy] Port:', PORT);

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK - Redis Bridge Active');
  } else {
    res.writeHead(200);
    res.end('WebSocket Redis Bridge Running');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Track active WebSocket clients
const clients = new Set();

// Track agent data
const agentStats = new Map();
let totalPnL = 0;

// Create Redis subscriber
const subscriber = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('[Redis] Too many reconnection attempts, giving up');
        return new Error('Max reconnections reached');
      }
      const delay = Math.min(retries * 100, 3000);
      console.log(`[Redis] Reconnecting in ${delay}ms... (attempt ${retries})`);
      return delay;
    }
  }
});

// Connect to Redis
subscriber.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

subscriber.connect().then(async () => {
  console.log('[Redis] ✅ Connected successfully!');
  console.log('[Redis] Subscribing to fills:new channel...');

  await subscriber.subscribe('fills:new', (message) => {
    try {
      const tradeData = JSON.parse(message);
      console.log(`[Redis] Trade received: ${tradeData.agent} ${tradeData.side} ${tradeData.size || tradeData.qty} ${tradeData.symbol}`);

      // Update agent stats
      const agentName = tradeData.agent;
      if (!agentStats.has(agentName)) {
        agentStats.set(agentName, {
          agent: agentName,
          pnl: 0,
          trades: 0,
          sharpe: 1.2 + Math.random() * 0.8, // Mock for now
          dd: 2 + Math.random() * 3,  // Mock for now
          status: 'running'
        });
      }

      const stats = agentStats.get(agentName);
      stats.pnl += (tradeData.realized_pnl || 0);
      stats.trades += 1;

      // Update total PnL
      totalPnL += (tradeData.realized_pnl || 0);

      // Format trade for dashboard
      const trade = {
        type: 'trade_executed',
        data: {
          ts: tradeData.timestamp || new Date().toISOString(),
          symbol: tradeData.symbol,
          side: tradeData.side,
          qty: tradeData.size || tradeData.qty,
          px: tradeData.price,
          pnl: tradeData.realized_pnl || 0,
          agent: tradeData.agent
        }
      };

      // Broadcast to all clients
      broadcast(trade);

      // Send updated agent status
      broadcast({
        type: 'agent_status',
        data: Array.from(agentStats.values())
      });

      // Send updated PnL
      broadcast({
        type: 'pnl_updated',
        data: { value: totalPnL }
      });

    } catch (err) {
      console.error('[Redis] Parse error:', err.message);
    }
  });

  console.log('[Redis] ✅ Subscribed to fills:new!');
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  clients.add(ws);

  // Send current agent stats
  if (agentStats.size > 0) {
    ws.send(JSON.stringify({
      type: 'agent_status',
      data: Array.from(agentStats.values())
    }));

    ws.send(JSON.stringify({
      type: 'pnl_updated',
      data: { value: totalPnL }
    }));
  }

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
    clients.delete(ws);
  });
});

// Broadcast function
function broadcast(message) {
  const data = JSON.stringify(message);
  let sent = 0;

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
      sent++;
    }
  });

  if (sent > 0) {
    console.log(`[Broadcast] Sent ${message.type} to ${sent} client(s)`);
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`[Proxy] ✅ Server running on port ${PORT}`);
  console.log(`[Proxy] Waiting for Redis trades...`);
});
