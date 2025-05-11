import { RedisService } from './redis';
import { RateLimiter } from './rateLimiter';
import { PrismaClient, Task } from '../../prisma/generated/prisma';
import { RATE_LIMITS } from '../config/constants';

export class TaskScheduler {
    private prisma: PrismaClient;
    private redis: RedisService;
    private rateLimiter: RateLimiter;

    constructor(prisma: PrismaClient, redis: RedisService) {
        this.prisma = prisma;
        this.redis = redis;
        this.rateLimiter = new RateLimiter(redis);
    }

    async getNextTask(): Promise<Task | null> {
        const taskId = await this.redis.getNextTask();
        if (!taskId) return null;

        return this.prisma.task.findUnique({
            where: { id: taskId }
        });
    }

    async assignTask(taskId: string, proxyIPId: string): Promise<Task> {
        const lockKey = `task:${taskId}:lock`;
        const hasLock = await this.redis.acquireLock(lockKey, RATE_LIMITS.PROXY_TIMEOUT);

        if (!hasLock) {
            throw new Error('Task is already being assigned');
        }

        try {
            const task = await this.prisma.task.update({
                where: { id: taskId },
                data: {
                status: 'IN_PROGRESS',
                    proxyIPId
                }
            });

            await this.redis.removeTask('task_queue', taskId);
            return task;
        } finally {
            await this.redis.releaseLock(lockKey);
        }
    }

    async checkProxyAvailability(proxyId: string): Promise<boolean> {
        return this.rateLimiter.canMakeRequest(proxyId);
    }
}