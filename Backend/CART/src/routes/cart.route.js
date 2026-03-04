
import express from 'express';
import createAuthMiddleware from '../middlewares/auth.middleware';
import { addItemToCart } from '../controllers/cart.controller';
import { validateAddItemToCart } from '../middlewares/validation.middleware';



const router = express.Router();


router.post('/items',
    validateAddItemToCart, 
    createAuthMiddleware(["user"]), 
    addItemToCart
);
router.patch('/items/:productId', createAuthMiddleware(), );
router.delete('/items/:productId', createAuthMiddleware(), );
router.get('/', createAuthMiddleware(), );
router.delete('/', createAuthMiddleware(), );



export default router;