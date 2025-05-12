import express from 'express';
import { PrismaClient } from '../../prisma/generated/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword
            }
        });

        const token = jwt.sign(
            { userId: user.id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            token
        });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { userId: user.id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await prisma.user.update({
            where: { id: user.id },
            data: { lastActive: new Date() }
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            token
        });
    } catch (error) {
        console.error('Error in signin:', error);
        res.status(500).json({ error: 'Failed to sign in' });
    }
});

// router.post('/signout', async (req, res) => {
//     try {
//         const token = req.headers.authorization?.split(' ')[1];

//         res.status(200).json({ message: 'Signed out successfully' });
//     } catch (error) {
//         console.error('Error in signout:', error);
//         res.status(500).json({ error: 'Failed to sign out' });
//     }
// });

export default router;