import WebSocket from 'ws';

const ws = new WebSocket('ws://199.250.222.17:3000/ws');

ws.on('open', () => {
  console.log('[Test] Connected to coordinator!');
});

ws.on('message', (data) => {
  console.log('[Test] Received:', data.toString().substring(0, 150));
});

ws.on('error', (err) => {
  console.error('[Test] Error:', err.message);
});

ws.on('close', () => {
  console.log('[Test] Connection closed');
});

setTimeout(() => {
  console.log('[Test] Test complete');
  ws.close();
  process.exit(0);
}, 15000);
