import express from 'express';
import upload from '../middlewares/upload.middleware.js';
import { createProduct, getProducts } from '../controllers/product.controller.js';
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

export default router;