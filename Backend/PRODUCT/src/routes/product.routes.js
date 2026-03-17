import express from 'express';
import upload from '../middlewares/upload.middleware.js';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductsBySeller } from '../controllers/product.controller.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
import { createProductValidator } from '../middlewares/validator.middleware.js';

const router = express.Router();


router.post(
    '/',
    createAuthMiddleware(['admin', 'seller']),
    upload.array('images', 5),
    createProductValidator,
    createProduct,
);

router.get('/', getProducts);
router.get('/seller', createAuthMiddleware(['seller']), getProductsBySeller);
router.get('/:id', getProductById);

router.patch('/:id', createAuthMiddleware(['seller']), upload.none(), updateProduct);
router.delete('/:id', createAuthMiddleware(['seller']), deleteProduct);


export default router;