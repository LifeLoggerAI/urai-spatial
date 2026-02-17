const SHARD_SIZE = 1000;
const REGION_SERVERS = {
  '0:0:0': 'ws://localhost:9001', // Example Region Server 1
  '1:0:0': 'ws://localhost:9002', // Example Region Server 2
};

export class ShardManager {
  getShardIdForPosition(x: number, y: number, z: number): string {
    const shardX = Math.floor(x / SHARD_SIZE);
    const shardY = Math.floor(y / SHARD_SIZE);
    const shardZ = Math.floor(z / SHARD_SIZE);
    return `${shardX}:${shardY}:${shardZ}`;
  }
  
  getServerForShard(shardId: string): string {
    // In a real system, this would dynamically look up the server
    // For now, we use a static map.
    return REGION_SERVERS[shardId] || REGION_SERVERS['0:0:0'];
  }
}
