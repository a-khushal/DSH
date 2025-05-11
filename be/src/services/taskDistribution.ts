import { PrismaClient, Task, TaskStatus } from '../../prisma/generated/prisma';
import { ProxyManager } from './proxyManager';
import { TaskScheduler } from './taskScheduler';
import { RedisService } from './redis';
import { TASK_PRIORITIES, RATE_LIMITS } from '../config/constants';
import axios from 'axios';

export class TaskDistributionService {
    private prisma: PrismaClient;
    private proxyManager: ProxyManager;
    private taskScheduler: TaskScheduler;
    private redis: RedisService;

    constructor(prisma: PrismaClient, redis: RedisService) {
        this.prisma = prisma;
        this.redis = redis;
        this.proxyManager = new ProxyManager(prisma, redis);
        this.taskScheduler = new TaskScheduler(prisma, redis);
    }

    async distributeTask(): Promise<{ taskId: string; proxyIPId: string; targetUrl: string } | null> {
        const task = await this.taskScheduler.getNextTask();
        if (!task) return null;

        const proxy = await this.proxyManager.getAvailableProxy();
        if (!proxy) return null;

        const canMakeRequest = await this.taskScheduler.checkProxyAvailability(proxy.id);
        if (!canMakeRequest) return null;

        const assignedTask = await this.taskScheduler.assignTask(task.id, proxy.id);

        return {
            taskId: assignedTask.id,
            proxyIPId: proxy.id,
            targetUrl: assignedTask.targetUrl
        };
    }

    async handleTaskCompletion(taskId: string, success: boolean, data?: any) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { proxyIP: true }
        });

        if (!task) throw new Error('Task not found');

        await this.proxyManager.updateProxyHealth(task.proxyIPId, success);

        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
                data: data || null
            }
        });

        if (!success) {
            if (task.retryCount < RATE_LIMITS.MAX_RETRIES) {
                await this.redis.pushTask(taskId, task.retryCount + 1);
            }
        }
    }

    async createTask(targetUrl: string, userId: string, priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'): Promise<Task> {
        const proxy = await this.prisma.proxyIP.findFirst({
            where: {
                userId: userId,
                isActive: true
            }
        });

        if (!proxy) {
            throw new Error('No active proxy found for user');
        }

        const task = await this.prisma.task.create({
            data: {
                targetUrl,
                status: TaskStatus.PENDING,
                retryCount: 0,
                proxyIPId: proxy.id,
                assignedToId: userId,
                bandwidthUsed: 0
            }
        });

        const priorityValue = TASK_PRIORITIES[priority];
        await this.redis.pushTask(task.id, priorityValue);
        return task;
    }

    async getTaskStatus(taskId: string): Promise<Task | null> {
        return this.prisma.task.findUnique({
            where: { id: taskId }
        });
    }

    async executeScraping(taskId: string): Promise<{ 
        success: boolean; 
        data: any; 
        bandwidthUsed: number;
        proxyUserId: string;
    }> {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { proxyIP: true }
        });
    
        if (!task) {
            throw new Error('Task not found');
        }
        
        let proxy;
        try {
            proxy = await this.proxyManager.getAvailableProxy();
            if (!proxy) {
                throw new Error('No available proxy');
            }
    
            const canMakeRequest = await this.taskScheduler.checkProxyAvailability(proxy.id);
            if (!canMakeRequest) {
                throw new Error('Rate limit exceeded');
            }
    
            await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    proxyIPId: proxy.id,
                    status: 'IN_PROGRESS'
                }
            });
    
            const startTime = Date.now();
            const response = await axios.get(task.targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                proxy: {
                    host: proxy.ipAddress,
                    port: 80,
                    protocol: 'http'
                },
                maxRedirects: 5,
                timeout: 30000,
                validateStatus: (status) => status >= 200 && status < 300
            });
    
            const endTime = Date.now();
            const durationInSeconds = (endTime - startTime) / 1000;
            
            const responseSize = response.headers['content-length'] 
                ? parseInt(response.headers['content-length']) 
                : new TextEncoder().encode(JSON.stringify(response.data)).length;
                
            const bandwidthUsed = (responseSize * 8) / (durationInSeconds * 1000000); // Mbps
    
            await this.proxyManager.updateProxyHealth(proxy.id, true);
    
            await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: 'COMPLETED',
                    data: { content: response.data },
                    bandwidthUsed
                }
            });
    
            return {
                success: true,
                data: response.data,
                bandwidthUsed,
                proxyUserId: proxy.userId
            };
        } catch (error) {
            if (proxy) {
                await this.proxyManager.updateProxyHealth(proxy.id, false);
            }
            
            await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: 'FAILED',
                    data: { content: null }
                }
            });
    
            if (task.retryCount < RATE_LIMITS.MAX_RETRIES) {
                await this.redis.pushTask(taskId, task.retryCount + 1);
            }
    
            throw error;
        }
    }
}