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
exports.RedisService = void 0;
require('dotenv').config();
const ioredis_1 = __importDefault(require("ioredis"));
class RedisService {
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    incrementRequestCount(proxyIPId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `rate:${proxyIPId}`;
            const count = yield this.redis.incr(key);
            yield this.redis.expire(key, 60);
            return count;
        });
    }
    pushTask(taskId, priority) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.redis.zadd('task_queue', priority, taskId);
        });
    }
    removeTask(key, member) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.redis.zrem(key, member);
        });
    }
    getNextTask() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.redis.zrange('task_queue', 0, 0);
            return result[0] || null;
        });
    }
    setProxyHealth(proxyId, isHealthy) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.redis.hset('proxy_health', proxyId, isHealthy ? '1' : '0');
        });
    }
    getProxyHealth(proxyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const health = yield this.redis.hget('proxy_health', proxyId);
            return health === '1';
        });
    }
    acquireLock(key, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.redis.set(key, '1', 'EX', ttl, 'NX');
            return result === 'OK';
        });
    }
    releaseLock(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.redis.del(key);
        });
    }
}
exports.RedisService = RedisService;
