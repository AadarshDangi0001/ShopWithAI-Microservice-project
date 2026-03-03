import express from 'express';
import { registerUserValidator, loginUserValidator } from '../middlewares/validator.middleware.js';
import { registerUser, loginUser, getCurrentUser, logoutUser } from '../controllers/auth.controller.js';
import { getUserAddresses, addUserAddress, deleteUserAddress } from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUserValidator , registerUser);

router.post('/login', loginUserValidator, loginUser);

router.get('/me', authenticateToken , getCurrentUser);

router.post('/logout', authenticateToken, logoutUser);

router.get('/users/me/addresses', authenticateToken, getUserAddresses);
router.post('/users/me/addresses', authenticateToken, addUserAddress);
router.delete('/users/me/addresses/:addressId', authenticateToken, deleteUserAddress);




export default router;
