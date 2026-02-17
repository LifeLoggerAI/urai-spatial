import { WebSocketServer } from 'ws';
import { ShardManager } from './shardManager';

const wss = new WebSocketServer({ port: 8080 });
const shardManager = new ShardManager();

console.log("🚀 Server Gateway listening on port 8080");

wss.on('connection', ws => {
  console.log('Client connected');
  
  // On first message, treat it as a request for a shard
  ws.once('message', (message: string) => {
    try {
      const { x, y, z } = JSON.parse(message);
      const shardId = shardManager.getShardIdForPosition(x, y, z);
      const serverUrl = shardManager.getServerForShard(shardId);
      
      // Redirect client to the correct region server
      ws.send(JSON.stringify({ type: 'redirect', url: serverUrl }));
      ws.close();
    } catch(e) {
      ws.close();
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from gateway');
  });
});
