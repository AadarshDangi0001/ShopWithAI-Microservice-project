import express from "express";
import createAuthMiddleware from "../middlewares/auth.middleware.js";
import { cancelOrder, createOrder, getMyOrders, getOrderById, updateShippingAddress } from "../controllers/order.controller.js";
import { createOrderValidator, updateAddressValidator } from "../middlewares/validation.middleware.js";


const router = express.Router();



router.post("/", createAuthMiddleware(["user"]),createOrderValidator, createOrder )
router.get("/me", createAuthMiddleware(["user"]), getMyOrders);
router.post("/:id/cancel", createAuthMiddleware(["user"]), cancelOrder);
router.patch("/:id/address", createAuthMiddleware(["user"]),updateAddressValidator, updateShippingAddress);
router.get("/:id", createAuthMiddleware(["user"]), getOrderById);

export default router;