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
exports.RateLimiter = void 0;
const constants_1 = require("../config/constants");
class RateLimiter {
    constructor(redis) {
        this.redis = redis;
    }
    canMakeRequest(proxyIPId) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield this.redis.incrementRequestCount(proxyIPId);
            return count <= constants_1.RATE_LIMITS.REQUESTS_PER_MINUTE;
        });
    }
}
exports.RateLimiter = RateLimiter;
