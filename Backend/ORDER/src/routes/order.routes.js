import express from "express";
import createAuthMiddleware from "../middlewares/auth.middleware.js";
import { createOrder } from "../controllers/order.controller.js";
import { createOrderValidator } from "../middlewares/validation.middleware.js";


const router = express.Router();



router.post("/", createAuthMiddleware(["user"]),createOrderValidator, createOrder )



export default router;