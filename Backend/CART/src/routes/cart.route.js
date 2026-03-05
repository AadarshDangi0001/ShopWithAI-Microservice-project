
import express from 'express';
import createAuthMiddleware from '../middlewares/auth.middleware';
import { addItemToCart, getCart } from '../controllers/cart.controller';
import { validateAddItemToCart, validateUpdateItemQuantity } from '../middlewares/validation.middleware';




const router = express.Router();



router.get(
    '/', 
    createAuthMiddleware(['user']),
    getCart
 );
router.post(
    '/items',
    validateAddItemToCart, 
    createAuthMiddleware(["user"]), 
    addItemToCart
);
router.patch(
    '/items/:productId', 
    validateUpdateItemQuantity,
    createAuthMiddleware(["user"]),
     updateItemQuanity

 );
router.delete(
    '/items/:productId', 
    createAuthMiddleware(), 
);
router.delete(
    '/', 
    createAuthMiddleware(), 
);



export default router;