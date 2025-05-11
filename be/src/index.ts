import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/taskRoutes';
import userRoutes from './routes/userRoutes';
import { clerkMiddleware } from '@clerk/express';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});