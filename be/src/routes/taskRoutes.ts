import express from 'express';
import { requireAuth } from '@clerk/express';
import { TaskDistributionService } from '../services/taskDistribution';
import { PrismaClient } from '../../prisma/generated/prisma';
import { RedisService } from '../services/redis';

const router = express.Router();
const prisma = new PrismaClient();
const redis = new RedisService();
const taskDistribution = new TaskDistributionService(prisma, redis);

router.post('/proxy', requireAuth({ signInUrl: '/sign-in' }), async (req, res) => {
    try {
        const { ipAddress } = req.body;
        // @ts-ignore
        const userId = req.auth.userId;

        if (!ipAddress) {
            res.status(400).json({ error: 'IP address is required' });
            return;
        }

        const proxy = await prisma.proxyIP.create({
            data: {
                ipAddress,
                userId,
                isActive: true,
                lastVerified: new Date()
            }
        });

        res.status(201).json(proxy);
    } catch (error) {
        console.error('Error registering proxy:', error);
        res.status(500).json({ error: 'Failed to register proxy' });
    }
});

router.post('/admin/tasks', requireAuth({ signInUrl: '/sign-in' }), async (req, res) => {
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

router.get('/admin/tasks', requireAuth({ signInUrl: '/sign-in' }), async (req, res) => {
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

router.get('/earnings', requireAuth({ signInUrl: '/sign-in' }), async (req, res) => {
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