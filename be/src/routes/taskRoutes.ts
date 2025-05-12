import express from 'express';
import { TaskDistributionService } from '../services/taskDistribution';
import { PrismaClient } from '../../prisma/generated/prisma';
import { RedisService } from '../services/redis';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const redis = new RedisService();
const taskDistribution = new TaskDistributionService(prisma, redis);

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const token = req.headers.authorization;
        
        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid user' });
            return;
        }

        // @ts-ignore
        req.auth = { userId: decoded.userId };
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Authentication failed' });
    }
};

router.post('/proxy', requireAuth, async (req, res) => {
    try {
        const { ipAddress } = req.body;
        // @ts-ignore
        const userId = req.auth.userId;

        if (!ipAddress) {
            res.status(400).json({ error: 'IP address is required' });
            return;
        }

        const existingProxy = await prisma.proxyIP.findFirst({
            where: {
                ipAddress,
                userId
            }
        });

        if (existingProxy) {
            const proxy = await prisma.proxyIP.update({
                where: { id: existingProxy.id },
                data: {
                    isActive: true,
                    lastVerified: new Date()
                }
            });
            res.status(200).json(proxy);
        } else {
            const proxy = await prisma.proxyIP.create({
                data: {
                    ipAddress,
                    userId,
                    isActive: true,
                    lastVerified: new Date()
                }
            });
            res.status(201).json(proxy);
        }
    } catch (error) {
        console.error('Error registering proxy:', error);
        res.status(500).json({ error: 'Failed to register proxy' });
    }
});

router.post('/admin/tasks', requireAuth, async (req, res) => {
    try {
        const { targetUrl, priority } = req.body;
        // @ts-ignore
        const userId = req.auth.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user?.isAdmin) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        const task = await taskDistribution.createTask(
            targetUrl,
            userId,
            priority || 'NORMAL'
        );

        const result = await taskDistribution.executeScraping(task.id);
        
        if (result.bandwidthUsed) {
            await prisma.bandwidthUsage.create({
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
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

router.get('/admin/tasks', requireAuth, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.auth.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user?.isAdmin) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        const tasks = await prisma.task.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                proxyIP: true,
                assignedTo: true
            }
        });

        res.json(tasks);
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

router.get('/earnings', requireAuth, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.auth.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                bandwidthUsages: {
                    orderBy: { timestamp: 'desc' },
                    take: 10
                }
            }
        });

        res.json({
            totalBandwidth: user?.totalBandwidth || 0,
            recentUsage: user?.bandwidthUsages || []
        });
    } catch (error) {
        console.error('Error getting earnings:', error);
        res.status(500).json({ error: 'Failed to get earnings' });
    }
});

export default router;