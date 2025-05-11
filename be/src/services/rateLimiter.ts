import { RedisService } from './redis';
import { RATE_LIMITS } from '../config/constants';

export class RateLimiter {
  private redis: RedisService;

  constructor(redis: RedisService) {
    this.redis = redis;
  }

  async canMakeRequest(proxyIPId: string): Promise<boolean> {
    const count = await this.redis.incrementRequestCount(proxyIPId);
    return count <= RATE_LIMITS.REQUESTS_PER_MINUTE;
  }
}