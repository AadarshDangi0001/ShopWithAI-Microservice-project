import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { addUserAddress, deleteUserAddress, getUserAddresses } from '../controllers/user.controller';
import { addUserAddressValidator } from '../middlewares/validator.middleware';


const router = express.Router();

router.get('/me/addresses', authenticateToken, getUserAddresses);
router.post('/me/addresses',addUserAddressValidator, authenticateToken, addUserAddress);
router.delete('/me/addresses/:addressId', authenticateToken, deleteUserAddress);


export default router;