"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDistributionService = void 0;
const prisma_1 = require("../../prisma/generated/prisma");
const proxyManager_1 = require("./proxyManager");
const taskScheduler_1 = require("./taskScheduler");
const constants_1 = require("../config/constants");
const axios_1 = __importDefault(require("axios"));
class TaskDistributionService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.proxyManager = new proxyManager_1.ProxyManager(prisma, redis);
        this.taskScheduler = new taskScheduler_1.TaskScheduler(prisma, redis);
    }
    distributeTask() {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.taskScheduler.getNextTask();
            if (!task)
                return null;
            const proxy = yield this.proxyManager.getAvailableProxy();
            if (!proxy)
                return null;
            const canMakeRequest = yield this.taskScheduler.checkProxyAvailability(proxy.id);
            if (!canMakeRequest)
                return null;
            const assignedTask = yield this.taskScheduler.assignTask(task.id, proxy.id);
            return {
                taskId: assignedTask.id,
                proxyIPId: proxy.id,
                targetUrl: assignedTask.targetUrl
            };
        });
    }
    handleTaskCompletion(taskId, success, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.prisma.task.findUnique({
                where: { id: taskId },
                include: { proxyIP: true }
            });
            if (!task)
                throw new Error('Task not found');
            yield this.proxyManager.updateProxyHealth(task.proxyIPId, success);
            yield this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: success ? prisma_1.TaskStatus.COMPLETED : prisma_1.TaskStatus.FAILED,
                    data: data || null
                }
            });
            if (!success) {
                if (task.retryCount < constants_1.RATE_LIMITS.MAX_RETRIES) {
                    yield this.redis.pushTask(taskId, task.retryCount + 1);
                }
            }
        });
    }
    createTask(targetUrl_1, userId_1) {
        return __awaiter(this, arguments, void 0, function* (targetUrl, userId, priority = 'NORMAL') {
            const proxy = yield this.prisma.proxyIP.findFirst({
                where: {
                    userId: userId,
                    isActive: true
                }
            });
            if (!proxy) {
                throw new Error('No active proxy found for user');
            }
            const task = yield this.prisma.task.create({
                data: {
                    targetUrl,
                    status: prisma_1.TaskStatus.PENDING,
                    retryCount: 0,
                    proxyIPId: proxy.id,
                    assignedToId: userId,
                    bandwidthUsed: 0
                }
            });
            const priorityValue = constants_1.TASK_PRIORITIES[priority];
            yield this.redis.pushTask(task.id, priorityValue);
            return task;
        });
    }
    getTaskStatus(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.prisma.task.findUnique({
                where: { id: taskId }
            });
        });
    }
    executeScraping(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.prisma.task.findUnique({
                where: { id: taskId },
                include: { proxyIP: true }
            });
            if (!task) {
                throw new Error('Task not found');
            }
            let proxy;
            try {
                proxy = yield this.proxyManager.getAvailableProxy();
                if (!proxy) {
                    throw new Error('No available proxy');
                }
                const canMakeRequest = yield this.taskScheduler.checkProxyAvailability(proxy.id);
                if (!canMakeRequest) {
                    throw new Error('Rate limit exceeded');
                }
                yield this.prisma.task.update({
                    where: { id: taskId },
                    data: {
                        proxyIPId: proxy.id,
                        status: 'IN_PROGRESS'
                    }
                });
                const startTime = Date.now();
                const response = yield axios_1.default.get(task.targetUrl, {
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
                yield this.proxyManager.updateProxyHealth(proxy.id, true);
                yield this.prisma.task.update({
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
            }
            catch (error) {
                if (proxy) {
                    yield this.proxyManager.updateProxyHealth(proxy.id, false);
                }
                yield this.prisma.task.update({
                    where: { id: taskId },
                    data: {
                        status: 'FAILED',
                        data: { content: null }
                    }
                });
                if (task.retryCount < constants_1.RATE_LIMITS.MAX_RETRIES) {
                    yield this.redis.pushTask(taskId, task.retryCount + 1);
                }
                throw error;
            }
        });
    }
}
exports.TaskDistributionService = TaskDistributionService;
