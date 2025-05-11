import { PrismaClient, ProxyIP } from "../../prisma/generated/prisma";
import { RedisService } from "./redis";

export class ProxyManager {
    private prisma: PrismaClient;
    private redis: RedisService;

    constructor(prisma: PrismaClient, redis: RedisService) {
        this.prisma = prisma;
        this.redis = redis;
    }

    async getAvailableProxy(): Promise<ProxyIP | null> {
        const proxies = await this.prisma.proxyIP.findMany({
            where: { isActive: true }
        });

        for (const proxy of proxies) {
            const isHealthy = await this.redis.getProxyHealth(proxy.id);
            if (isHealthy) {
                return proxy;
            }
        }

        return null;
    }

    async updateProxyHealth(proxyId: string, isHealthy: boolean) {
        await this.redis.setProxyHealth(proxyId, isHealthy);
        await this.prisma.proxyIP.update({
            where: { id: proxyId },
            data: {
                isActive: isHealthy,
                lastVerified: new Date()
            }
        });
    }
}