import orderModel from "../models/order.model.js";
import axios from "axios";

export const createOrder = async (req, res) => {
    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
    const userId = user?._id || user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const cartServiceUrl = process.env.CART_SERVICE_URL || "http://localhost:3002";

        // CART service identifies user from token and returns { message, cart, totals }.
        const cartResponse = await axios.get(`${cartServiceUrl}/api/cart`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const cartPayload = cartResponse.data;
        const cart = cartPayload?.cart || cartPayload;
        const cartItems = cart?.items || cart?.item || [];

        console.log("Cart data received from cart service:", cart);

        if (!cart || cartItems.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        return res.status(200).json({
            message: "Cart validated for order creation",
            userId,
            itemsCount: cartItems.length,
        });

    } catch (error) {
        console.error("Error creating order:", error);

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status === 401) {
                return res.status(401).json({ error: "Authentication required" });
            }

            if (status === 404) {
                return res.status(404).json({ error: "Cart service route not found" });
            }
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}