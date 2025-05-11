export const RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 60,
    MAX_RETRIES: 3,
    HEALTH_CHECK_INTERVAL: 5 * 60 * 1000,
    PROXY_TIMEOUT: 30 * 1000,
};

export const TASK_PRIORITIES = {
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
};