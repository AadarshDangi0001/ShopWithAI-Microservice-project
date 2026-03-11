import express from 'express';
import createAuthMiddleware from '../middlewares/auth.middleware.js';
import { getMetrics, getOrders, getProducts } from "../controllers/seller.controllers.js";

const router = express.Router();

router.get("/metrics", createAuthMiddleware(["seller"]), getMetrics);

router.get("/orders", createAuthMiddleware(["seller"]), getOrders);

router.get("/products", createAuthMiddleware(["seller"]), getProducts);

export default router;