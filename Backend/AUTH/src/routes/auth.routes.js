import express from 'express';
import { registerUserValidator, loginUserValidator } from '../middlewares/validator.middleware.js';
import { registerUser, loginUser, getCurrentUser } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUserValidator , registerUser);

router.post('/login', loginUserValidator, loginUser);

router.get('/me', authenticateToken , getCurrentUser);


export default router;
