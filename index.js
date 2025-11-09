import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 8080;
const COORDINATOR_WS = process.env.COORDINATOR_WS || 'ws://199.250.222.17:3000/ws';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(200);
    res.end('WebSocket Proxy Running');
  }
});

const wss = new WebSocketServer({ server });

console.log(`[Proxy] Starting WebSocket proxy`);
console.log(`[Proxy] Will proxy to: ${COORDINATOR_WS}`);

wss.on('connection', (clientWs) => {
  console.log('[Proxy] Client connected');

  // Connect to coordinator
  const coordinatorWs = new WebSocket(COORDINATOR_WS);

  coordinatorWs.on('open', () => {
    console.log('[Proxy] Connected to coordinator');
  });

  coordinatorWs.on('message', (data) => {
    // Forward message from coordinator to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data.toString());
    }
  });

  coordinatorWs.on('error', (err) => {
    console.error('[Proxy] Coordinator error:', err.message);
  });

  coordinatorWs.on('close', () => {
    console.log('[Proxy] Coordinator disconnected');
    clientWs.close();
  });

  // Forward messages from client to coordinator
  clientWs.on('message', (data) => {
    if (coordinatorWs.readyState === WebSocket.OPEN) {
      coordinatorWs.send(data);
    }
  });

  clientWs.on('close', () => {
    console.log('[Proxy] Client disconnected');
    coordinatorWs.close();
  });

  clientWs.on('error', (err) => {
    console.error('[Proxy] Client error:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`[Proxy] Server running on port ${PORT}`);
});
