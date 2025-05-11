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
exports.ProxyManager = void 0;
class ProxyManager {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    getAvailableProxy() {
        return __awaiter(this, void 0, void 0, function* () {
            const proxies = yield this.prisma.proxyIP.findMany({
                where: { isActive: true }
            });
            for (const proxy of proxies) {
                const isHealthy = yield this.redis.getProxyHealth(proxy.id);
                if (isHealthy) {
                    return proxy;
                }
            }
            return null;
        });
    }
    updateProxyHealth(proxyId, isHealthy) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.redis.setProxyHealth(proxyId, isHealthy);
            yield this.prisma.proxyIP.update({
                where: { id: proxyId },
                data: {
                    isActive: isHealthy,
                    lastVerified: new Date()
                }
            });
        });
    }
}
exports.ProxyManager = ProxyManager;
