import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';


const app = express();
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);

export default app;