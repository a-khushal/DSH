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
// src/routes/taskRoutes.ts
const express_1 = __importDefault(require("express"));
const express_2 = require("@clerk/express");
const taskDistribution_1 = require("../services/taskDistribution");
const prisma_1 = require("../../prisma/generated/prisma");
const redis_1 = require("../services/redis");
const router = express_1.default.Router();
const prisma = new prisma_1.PrismaClient();
const redis = new redis_1.RedisService();
const taskDistribution = new taskDistribution_1.TaskDistributionService(prisma, redis);
router.post('/proxy', (0, express_2.requireAuth)({ signInUrl: '/sign-in' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ipAddress } = req.body;
        // @ts-ignore
        const userId = req.auth.userId;
        if (!ipAddress) {
            res.status(400).json({ error: 'IP address is required' });
            return;
        }
        const proxy = yield prisma.proxyIP.create({
            data: {
                ipAddress,
                userId,
                isActive: true,
                lastVerified: new Date()
            }
        });
        res.status(201).json(proxy);
    }
    catch (error) {
        console.error('Error registering proxy:', error);
        res.status(500).json({ error: 'Failed to register proxy' });
    }
}));
router.post('/admin/tasks', (0, express_2.requireAuth)({ signInUrl: '/sign-in' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetUrl, priority } = req.body;
        // @ts-ignore
        const userId = req.auth.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId }
        });
        if (!(user === null || user === void 0 ? void 0 : user.isAdmin)) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        const task = yield taskDistribution.createTask(targetUrl, userId, priority || 'NORMAL');
        const result = yield taskDistribution.executeScraping(task.id);
        if (result.bandwidthUsed) {
            yield prisma.bandwidthUsage.create({
                data: {
                    userId: result.proxyUserId,
                    bandwidth: result.bandwidthUsed
                }
            });
        }
        res.status(201).json({
            task,
            result
        });
    }
    catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
}));
router.get('/admin/tasks', (0, express_2.requireAuth)({ signInUrl: '/sign-in' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.auth.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId }
        });
        if (!(user === null || user === void 0 ? void 0 : user.isAdmin)) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }
        const tasks = yield prisma.task.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                proxyIP: true,
                assignedTo: true
            }
        });
        res.json(tasks);
    }
    catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
}));
router.get('/earnings', (0, express_2.requireAuth)({ signInUrl: '/sign-in' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.auth.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            include: {
                bandwidthUsages: {
                    orderBy: { timestamp: 'desc' },
                    take: 10
                }
            }
        });
        res.json({
            totalBandwidth: (user === null || user === void 0 ? void 0 : user.totalBandwidth) || 0,
            recentUsage: (user === null || user === void 0 ? void 0 : user.bandwidthUsages) || []
        });
    }
    catch (error) {
        console.error('Error getting earnings:', error);
        res.status(500).json({ error: 'Failed to get earnings' });
    }
}));
exports.default = router;
