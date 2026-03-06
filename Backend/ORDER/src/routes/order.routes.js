import express from "express";
import createAuthMiddleware from "../middlewares/auth.middleware.js";
import { createOrder } from "../controllers/order.controller.js";


const router = express.Router();



router.post("/", createAuthMiddleware(["user"]), createOrder )



export default router;