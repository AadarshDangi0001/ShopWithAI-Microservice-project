import express from 'express';
import upload from '../middlewares/upload.middleware.js';
import { createProduct, listProducts } from '../controllers/product.controller.js';

const router = express.Router();

router.get('/', listProducts);
router.post('/', upload.array('images', 5), createProduct);

export default router;