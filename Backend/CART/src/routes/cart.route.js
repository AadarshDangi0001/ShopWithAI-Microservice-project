
import express from 'express';
import createAuthMiddleware from '../middlewares/auth.middleware.js';
import { addItemToCart, clearCart, deleteItemFromCart, getCart, updateItemQuanity } from '../controllers/cart.controller.js';
import { validateAddItemToCart, validateUpdateItemQuantity } from '../middlewares/validation.middleware.js';




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
    createAuthMiddleware(['user']), 
    deleteItemFromCart
);
router.delete(
    '/', 
    createAuthMiddleware(['user']), 
    clearCart
);



export default router;