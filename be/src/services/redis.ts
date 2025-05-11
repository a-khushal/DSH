require('dotenv').config();
import Redis from 'ioredis';

export class RedisService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    async incrementRequestCount(proxyIPId: string): Promise<number> {
        const key = `rate:${proxyIPId}`;
        const count = await this.redis.incr(key);
        await this.redis.expire(key, 60);
        return count;
    }

    async pushTask(taskId: string, priority: number) {
        await this.redis.zadd('task_queue', priority, taskId);
    }

    async removeTask(key: string, member: string) {
        await this.redis.zrem(key, member);
    }

    async getNextTask(): Promise<string | null> {
        const result = await this.redis.zrange('task_queue', 0, 0);
        return result[0] || null;
    }

    async setProxyHealth(proxyId: string, isHealthy: boolean) {
        await this.redis.hset('proxy_health', proxyId, isHealthy ? '1' : '0');
    }

    async getProxyHealth(proxyId: string): Promise<boolean> {
        const health = await this.redis.hget('proxy_health', proxyId);
        return health === '1';
    }

    async acquireLock(key: string, ttl: number): Promise<boolean> {
        const result = await this.redis.set(key, '1', 'EX', ttl, 'NX');
        return result === 'OK';
    }

    async releaseLock(key: string) {
        await this.redis.del(key);
    }
}