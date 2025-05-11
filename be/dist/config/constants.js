"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_PRIORITIES = exports.RATE_LIMITS = void 0;
exports.RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 60,
    MAX_RETRIES: 3,
    HEALTH_CHECK_INTERVAL: 5 * 60 * 1000,
    PROXY_TIMEOUT: 30 * 1000,
};
exports.TASK_PRIORITIES = {
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
};
