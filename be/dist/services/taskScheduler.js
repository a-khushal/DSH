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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskScheduler = void 0;
const rateLimiter_1 = require("./rateLimiter");
const constants_1 = require("../config/constants");
class TaskScheduler {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.rateLimiter = new rateLimiter_1.RateLimiter(redis);
    }
    getNextTask() {
        return __awaiter(this, void 0, void 0, function* () {
            const taskId = yield this.redis.getNextTask();
            if (!taskId)
                return null;
            return this.prisma.task.findUnique({
                where: { id: taskId }
            });
        });
    }
    assignTask(taskId, proxyIPId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lockKey = `task:${taskId}:lock`;
            const hasLock = yield this.redis.acquireLock(lockKey, constants_1.RATE_LIMITS.PROXY_TIMEOUT);
            if (!hasLock) {
                throw new Error('Task is already being assigned');
            }
            try {
                const task = yield this.prisma.task.update({
                    where: { id: taskId },
                    data: {
                        status: 'IN_PROGRESS',
                        proxyIPId
                    }
                });
                yield this.redis.removeTask('task_queue', taskId);
                return task;
            }
            finally {
                yield this.redis.releaseLock(lockKey);
            }
        });
    }
    checkProxyAvailability(proxyId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.rateLimiter.canMakeRequest(proxyId);
        });
    }
}
exports.TaskScheduler = TaskScheduler;
